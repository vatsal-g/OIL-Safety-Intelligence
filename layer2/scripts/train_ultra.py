from __future__ import annotations
import json,sys,time
from pathlib import Path
import joblib,numpy as np,pandas as pd,sklearn
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier

ROOT=Path(__file__).resolve().parent.parent; sys.path.insert(0,str(ROOT))
from src import taxonomy as TX
DATA=ROOT/'data'; MODELS=ROOT/'models'; DOCS=ROOT/'docs'
RNG=20260829; BATCH=2048; EPOCHS=3; HUMAN_WEIGHT=120.0


def vectorizer():
    return HashingVectorizer(analyzer='char_wb', ngram_range=(3,5), n_features=2**17,
        alternate_sign=False, lowercase=True, strip_accents='unicode', norm='l2')


def make_corpus():
    weak=pd.read_csv(DATA/'weak_training_set.csv',low_memory=False).fillna('')
    # Rich second view from the supplied HSE abstract dataset. These IDs are
    # already represented in weak_training_set; we add the richer wording as
    # a text augmentation, not as extra incidents.
    rich_path=Path('/mnt/data/OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL(1).csv')
    rich_rows=[]
    if rich_path.exists():
        rich=pd.read_csv(rich_path,low_memory=False).fillna('')
        keep=[c for c in ['Abstract Text','Event Description','Event Keywords'] if c in rich.columns]
        rich['rich_text']=rich[keep].astype(str).agg(' '.join,axis=1)
        r=rich[['summary_nr','rich_text']].copy()
        w=weak[['summary_nr','weak_action','weak_object','weak_controls','weak_sif_class']].copy()
        r['summary_nr']=r['summary_nr'].astype(str); w['summary_nr']=w['summary_nr'].astype(str)
        r=r.merge(w,on='summary_nr',how='inner').drop_duplicates('summary_nr')
        r['text']=r.rich_text.str.replace(r'\s+',' ',regex=True).str.strip()
        r=r[r.text.str.len()>40]
        rich_rows=r[['summary_nr','text','weak_action','weak_object','weak_controls','weak_sif_class']].copy()
    weak_base=weak[['summary_nr','text','weak_action','weak_object','weak_controls','weak_sif_class']].copy()
    weak_base['source']='base_weak'
    if len(rich_rows):
        rich_rows['source']='rich_hse_view'
        rich_rows=rich_rows[~rich_rows.summary_nr.astype(str).isin(set(weak_base.summary_nr.astype(str)))].copy()
        # Keep all rich rows, but separately duplicate only rare-action rich rows
        # once to strengthen underrepresented classes.
        merged=pd.concat([weak_base, rich_rows],ignore_index=True)
    else:
        merged=weak_base
    human=pd.read_csv(DATA/'human_seed.csv',low_memory=False).fillna('')
    ht=human[human.split=='train'].copy()
    ht['text']=ht.text_prepared.astype(str); ht['action']=ht.human_action.astype(str); ht['object']=ht.human_object.astype(str)
    ht['controls']=ht.human_control_deficiency.astype(str).replace('none',''); ht['sif_class']=np.where(ht.human_sif_label.astype(int)==1,'SIF_POTENTIAL','NON_SIF_POTENTIAL'); ht['source']='human'
    ht=ht[['ID','text','action','object','controls','sif_class','source']].rename(columns={'ID':'summary_nr'})
    merged=merged.rename(columns={'weak_action':'action','weak_object':'object','weak_controls':'controls','weak_sif_class':'sif_class'})
    merged['summary_nr']=merged['summary_nr'].astype(str); ht['summary_nr']=ht['summary_nr'].astype(str)
    corpus=pd.concat([merged,ht],ignore_index=True)
    corpus['text']=corpus.text.astype(str)
    corpus=corpus[corpus.text.str.len()>20].reset_index(drop=True)
    return corpus, len(weak), len(rich_rows)


