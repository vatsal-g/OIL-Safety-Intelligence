# Layer 2 Training Upgrade — 2026-08-29

This build keeps the previously validated Layer 2 bundle as the base model and adds a lightweight text adapter trained on:

- 9,006 stratified weak-label examples from the full OSHA corpus
- 4,846 richer HSE text views (Abstract Text + Event Description + Event Keywords)
- 35 provisional human-reviewed training examples, upweighted heavily

The richer HSE file contains the same underlying 2015–2017 incident IDs already represented in the main 2015–2025 weak corpus, so it is treated as **text augmentation**, not additional incident counts.

## Serving change

Action/object probabilities are blended from the base model and adapter at a 35% adapter weight. Rules remain evidence-first, and controls/SIF keep the prior evidence-gated behavior.

## Validation

- 42/42 automated tests pass.
- Same 15-row unseen human holdout: action accuracy 0.8000; action macro-F1 0.8542; object accuracy 0.4667; object macro-F1 0.2361; SIF F1 0.7826.
- These are small-N, provisional validation figures and are **not certified production accuracy**.
