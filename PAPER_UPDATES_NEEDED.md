# Paper Updates Needed (SendWise.docx)

Manual replacements to apply to `SendWise.docx` before submission. The docx itself is not modified by this repo — the author owns it. This file tracks what needs to change.

## Confirmed Placeholders Found in the docx

Detected via `textutil -convert txt`:

| Line | Current text | Replace with |
| ---: | --- | --- |
| 13 | `DOI: https://doi.org/10.48084/etasr.XXXX` | Final DOI assigned by ETASR on acceptance. Leave the `XXXX` until the editor issues the identifier. |
| 521 | `... available through the authors' public repository: [INSERT ACTUAL GITHUB/REPOSITORY LINK].` | `https://github.com/NamrataG7/SendWise` |

## Additional Author Actions

- [ ] **Data Availability statement.** Add / verify a line pointing to the in-repo dataset:  
  `The dataset is available at https://github.com/NamrataG7/SendWise/blob/main/model_training/data/SendWise_Dataset.csv (see model_training/data/DATASET_CARD.md for schema, provenance, and licence).`
- [ ] **Metrics tables.** Verify that all numeric values in the paper's Results tables match the current `model_training/training_report.md` produced by the deterministic training run (`random_state=42`). Any change to preprocessing, split ratio, or hyperparameters between the paper snapshot and the repo will cause drift.
- [ ] **Class balance.** Confirm Table VI still reads: 17,589 non-risk + 2,533 risk = 20,122 (matches `DATASET_CARD.md`).
- [ ] **Category distribution.** Confirm Table VIII still reads: harassment 950, threats 550, hate_speech 400, sexual_content 333, self_harm 300.
- [ ] **Split table.** Confirm Table VII still reads: train 15,091 (13,191 / 1,900) and test 5,031 (4,398 / 633).
- [ ] **Ethics / Fair Use.** Confirm the §Ethics paragraph matches `DATASET_CARD.md` (public content only, no PII, no DMs, CC-BY 4.0).
- [ ] **Limitations §.** Confirm the prototype-scope limitations listed in `SECURITY.md` (no salt rotation, no auth on ingest, single parent account, cert-pin placeholder) are acknowledged.

## Not Verifiable Without Opening the docx

The following are formatting concerns a plain-text extract cannot check — the author should verify visually before submission:

- Figure captions and figure numbering after any last-minute figure swap
- Table borders / column widths in Tables VI–VIII
- Reference list ordering (numeric vs. alphabetical per ETASR style)
- Author affiliation superscripts and ORCID IDs
- Any `[INSERT ...]` or `[TODO]` markers hidden inside text boxes, footnotes, or comments (only the main flow was scanned)
