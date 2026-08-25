# SendWise Random Forest — Training Report

## Environment

- Python: 3.12.13
- scikit-learn: 1.5.2
- numpy: 1.26.4, pandas: 2.2.3
- Platform: Darwin 25.5.0 (arm64)
- Random seed: 42

## Dataset

- Rows: 20,122
- Risk label balance: {0: 17589, 1: 2533}
- Language mix: {'English': 16360, 'Hinglish': 3762}
- Category distribution: {'non_risk': 17589, 'harassment': 950, 'threats': 550, 'hate_speech': 400, 'sexual_content': 333, 'self_harm_risk': 300}
- Split methodology: dataset-provided split column (75/25)

## Table III — Model configuration

| Parameter | Value |
|---|---|
| Vectorizer | TF-IDF (word) |
| n-gram range | (1, 2) |
| max_features | 5000 |
| min_df | 2 |
| lowercase | True |
| strip_accents | unicode |
| Classifier | RandomForestClassifier |
| n_estimators | 200 |
| max_depth | None |
| class_weight | balanced |
| Decision threshold | 0.5 |
| Train wall-clock | 0.21 s |

## Table XIII — Final metrics on held-out test set

| Metric | This run | Paper target | Δ |
|---|---|---|---|
| Precision | 85.96% | 85.96% | -0.00 pp |
| Recall | 95.73% | 95.73% | +0.00 pp |
| F1 | 90.58% | 90.58% | +0.00 pp |
| ROC-AUC | 99.82% | — | — |
| PR-AUC | 98.85% | — | — |
| Specificity | 97.75% | — | — |

Confusion matrix `[[TN, FP], [FN, TP]]`: `[[4299, 99], [27, 606]]`

**Paper reproduction within ±2 pp:** YES

## Table XIV — Threshold sensitivity

| Threshold | Precision | Recall | F1 | Specificity |
|---|---|---|---|---|
| 0.4 | 86.44% | 99.68% | 92.59% | 97.75% |
| 0.5 | 85.96% | 95.73% | 90.58% | 97.75% |
| 0.6 | 87.00% | 93.05% | 89.92% | 98.00% |
| 0.7 | 87.86% | 92.58% | 90.15% | 98.16% |
| 0.8 | 90.80% | 91.94% | 91.37% | 98.66% |
| 0.9 | 96.99% | 91.63% | 94.23% | 99.59% |

## Table XV — Bootstrap 95% CIs (5000 replicates)

- Precision: [83.33%, 88.53%]
- Recall: [94.05%, 97.21%]
- F1: [88.84%, 92.20%]

## Table IV — Classifier comparison

| Model | Precision | Recall | F1 | ROC-AUC | Train (s) |
|---|---|---|---|---|---|
| SVM (LinearSVC) | 86.48% | 100.00% | 92.75% | 99.91% | 0.03 |
| KNN (k=5) | 89.00% | 99.68% | 94.04% | 99.12% | 0.0 |
| LogReg | 86.48% | 100.00% | 92.75% | 99.82% | 6.42 |
| MultinomialNB | 86.91% | 99.68% | 92.86% | 99.92% | 0.01 |
| GradientBoosting | 86.36% | 97.00% | 91.37% | 98.58% | 6.51 |
| RandomForest | 85.96% | 95.73% | 90.58% | 99.82% | 0.19 |

## Per-category classifier (multi-class over risk categories)

| Category | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| harassment | 97.79% | 92.86% | 95.26% | 238 |
| threats | 96.90% | 91.91% | 94.34% | 136 |
| hate_speech | 97.98% | 91.51% | 94.63% | 106 |
| sexual_content | 98.73% | 95.12% | 96.89% | 82 |
| self_harm | 69.00% | 97.18% | 80.70% | 71 |
| **macro avg** | 92.08% | 93.72% | 92.37% | — |

## Artifacts

- `artifacts/rf_model.pkl` — binary risk RandomForest (sklearn)
- `artifacts/tfidf.pkl` — TF-IDF vectorizer (binary)
- `artifacts/rf_category.pkl` — category RandomForest (sklearn)
- `artifacts/tfidf_category.pkl` — TF-IDF vectorizer (category)
- `SafeKeyboardApp/app/src/main/assets/models/sendwise_rf_v1.json.gz`
- `SafeKeyboardApp/app/src/main/assets/models/sendwise_category_v1.json.gz`
- `SafeKeyboardApp/app/src/main/assets/models/MODEL_CARD.json`