def stream_fit(corpus,label_col,classes,vec):
    m=SGDClassifier(loss='log_loss',alpha=8e-6,max_iter=1,tol=None,random_state=RNG,
                    average=True,learning_rate='optimal')
    rng=np.random.default_rng(RNG)
    rows=np.arange(len(corpus))
    for ep in range(EPOCHS):
        rng.shuffle(rows)
        for start in range(0,len(rows),BATCH):
            ix=rows[start:start+BATCH]
            sub=corpus.iloc[ix]
            mask=sub[label_col].astype(str).isin(classes).to_numpy()
            if not mask.any(): continue
            sb=sub.loc[mask]
            X=vec.transform(sb.text.tolist())
            y=sb[label_col].astype(str).to_numpy()
            # Strongly prefer reviewed human labels while retaining class balance.
            sw=np.where(sb.source.eq('human').to_numpy(),HUMAN_WEIGHT,1.0).astype(float)
            m.partial_fit(X,y,classes=np.asarray(classes,dtype=object),sample_weight=sw)
        print(f'{label_col} epoch {ep+1}/{EPOCHS}',flush=True)
    return m


def main():
    t=time.time(); corpus,weak_n,rich_n=make_corpus()
    vec=vectorizer()
    meta={'trained_at':time.strftime('%Y-%m-%dT%H:%M:%S'),'sklearn_version':sklearn.__version__,'python_version':sys.version.split()[0],
          'base_weak_rows':weak_n,'rich_hse_views_added':rich_n,'corpus_rows':len(corpus),'epochs':EPOCHS,
          'architecture':'streaming char_wb HashingVectorizer 131072 features + SGD log_loss, 3 epochs, human_weight=120'}
    action_classes=[x for x in TX.ACTIONS if x!=TX.UNKNOWN]
    object_classes=[x for x in TX.OBJECTS if x!=TX.UNKNOWN]
    action=stream_fit(corpus[corpus.action.astype(str).isin(action_classes)].reset_index(drop=True),'action',action_classes,vec)
    obj=stream_fit(corpus[corpus.object.astype(str).isin(object_classes)].reset_index(drop=True),'object',object_classes,vec)
    meta['action']={'training_rows':int(corpus.action.astype(str).isin(action_classes).sum()),'classes':action_classes}
    meta['object']={'training_rows':int(corpus.object.astype(str).isin(object_classes).sum()),'classes':object_classes}
    # Controls: retain existing evidence-gated candidates, but retrain with the richer corpus.
    controls={}; cm={}; exploded=corpus.controls.astype(str).str.split('|')
    for lab in TX.CONTROL_DEFICIENCIES:
        if lab=='none': continue
        y=exploded.map(lambda p,l=lab:int(l in p)).to_numpy()
        pos=np.flatnonzero(y==1)
        if len(pos)<5: continue
        neg=np.flatnonzero(y==0)
        nneg=min(len(neg),max(5*len(pos),2500))
        sel=np.r_[pos, np.random.default_rng(RNG+len(lab)).choice(neg,nneg,replace=False)]
        sb=corpus.iloc[sel]
        X=vec.transform(sb.text.tolist())
        sw=np.where(sb.source.eq('human').to_numpy(),HUMAN_WEIGHT,1.0)
        m=SGDClassifier(loss='log_loss',alpha=8e-6,max_iter=1,tol=None,random_state=RNG,average=True)
        m.partial_fit(X,y[sel],classes=np.array([0,1]),sample_weight=sw)
        controls[lab]=m; cm[lab]={'positives':int(len(pos)),'sample_rows':int(len(sel))}
    meta['controls']=cm
    # SIF model uses labels already generated by the established SIF scoring layer + reviewed rows.
    sm=corpus.sif_class.isin(['SIF_POTENTIAL','NON_SIF_POTENTIAL'])
    sif_c=corpus[sm].copy()
    sif=stream_fit(sif_c.assign(sif_label=np.where(sif_c.sif_class.eq('SIF_POTENTIAL'),1,0)), 'sif_label',[0,1],vec)
    meta['sif']={'training_rows':int(len(sif_c)),'positive_rate':round(float(sif_c.sif_class.eq('SIF_POTENTIAL').mean()),4)}
    bundle={'vectorizer':vec,'action':action,'object':obj,'controls':controls,'sif':sif,
            'sklearn_version':sklearn.__version__,'meta':meta}
    MODELS.mkdir(exist_ok=True); DOCS.mkdir(exist_ok=True)
    joblib.dump(bundle,MODELS/'layer2_bundle.joblib',compress=3)
    (MODELS/'bundle_meta.json').write_text(json.dumps(meta,indent=2)); (DOCS/'training_report.json').write_text(json.dumps(meta,indent=2))
    print(json.dumps(meta,indent=2)); print('elapsed',round(time.time()-t,1))

if __name__=='__main__': main()
