# Layer 2 — Certification Readiness Report

## Executive status
**Certification status: NOT CERTIFIED.**

The model is a research/prototype system. A numerical score computed from the supplied material can be made reproducible and statistically defensible, but it cannot honestly be called a certified accuracy score because the project does not contain an independently certified, expert-adjudicated gold-standard test set for the Layer 2 ontology.

## Data inventory supplied for this build
- OSHA 2015–2025 accident abstracts: **105,996 records**.
- Existing weak/silver corpus carried into the model: **110,795 distinct weak/silver records available** in the previous build.
- HSE rich abstract views: **4,847 records**; these overlap the OSHA corpus and therefore are treated as richer text views, not additional independent incidents.
- PHMSA spreadsheets in the latest source bundle: **21,957 data rows** across the incident/cause-mapping workbooks.
- PDF sources in the latest source bundle: **47 PDFs**.

The PHMSA/PDF sources are useful domain material, but they do **not** expose an independently adjudicated ground-truth label for the Layer 2 action/object/control/SIF ontology. They are therefore excluded from the accuracy denominator.

## Current champion evaluation
The current champion was trained without the 15-row human holdout. The available human-reviewed set contains 50 provisional labels; 35 were used for training and 15 were kept unseen for evaluation.

| Metric | Result | 95% exact binomial CI | Status |
|---|---:|---:|---|
| Action accuracy | **80.0% (12/15)** | **51.9%–95.7%** | Internal validation only |
| Object accuracy | **53.3% (8/15)** | **26.6%–78.7%** | Internal validation only |
| SIF F1 | **78.3%** | Not computed from a certified gold set | Internal validation only |
| SIF PR-AUC | **84.6%** | Not computed from a certified gold set | Internal validation only |
| IOGP top-1 exact | **57.1% (8/14)** | Not certified | Internal validation only |

The confidence intervals above use the exact two-sided Clopper–Pearson binomial interval for the observed correct/total counts.

## Why this is not a certified accuracy
A certification claim requires, at minimum:
1. A frozen model version and frozen ontology.
2. An independently constructed test set not used for training, pseudo-labeling, threshold tuning, or feature selection.
3. Expert adjudication of the test labels, with written labeling rules and adjudication of disagreements.
4. A documented sampling frame covering the deployment population, including rare classes.
5. A reproducible evaluation run with immutable inputs and hashes.
6. An independent reviewer/auditor or certifying body to verify the process and results.

The supplied data currently lacks item 2/3 at sufficient scale for certification. The 15-row holdout is valuable, but it is too small and its labels are explicitly provisional project annotations.

## Correct statement for officials
> “The current Layer 2 research prototype achieved 80.0% action accuracy on a 15-case unseen provisional human-reviewed holdout (12/15; exact 95% confidence interval 51.9%–95.7%). Object accuracy was 53.3% (8/15; exact 95% CI 26.6%–78.7%). These are internal validation results, not certified production accuracy. The next certification step is an independently adjudicated, deployment-representative test set and an external audit of the evaluation process.”

## Model-selection decision
The previously validated champion is retained. Several attempts to train on the entire 110k+ corpus in one streaming pass exceeded the available execution window. Rather than substitute an unverified or partially trained model, the final package keeps the last fully trained and tested champion and includes the complete new source bundle for the next reproducible full-scale training run on a larger machine.

## Included audit material
- Current champion model bundle.
- Previous training/evaluation reports.
- Complete latest source dataset bundle as `datasets_complete_source_bundle.zip`.
- This certification-readiness report.
- Existing test suite and model card.

**Do not label the current 80.0% result “certified accuracy.”**
