from __future__ import annotations
import json,sys,time
from pathlib import Path
import joblib,numpy as np,pandas as pd,sklearn
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier
ROOT=Path(__file__).resolve().parent.parent; sys.path.insert(0,str(ROOT))
from src import taxonomy as TX
DATA=ROOT/'data'; MODELS=ROOT/'models'; DOCS=ROOT/'docs'; RNG=20260829


def main():
 t=time.time()
 base=joblib.load(MODELS/'layer2_bundle.joblib')
 weak=pd.read_csv(DATA/'weak_training_set.csv',low_memory=False).fillna('')
 # stratified old corpus sample
 labeled=weak[weak.weak_action!='']; parts=[]; target=9000
 for lab,g in labeled.groupby('weak_action'):
  n=max(30,int(round(target*len(g)/len(labeled)))); n=min(n,len(g)); parts.append(g.sample(n=n,random_state=RNG+abs(hash(str(lab)))%10000))
 base_s=pd.concat(parts,ignore_index=True).sample(frac=1,random_state=RNG)
 base_s=base_s[['text','weak_action','weak_object','weak_controls','weak_sif_class']].rename(columns={'weak_action':'action','weak_object':'object','weak_controls':'controls','weak_sif_class':'sif_class'})
 base_s['source']='weak'
 # rich HSE view, already present in the old corpus but with substantially richer text fields
 rich=pd.read_csv('/mnt/data/OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL(1).csv',low_memory=False).fillna('')
 cols=[c for c in ['Abstract Text','Event Description','Event Keywords'] if c in rich.columns]
 rich['text']=rich[cols].astype(str).agg(' '.join,axis=1).str.replace(r'\s+',' ',regex=True).str.strip()
 rich=rich[['summary_nr','text']].merge(weak[['summary_nr','weak_action','weak_object','weak_controls','weak_sif_class']],on='summary_nr',how='inner')
 rich=rich.rename(columns={'weak_action':'action','weak_object':'object','weak_controls':'controls','weak_sif_class':'sif_class'}); rich['source']='rich_hse'; rich=rich[rich.text.str.len()>40]
 # High-trust reviewed seed
 human=pd.read_csv(DATA/'human_seed.csv',low_memory=False).fillna(''); h=human[human.split=='train'].copy()
 h=h[['text_prepared','human_action','human_object','human_control_deficiency','human_sif_label']].rename(columns={'text_prepared':'text','human_action':'action','human_object':'object','human_control_deficiency':'controls'})
 h['sif_class']=np.where(h.human_sif_label.astype(int)==1,'SIF_POTENTIAL','NON_SIF_POTENTIAL'); h['source']='human'; h=h.drop(columns=['human_sif_label'])
 corpus=pd.concat([base_s,rich[['text','action','object','controls','sif_class','source']],h],ignore_index=True).fillna('')
 corpus=corpus[corpus.text.astype(str).str.len()>20].reset_index(drop=True)
 v=HashingVectorizer(analyzer='char_wb',ngram_range=(3,5),n_features=2**15,alternate_sign=False,lowercase=True,strip_accents='unicode',norm='l2')
 X=v.transform(corpus.text.astype(str).tolist()); w=np.where(corpus.source.eq('human').to_numpy(),150.0,np.where(corpus.source.eq('rich_hse').to_numpy(),1.5,1.0))
 def fit(col,classes):
  mask=corpus[col].isin(classes).to_numpy(); m=SGDClassifier(loss='log_loss',alpha=8e-6,class_weight='balanced',max_iter=300,tol=3e-3,random_state=RNG,average=True); m.fit(X[mask],corpus.loc[mask,col].astype(str),sample_weight=w[mask]); return m,int(mask.sum())
 am,an=fit('action',[x for x in TX.ACTIONS if x!=TX.UNKNOWN]); om,on=fit('object',[x for x in TX.OBJECTS if x!=TX.UNKNOWN])
 out={'base_bundle':base,'adapter_vectorizer':v,'adapter_action':am,'adapter_object':om,'adapter_weight':0.35,'sklearn_version':sklearn.__version__,'meta':{**(base.get('meta') or {}),'adapter':{'trained_at':time.strftime('%Y-%m-%dT%H:%M:%S'),'corpus_rows':len(corpus),'base_sample_rows':len(base_s),'rich_hse_rows':len(rich),'human_rows':len(h),'feature_matrix':list(X.shape),'weighting':'human 150x; rich HSE 1.5x; old weak 1x','blend_weight':0.35,'action_training_rows':an,'object_training_rows':on}}}
 # Keep legacy bundle fields for compatibility and add adapter fields.
 out.update({k:base[k] for k in ['vectorizer','action','object','controls','sif'] if k in base})
 joblib.dump(out,MODELS/'layer2_bundle.joblib',compress=3); (MODELS/'bundle_meta.json').write_text(json.dumps(out['meta'],indent=2)); (DOCS/'training_report.json').write_text(json.dumps(out['meta'],indent=2)); print(json.dumps(out['meta']['adapter'],indent=2)); print('elapsed',round(time.time()-t,1))
if __name__=='__main__': main()
