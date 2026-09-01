from __future__ import annotations
import json,sys,time
from pathlib import Path
import joblib,numpy as np,pandas as pd,sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import SGDClassifier
ROOT=Path(__file__).resolve().parent.parent; sys.path.insert(0,str(ROOT))
from src import taxonomy as TX
DATA=ROOT/'data'; MODELS=ROOT/'models'; DOCS=ROOT/'docs'
RNG=20260829; HUMAN_WEIGHT=75.0; N_SAMPLE=12000

def main():
 t=time.time(); weak=pd.read_csv(DATA/'weak_training_set.csv').fillna(''); human=pd.read_csv(DATA/'human_seed.csv'); ht=human[human.split=='train'].reset_index(drop=True)
 # stratify on pseudo action so every action class gets coverage; add a random component for unlabeled rows
 rng=np.random.default_rng(RNG); labeled=weak[weak.weak_action!='']; unlabeled=weak[weak.weak_action=='']
 # roughly 90% labeled / 10% unlabeled, proportional across action classes
 target_lab=min(len(labeled),int(N_SAMPLE*0.90)); parts=[]
 for lab,g in labeled.groupby('weak_action'):
  n=max(25,int(round(target_lab*len(g)/len(labeled))))
  n=min(n,len(g)); parts.append(g.sample(n=n,random_state=RNG+hash(lab)%10000))
 samp=pd.concat(parts,ignore_index=True)
 if len(samp)>target_lab: samp=samp.sample(target_lab,random_state=RNG)
 if len(samp)<N_SAMPLE: samp=pd.concat([samp,unlabeled.sample(min(N_SAMPLE-len(samp),len(unlabeled)),random_state=RNG)],ignore_index=True)
 weak=samp.sample(frac=1,random_state=RNG).reset_index(drop=True)
 corpus=pd.concat([pd.DataFrame({'text':weak.text.astype(str),'action':weak.weak_action.astype(str),'object':weak.weak_object.astype(str),'controls':weak.weak_controls.astype(str),'sif_label':np.where(weak.weak_sif_class=='SIF_POTENTIAL',1,np.where(weak.weak_sif_class=='NON_SIF_POTENTIAL',0,-1)),'weight':1.0}),pd.DataFrame({'text':ht.text_prepared.astype(str),'action':ht.human_action.astype(str),'object':ht.human_object.astype(str),'controls':ht.human_control_deficiency.astype(str).replace('none',''),'sif_label':ht.human_sif_label.astype(int),'weight':HUMAN_WEIGHT})],ignore_index=True)
 vec=FeatureUnion([('word',TfidfVectorizer(ngram_range=(1,2),min_df=2,max_features=10000,sublinear_tf=True,strip_accents='unicode')),('char',TfidfVectorizer(analyzer='char_wb',ngram_range=(3,5),min_df=3,max_features=10000,sublinear_tf=True,strip_accents='unicode'))])
 X=vec.fit_transform(corpus.text); w=corpus.weight.to_numpy(float); rep={'trained_at':time.strftime('%Y-%m-%dT%H:%M:%S'),'sklearn_version':sklearn.__version__,'python_version':sys.version.split()[0],'source_rows':int(len(pd.read_csv(DATA/'weak_training_set.csv'))),'sampled_weak_rows':int(len(weak)),'human_train_rows':int(len(ht)),'feature_matrix':list(X.shape),'architecture':'45k stratified weak sample + all human train; TFIDF word1-2 + char3-5; SGD logloss; human_weight=75'}
 am=corpus.action.isin(TX.ACTIONS)&corpus.action.ne('')&corpus.action.ne(TX.UNKNOWN); om=corpus.object.isin(TX.OBJECTS)&corpus.object.ne('')&corpus.object.ne(TX.UNKNOWN)
 def fit(Xm,y,ww):
  m=SGDClassifier(loss='log_loss',alpha=4e-6,class_weight='balanced',max_iter=150,tol=1e-2,average=True,random_state=RNG); m.fit(Xm,y,sample_weight=ww); return m
 action=fit(X[am.to_numpy()],corpus.loc[am,'action'].to_numpy(),w[am.to_numpy()]); obj=fit(X[om.to_numpy()],corpus.loc[om,'object'].to_numpy(),w[om.to_numpy()])
 rep['action']={'training_rows':int(am.sum()),'classes':sorted(map(str,action.classes_))}; rep['object']={'training_rows':int(om.sum()),'classes':sorted(map(str,obj.classes_))}
 # Controls remain evidence-gated; train only well-supported candidates to avoid noisy rare-class overfit.
 controls={}; cm={}; ex=corpus.controls.str.split('|')
 for lab in TX.CONTROL_DEFICIENCIES:
  if lab=='none': continue
  y=ex.map(lambda p,l=lab:int(l in p)).to_numpy(); pos=np.flatnonzero(y==1)
  if len(pos)<5: continue
  neg=np.flatnonzero(y==0); nneg=min(len(neg),max(4*len(pos),1000)); sel=np.r_[pos,rng.choice(neg,nneg,replace=False)]
  m=SGDClassifier(loss='log_loss',alpha=4e-6,class_weight='balanced',max_iter=150,tol=1e-2,average=True,random_state=RNG); m.fit(X[sel],y[sel],sample_weight=w[sel]); controls[lab]=m; cm[lab]={'positives':int(len(pos)),'sample_rows':int(len(sel))}
 rep['controls']=cm
 # SIF prior: use the original, less-degenerate weak SIF labels + all human rows.
 import os
 oldp=Path('/mnt/data/old_weak.csv')
 old=pd.read_csv(oldp).fillna('') if oldp.exists() else pd.DataFrame()
 if len(old):
  old_s=old[old.weak_sif_class.isin(['SIF_POTENTIAL','NON_SIF_POTENTIAL'])].copy()
  s_text=old_s.text.astype(str).tolist()+ht.text_prepared.astype(str).tolist()
  s_y=np.r_[np.where(old_s.weak_sif_class.eq('SIF_POTENTIAL'),1,0).astype(int),ht.human_sif_label.astype(int).to_numpy()]
  s_w=np.r_[np.ones(len(old_s)),np.full(len(ht),HUMAN_WEIGHT)]
  SX=vec.transform(s_text)
  sif=fit(SX,s_y,s_w) if len(np.unique(s_y))==2 else None
  rep['sif']={'training_rows':int(len(s_y)),'positive_rate':round(float(s_y.mean()),4),'source':'original weak SIF labels + human train'}
 else: sif=None; rep['sif']={'note':'old weak SIF source unavailable'}
 bundle={'vectorizer':vec,'action':action,'object':obj,'controls':controls,'sif':sif,'sklearn_version':sklearn.__version__,'meta':rep}
 joblib.dump(bundle,MODELS/'layer2_bundle.joblib',compress=3); (MODELS/'bundle_meta.json').write_text(json.dumps(rep,indent=2)); (DOCS/'training_report.json').write_text(json.dumps(rep,indent=2)); (DATA/'meeting_training_sample.csv').write_text(weak.to_csv(index=False),encoding='utf8')
 print(json.dumps(rep,indent=2)); print('elapsed',round(time.time()-t,1))
if __name__=='__main__': main()
