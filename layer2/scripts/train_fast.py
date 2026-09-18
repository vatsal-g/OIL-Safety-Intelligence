from __future__ import annotations
import json, sys, time, os
from pathlib import Path
import joblib, numpy as np, pandas as pd, sklearn
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import SGDClassifier

ROOT=Path(__file__).resolve().parent.parent; sys.path.insert(0,str(ROOT))
from src import taxonomy as TX
DATA=ROOT/'data'; MODELS=ROOT/'models'; DOCS=ROOT/'docs'
WEAK=DATA/'weak_training_set.csv'; HUMAN=DATA/'human_seed.csv'
RANDOM_STATE=20260829; HUMAN_WEIGHT=100.0

def build_vectorizer():
    return FeatureUnion([
      ('word',HashingVectorizer(analyzer='word',ngram_range=(1,2),n_features=2**15,alternate_sign=False,lowercase=True,strip_accents='unicode',norm='l2')),
      ('char',HashingVectorizer(analyzer='char_wb',ngram_range=(3,5),n_features=2**15,alternate_sign=False,lowercase=True,strip_accents='unicode',norm='l2')),
    ])

def fit_multi(X,y,w):
    model=SGDClassifier(loss='log_loss',alpha=2e-5,class_weight='balanced',max_iter=300,tol=5e-3,random_state=RANDOM_STATE,average=True)
    model.fit(X,y,sample_weight=w); return model

def main():
    t0=time.time(); weak=pd.read_csv(WEAK).fillna(''); human=pd.read_csv(HUMAN); ht=human[human.split=='train'].reset_index(drop=True)
    corpus=pd.concat([pd.DataFrame({'text':weak.text.astype(str),'action':weak.weak_action.astype(str),'object':weak.weak_object.astype(str),'controls':weak.weak_controls.astype(str),'sif_label':np.where(weak.weak_sif_class=='SIF_POTENTIAL',1,np.where(weak.weak_sif_class=='NON_SIF_POTENTIAL',0,-1)),'weight':1.0}),pd.DataFrame({'text':ht.text_prepared.astype(str),'action':ht.human_action.astype(str),'object':ht.human_object.astype(str),'controls':ht.human_control_deficiency.astype(str).replace('none',''),'sif_label':ht.human_sif_label.astype(int),'weight':HUMAN_WEIGHT})],ignore_index=True)
    vec=build_vectorizer(); X=vec.transform(corpus.text.tolist())
    w=corpus.weight.to_numpy(float); report={'trained_at':time.strftime('%Y-%m-%dT%H:%M:%S'),'sklearn_version':sklearn.__version__,'python_version':sys.version.split()[0],'feature_matrix':list(X.shape),'weak_rows':len(weak),'human_train_rows':len(ht),'architecture':'word+char HashingVectorizer 32k each; SGD log-loss; human_weight=100'}
    am=corpus.action.isin(TX.ACTIONS)&corpus.action.ne('')&corpus.action.ne(TX.UNKNOWN); om=corpus.object.isin(TX.OBJECTS)&corpus.object.ne('')&corpus.object.ne(TX.UNKNOWN)
    action=fit_multi(X[am.to_numpy()],corpus.loc[am,'action'].to_numpy(),w[am.to_numpy()]); obj=fit_multi(X[om.to_numpy()],corpus.loc[om,'object'].to_numpy(),w[om.to_numpy()])
    report['action']={'training_rows':int(am.sum()),'classes':sorted(map(str,action.classes_))}; report['object']={'training_rows':int(om.sum()),'classes':sorted(map(str,obj.classes_))}
    controls={}; cmeta={}
    # Train only on a bounded balanced sample for review-candidate models.
    exploded=corpus.controls.fillna('').str.split('|')
    rng=np.random.default_rng(RANDOM_STATE)
    for lab in TX.CONTROL_DEFICIENCIES:
        if lab=='none': continue
        y=exploded.map(lambda x,l=lab:int(l in x)).to_numpy()
        pos=np.flatnonzero(y==1); neg=np.flatnonzero(y==0)
        if len(pos)<3: cmeta[lab]={'skipped':int(len(pos))}; continue
        nneg=min(len(neg),max(3*len(pos),3000)); sel=np.concatenate([pos,rng.choice(neg,size=nneg,replace=False)])
        c=SGDClassifier(loss='log_loss',alpha=2e-5,class_weight='balanced',max_iter=200,tol=1e-2,random_state=RANDOM_STATE,average=True)
        c.fit(X[sel],y[sel],sample_weight=w[sel]); controls[lab]=c; cmeta[lab]={'positives':int(len(pos)),'sample_rows':int(len(sel))}
    report['controls']=cmeta
    sm=corpus.sif_label>=0
    sif=None
    if sm.sum()>100 and corpus.loc[sm,'sif_label'].nunique()>=2:
        # cap the huge silver set while retaining all human-weighted rows
        pos=np.flatnonzero((sm.to_numpy())&(corpus.sif_label.to_numpy()==1)); neg=np.flatnonzero((sm.to_numpy())&(corpus.sif_label.to_numpy()==0))
        n=min(len(pos),25000); selpos=rng.choice(pos,size=n,replace=False) if len(pos)>n else pos
        selneg=rng.choice(neg,size=min(len(neg),max(1000,n)),replace=False) if len(neg)>max(1000,n) else neg
        sel=np.concatenate([selpos,selneg])
        sif=SGDClassifier(loss='log_loss',alpha=2e-5,class_weight='balanced',max_iter=300,tol=5e-3,random_state=RANDOM_STATE,average=True)
        sif.fit(X[sel],corpus.loc[sel,'sif_label'].to_numpy(int),sample_weight=w[sel]); report['sif']={'training_rows':int(len(sel)),'positive_rate':round(float(corpus.loc[sel,'sif_label'].mean()),4)}
    bundle={'vectorizer':vec,'action':action,'object':obj,'controls':controls,'sif':sif,'sklearn_version':sklearn.__version__,'meta':report}
    MODELS.mkdir(exist_ok=True); DOCS.mkdir(exist_ok=True); joblib.dump(bundle,MODELS/'layer2_bundle.joblib',compress=3); (MODELS/'bundle_meta.json').write_text(json.dumps(report,indent=2)); (DOCS/'training_report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2)); print('elapsed',time.time()-t0)
if __name__=='__main__': main()
