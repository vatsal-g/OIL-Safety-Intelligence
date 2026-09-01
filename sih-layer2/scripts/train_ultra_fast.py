from __future__ import annotations
import json,sys,time
from pathlib import Path
import joblib,numpy as np,pandas as pd,sklearn
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import SGDClassifier
ROOT=Path(__file__).resolve().parent.parent; sys.path.insert(0,str(ROOT))
from src import taxonomy as TX
DATA=ROOT/'data'; MODELS=ROOT/'models'; DOCS=ROOT/'docs'
RNG=20260829; N_WEAK=14000; HUMAN_WEIGHT=120.0

def vec():
 return FeatureUnion([
 ('word',HashingVectorizer(analyzer='word',ngram_range=(1,2),n_features=2**15,alternate_sign=False,lowercase=True,strip_accents='unicode',norm='l2')),
 ('char',HashingVectorizer(analyzer='char_wb',ngram_range=(3,5),n_features=2**15,alternate_sign=False,lowercase=True,strip_accents='unicode',norm='l2'))])

def main():
 t=time.time(); weak=pd.read_csv(DATA/'weak_training_set.csv',low_memory=False).fillna('')
 rich_path=Path('/mnt/data/OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL(1).csv')
 rich_extra=pd.DataFrame()
 if rich_path.exists():
  r=pd.read_csv(rich_path,low_memory=False).fillna('')
  cols=[c for c in ['Abstract Text','Event Description','Event Keywords'] if c in r]
  r['text']=r[cols].astype(str).agg(' '.join,axis=1)
  r=r[['summary_nr','text']].merge(weak[['summary_nr','weak_action','weak_object','weak_controls','weak_sif_class']],on='summary_nr',how='left')
  r['text']=r.text.str.replace(r'\s+',' ',regex=True).str.strip(); r=r[r.text.str.len()>40]
  rich_extra=r.rename(columns={'weak_action':'action','weak_object':'object','weak_controls':'controls','weak_sif_class':'sif_class'})
 labeled=weak[weak.weak_action!='']; unlabeled=weak[weak.weak_action=='']
 rng=np.random.default_rng(RNG); parts=[]; target=min(N_WEAK,len(labeled))
 for lab,g in labeled.groupby('weak_action'):
  n=max(40,int(round(target*len(g)/len(labeled)))); n=min(n,len(g)); parts.append(g.sample(n=n,random_state=RNG+abs(hash(str(lab)))%10000))
 samp=pd.concat(parts,ignore_index=True)
 if len(samp)>target: samp=samp.sample(target,random_state=RNG)
 if len(samp)<N_WEAK and len(unlabeled): samp=pd.concat([samp,unlabeled.sample(min(N_WEAK-len(samp),len(unlabeled)),random_state=RNG)],ignore_index=True)
 samp=samp[['summary_nr','text','weak_action','weak_object','weak_controls','weak_sif_class']].rename(columns={'weak_action':'action','weak_object':'object','weak_controls':'controls','weak_sif_class':'sif_class'})
 samp['source']='weak'
 if len(rich_extra):
  # Rich views are supplemental text, not duplicate incident labels.
  rich_extra=rich_extra.sample(frac=1,random_state=RNG).reset_index(drop=True)
  rich_extra['source']='rich_hse'
  # Add all rich views, giving the model additional title/keyword phrasing.
  samp=pd.concat([samp,rich_extra[['summary_nr','text','action','object','controls','sif_class','source']]],ignore_index=True)
 human=pd.read_csv(DATA/'human_seed.csv',low_memory=False).fillna(''); ht=human[human.split=='train'].copy(); ht=ht[['ID','text_prepared','human_action','human_object','human_control_deficiency','human_sif_label']]
 ht=ht.rename(columns={'ID':'summary_nr','text_prepared':'text','human_action':'action','human_object':'object','human_control_deficiency':'controls'}); ht['controls']=ht.controls.replace('none',''); ht['sif_class']=np.where(ht.human_sif_label.astype(int)==1,'SIF_POTENTIAL','NON_SIF_POTENTIAL'); ht['source']='human'; ht=ht.drop(columns=['human_sif_label'])
 corpus=pd.concat([samp,ht],ignore_index=True).fillna(''); corpus['text']=corpus.text.astype(str); corpus=corpus[corpus.text.str.len()>20].reset_index(drop=True)
 v=vec(); X=v.fit_transform(corpus.text); w=np.where(corpus.source.eq('human').to_numpy(),HUMAN_WEIGHT,1.0)
 def fit_multi(col):
  allowed=[x for x in (TX.ACTIONS if col=='action' else TX.OBJECTS) if x!=TX.UNKNOWN]
  msk=corpus[col].isin(allowed).to_numpy(); m=SGDClassifier(loss='log_loss',alpha=8e-6,class_weight='balanced',max_iter=250,tol=3e-3,random_state=RNG,average=True); m.fit(X[msk],corpus.loc[msk,col].astype(str),sample_weight=w[msk]); return m,int(msk.sum()),allowed
 action,an,ac=fit_multi('action'); obj,on,oc=fit_multi('object')
 controls={}; cm={}; ex=corpus.controls.astype(str).str.split('|')
 for lab in TX.CONTROL_DEFICIENCIES:
  if lab=='none': continue
  y=ex.map(lambda p,l=lab:int(l in p)).to_numpy(); pos=np.flatnonzero(y==1)
  if len(pos)<5: continue
  neg=np.flatnonzero(y==0); nneg=min(len(neg),max(4*len(pos),1500)); sel=np.r_[pos,rng.choice(neg,nneg,replace=False)]
  m=SGDClassifier(loss='log_loss',alpha=1e-5,class_weight='balanced',max_iter=180,tol=5e-3,random_state=RNG,average=True); m.fit(X[sel],y[sel],sample_weight=w[sel]); controls[lab]=m; cm[lab]={'positives':int(len(pos)),'sample_rows':int(len(sel))}
 # SIF: use balanced sample from corpus's established weak labels + human.
 sm=corpus.sif_class.isin(['SIF_POTENTIAL','NON_SIF_POTENTIAL']).to_numpy(); pos=np.flatnonzero(sm & corpus.sif_class.eq('SIF_POTENTIAL').to_numpy()); neg=np.flatnonzero(sm & corpus.sif_class.eq('NON_SIF_POTENTIAL').to_numpy()); n=min(len(pos),12000); pos=pos if len(pos)<=n else rng.choice(pos,n,replace=False); neg=neg if len(neg)<=n else rng.choice(neg,n,replace=False); sel=np.r_[pos,neg]; sy=corpus.loc[sel,'sif_class'].eq('SIF_POTENTIAL').astype(int).to_numpy(); smod=SGDClassifier(loss='log_loss',alpha=8e-6,class_weight='balanced',max_iter=220,tol=3e-3,random_state=RNG,average=True); smod.fit(X[sel],sy,sample_weight=w[sel])
 meta={'trained_at':time.strftime('%Y-%m-%dT%H:%M:%S'),'base_weak_rows':len(weak),'weak_sample_rows':len(samp[samp.source=='weak']),'rich_hse_rows':int(len(rich_extra)),'human_train_rows':len(ht),'corpus_rows':len(corpus),'feature_matrix':list(X.shape),'architecture':'14k stratified base + 4,847 rich HSE text views + 35 human train; word+char hashing; SGD logloss; human_weight=120','action':{'training_rows':an,'classes':ac},'object':{'training_rows':on,'classes':oc},'controls':cm,'sif':{'training_rows':int(len(sel)),'positive_rate':round(float(sy.mean()),4)}}
 bundle={'vectorizer':v,'action':action,'object':obj,'controls':controls,'sif':smod,'sklearn_version':sklearn.__version__,'meta':meta}
 joblib.dump(bundle,MODELS/'layer2_bundle.joblib',compress=3); (MODELS/'bundle_meta.json').write_text(json.dumps(meta,indent=2)); (DOCS/'training_report.json').write_text(json.dumps(meta,indent=2)); print(json.dumps(meta,indent=2)); print('elapsed',round(time.time()-t,1))
if __name__=='__main__': main()
