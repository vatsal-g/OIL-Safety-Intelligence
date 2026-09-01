# Model card — prototype

**Purpose:** SIH 2026 Layer 2 semantic context parsing.

**Input:** OSHA ITA narrative fields combined into one text string.

**Training sample:** first 8,000 rows of the uploaded 2025–2026 OSHA ITA CSV, selected only as a lightweight local prototype sample.

**Models:** TF-IDF unigram features; Complement Naive Bayes for action/object/SIF; per-control binary Complement Naive Bayes models.

**Labels:** weak labels generated from transparent safety lexicons. No direct SIF ground truth exists in the uploaded ITA file.

**Safety status:** research/hackathon prototype only. Do not use as a real-world autonomous safety decision-maker. Keep the high-recall/human-review architecture described in the SIH design.
