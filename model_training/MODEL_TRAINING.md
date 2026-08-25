# Retraining the SendWise Random Forest Classifier

This document reproduces the on-device classifier reported in the paper. Following it end-to-end reproduces the metrics in **Table VII**:

| Metric | Paper | Your run should match |
| --- | --- | --- |
| Precision | **85.96** | ±0.05 |
| Recall | **95.73** | ±0.05 |
| F1 | **90.58** | ±0.05 |

Determinism is enforced via `random_state=42`; matches should be exact on the same scikit-learn build.

---

## Prerequisites

> [!IMPORTANT]
> The version pins below match the environment used for the paper.
> Newer scikit-learn releases may serialise the model differently and break Android inference.

- [ ] Python **3.12.7**
- [ ] scikit-learn **1.5.2**
- [ ] pandas ≥ 2.2
- [ ] numpy ≥ 1.26
- [ ] joblib ≥ 1.4

Recommended setup:

```bash
cd model_training
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install \
    scikit-learn==1.5.2 \
    pandas==2.2.3 \
    numpy==1.26.4 \
    joblib==1.4.2
```

Sanity check:

```bash
python -c "import sklearn, sys; print(sys.version); print(sklearn.__version__)"
# Expected:
# 3.12.7 (…)
# 1.5.2
```

---

## Dataset

Place `sendwise_dataset.csv` in `model_training/data/`.

Schema (matches paper **Table VI**):

| Column | Type | Description |
| --- | --- | --- |
| `text` | string | Raw message text |
| `label` | int (0/1) | 1 = risky / harassment-adjacent, 0 = benign |
| `category` | string | One of `harassment`, `hate`, `threat`, `sexual`, `benign` |

Expected size: **20,122 rows**.

> [!NOTE]
> **The dataset is not shipped in this repository.** Provenance and licensing terms for each constituent source are documented in the paper (**Table X — Dataset Provenance**). Contact the authors for access under the terms described there.

---

## Training

From the `model_training/` directory with the venv active:

```bash
python train_sendwise_rf.py
```

Expected runtime on a modern laptop: **~2–4 minutes**.

The script performs:

1. Stratified 80/20 train/test split (`random_state=42`)
2. TF-IDF vectorisation (1–2 grams, `max_features=10000`)
3. `RandomForestClassifier(n_estimators=300, max_depth=None, class_weight="balanced", random_state=42)`
4. Evaluation on the held-out 20% test set
5. Export to a compact JSON representation consumable by the Android inference layer

---

## Outputs

After a successful run:

| Path | Purpose |
| --- | --- |
| `../SafeKeyboardApp/app/src/main/assets/models/sendwise_rf_v1.json.gz` | Serialised Random Forest, loaded by the IME at startup |
| `../SafeKeyboardApp/app/src/main/assets/models/MODEL_CARD.json` | Model card: training date, dataset hash, metrics, sklearn version |
| `reports/metrics.json` | Full classification report (per-class precision/recall/F1/support) |
| `reports/confusion_matrix.png` | 2×2 confusion matrix on the test split |

- [ ] `sendwise_rf_v1.json.gz` present and ≤ 5 MB
- [ ] `MODEL_CARD.json` present
- [ ] Rebuild the APK (see [`../BUILD_APK.md`](../BUILD_APK.md)) so the new model is bundled

---

## Verification

Open `reports/metrics.json` and confirm the weighted-average line matches:

```json
{
  "precision": 0.8596,
  "recall":    0.9573,
  "f1":        0.9058
}
```

If any metric drifts by more than **0.5 percentage points**, likely causes are:

| Drift cause | Fix |
| --- | --- |
| Different scikit-learn version | Reinstall exactly `scikit-learn==1.5.2` |
| Dataset row count ≠ 20,122 | Verify `sendwise_dataset.csv` integrity against the SHA-256 in `MODEL_CARD.json` from a prior run |
| Modified hyperparameters | Revert `train_sendwise_rf.py` |
| Different Python patch version | Use 3.12.7 specifically (`pyenv install 3.12.7`) |

---

## Citing this model

If you retrain and publish results, cite the paper (see [`../README.md#citation`](../README.md#citation)) and include the SHA-256 of your dataset alongside the sklearn version — both are already recorded in `MODEL_CARD.json`.

---

<sub>Back to [`../README.md`](../README.md).</sub>
