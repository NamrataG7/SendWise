# SendWise Dataset Card

## Overview

| Field | Value |
| --- | --- |
| **Name** | SendWise Cyberbullying Risk Dataset |
| **Version** | 1.0 (2026 paper release) |
| **Size** | 20,122 rows |
| **File** | [`SendWise_Dataset.csv`](./SendWise_Dataset.csv) |
| **Languages** | English, Hinglish (romanised Hindi + English code-mix) |
| **License** | CC-BY 4.0 (see [License & Attribution](#license--attribution)) |

---

## Collection

- **Year collected:** 2025
- **Sources:** Publicly accessible content from **YouTube** (comment threads) and **X (Twitter)** (public posts and replies).
- **Annotation:** 5 human annotators, cross-verified. Every row was reviewed by at least two annotators; disagreements were resolved by majority + adjudication.
- **Scope:** Only publicly visible content was collected. No private DMs, no closed-group content, no logged-in-only material.

---

## Columns

| Column | Meaning |
| --- | --- |
| `text` | Raw message text as collected (may contain emojis, mixed script). |
| `risk_label` | Integer label: `0` = non-risk, `1` = risk. |
| `risk_label_name` | Human-readable label (`non_risk` / `risk`). |
| `risk_category` | If `risk_label = 1`, one of: `harassment`, `threats`, `hate_speech`, `sexual_content`, `self_harm`. Empty for non-risk. |
| `severity` | Ordinal severity `low` / `medium` / `high` assigned by annotators (risk rows only). |
| `action_taken` | Recommended intervention label used to train the pre-send policy (e.g. `block`, `warn`, `allow`). |
| `language` | `en` (English) or `hi-en` (Hinglish / code-mix). |
| `source_type` | `youtube` or `twitter`. |
| `record_id` | Stable per-row identifier (opaque; not linked to any external account). |
| `text_clean` | Preprocessed text (lowercased, URL/handle stripped) used as classifier input. |
| `text_hash` | SHA-256 of `text_clean` — used for dedup and cross-split leakage checks. |
| `group_id` | Grouping key used to keep near-duplicate variants of the same underlying message within a single split. |
| `cv_fold` | Assigned fold `{0..4}` for the 5-fold cross-validation reported in the paper. |
| `split` | `train` or `test` — matches the stratified 75:25 partition described below. |

---

## Class Balance (paper Table VI)

| Class | Rows |
| --- | ---: |
| Non-risk (`0`) | 17,589 |
| Risk (`1`) | 2,533 |
| **Total** | **20,122** |

The 12.6% risk prevalence reflects real-world skew on the source platforms and is preserved across the train/test splits.

## Risk Category Distribution (paper Table VIII)

| Category | Rows |
| --- | ---: |
| `harassment` | 950 |
| `threats` | 550 |
| `hate_speech` | 400 |
| `sexual_content` | 333 |
| `self_harm` | 300 |
| **Total risk rows** | **2,533** |

## Train / Test Split (paper Table VII)

Stratified 75:25 split on `risk_label`, with `group_id` respected (no near-duplicate leakage across splits).

| Split | Total | Non-risk | Risk |
| --- | ---: | ---: | ---: |
| Train | 15,091 | 13,191 | 1,900 |
| Test | 5,031 | 4,398 | 633 |

---

## Ethics

- **No PII.** No usernames, handles, display names, avatars, e-mail addresses, phone numbers, or geolocations are stored. Handles and URLs are stripped in `text_clean`.
- **No user identifiers.** No stable link between a row and its original poster account is retained.
- **No private communications.** Nothing was collected from private DMs, closed groups, or authenticated-only feeds.
- **Public content, Fair Use / Research Exemption.** Collection is limited to publicly accessible content and used for non-commercial academic research on adolescent online-safety tooling. See paper §Ethics.

## License & Attribution

Released under **CC-BY 4.0**. If you use this dataset, please cite:

> Gaikwad, N. M., & Ohatkar, S. (2026). *SendWise: Privacy-Preserving Parental Awareness of Adolescent Cyberbullying Risk through On-Device Pre-Send Intervention.*

---

## Known Limitations

- **Domain shift.** The corpus is drawn from **public** YouTube and X content, whereas SendWise's target deployment is **private adolescent DMs**. Vocabulary, register, and risk-category prevalence differ. This is explicitly acknowledged in the paper §Limitations.
- **Language coverage.** English and Hinglish only. Other Indic languages and scripts are out of scope for v1.
- **Annotation subjectivity.** Severity and category labels reflect the annotators' cultural context; boundary cases (irony, in-group reclamation) are inherently noisy.
- **Temporal drift.** Slang and platform norms evolve; the 2025 snapshot will become progressively less representative over time.
