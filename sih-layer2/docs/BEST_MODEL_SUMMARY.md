# Layer 2 Best-Model Training Summary — 2026-08-29

Source corpus: 105,996 newly supplied OSHA records (2015–2025) plus the prior 4,844-row weak corpus.

Training corpus: 110,795 distinct weak/silver records available. A 12,000-row stratified sample was used for the fast TF-IDF model, with all 35 training-side human-reviewed examples included at 75x weight. The 15-row human holdout remained unseen.

Model: TF-IDF word 1–2 grams + character 3–5 grams; SGD log-loss classifiers for action/object; evidence-gated control candidates; conservative SIF model trained from the original weak SIF set plus human train labels.

Serving change: the statistical model can now correct a non-abstaining rule result when its probability is higher, while a specific line-breaking rule remains authoritative.

Validation: 42/42 tests passed. On the fixed 15-row unseen human holdout: action accuracy 0.80, action macro-F1 0.8542, object accuracy 0.5333, object macro-F1 0.4067, SIF F1 0.7826, IOGP top-1 exact 0.5714.

Important: the human labels are provisional and n=15 for the holdout. These metrics are indicative and must not be represented as certified production performance.
