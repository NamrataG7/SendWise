# SendWise — Adversarial Submission-Readiness Review

**Paper:** `SendWise Revision/SendWise.docx` (revised 24 Aug 2026)
**Repo:** `NamrataG7/SendWise` @ `baefe7f` (main)
**Target venue:** ETASR (IEEE-style)
**Reviewer stance:** adversarial (assume reject unless defended)

---

## 1. Verdict

**Needs MAJOR revision before submission.**

Justification: the paper is well-organized and the underlying artifact is real and reproducible, but three classes of problems are disqualifying as-is:

1. **Table IV (classifier comparison) is scientifically indefensible.** The paper reports RF as best (F1 ~90) while showing SVM/LogReg at F1 ~70–78. The repo's own `training_report.md` shows *every* baseline at F1 ≥ 91% and RF as the **worst** (F1 90.58%). A reviewer running the code will immediately flag this as fabricated or misleading — desk-reject risk.
2. **Multiple placeholder tokens remain** (`[INSERT ACTUAL GITHUB/REPOSITORY LINK]`, `[ACTUAL LINK]`, `202X`, `etasr.XXXX`). ETASR desk-rejects on these.
3. **The paper systematically understates what has already been implemented.** Pairing TTL, retry cap, one-time redeem, Keystore-salt, revocation (Unlink Device), cert-pinning readiness, edited-action logging — all are shipped in `baefe7f` but described as "not implemented, deferred to production." Reviewers will ask why the authors don't know what's in their own repo.

Fixing Table IV and the placeholders + syncing the "Limitations" section to reality would move the paper to **Minor revision**.

---

## 2. Issue Table

| # | Issue | Severity | Location | Suggested Fix |
|---|---|---|---|---|
| 1 | Table IV classifier comparison contradicts `model_training/training_report.md`. Paper: SVM ~78 F1, KNN ~65, LogReg ~70, NB ~66, GB ~58, RF ~90. Repo actual: SVM 92.75, KNN 94.04, LogReg 92.75, NB 92.86, GB 91.37, RF 90.58. RF is actually the *lowest*-F1 model. | **CRITICAL** | § Classification Algorithm, Table IV | Replace numbers with actual `training_report.md` values. Rewrite selection rationale: RF chosen for *deployability* (200 KB model, 0.19 s train, interpretable, no linear-kernel eval overhead on-device) — not because it "showed the strongest overall F1". Otherwise remove Table IV entirely. |
| 2 | Placeholder text left in manuscript: `[INSERT ACTUAL GITHUB/REPOSITORY LINK]`, `[ACTUAL LINK]`, `Accepted: 3 March 202X`, `DOI: …/etasr.XXXX`. | **CRITICAL** | Data Availability §, Ref [18], header | Insert `https://github.com/NamrataG7/SendWise` and remove date/DOI placeholders (leave to editor). |
| 3 | Paper claims "current prototype does not implement code expiration, one-time use, retry limits, revocation." Repo ships all four: 15-min TTL, one-time redeem, 5-attempt cap, `DELETE /api/parent/children/[hash]` unlink endpoint. | **CRITICAL** | § Tier 3 → Linking Parent and Child Accounts | Rewrite paragraph to describe the actual implementation: cryptographically random 6-digit code, Redis-backed 15-min TTL, one-time redeem, 5-attempt lockout, parent-initiated Unlink Device. |
| 4 | Paper claims "prototype does not implement periodic salt rotation" (implying static salt). Repo uses **per-device Android Keystore-backed random salt** generated at install, not compiled-in. Framing understates the current security posture. | **MAJOR** | § Tier 2 → user_id_hash paragraph | State: "Each device generates a random salt at first launch, stored in the Android Keystore. Salt rotation across install lifetimes is not implemented; identifiers therefore remain linkable within a single install." |
| 5 | Paper: "certificate pinning is used." Repo: pinning is stubbed/ready but *not activated*. Overstatement. | **MAJOR** | § Tier 2 → Transmission Protocol | Change to "certificate pinning is prepared in the network layer and can be enabled at deployment; the current build uses TLS 1.3 (with 1.2 fallback) without active pin enforcement." |
| 6 | Category naming mismatch: paper uses `self-harm risk` / `Self-Harm Risk`; code and dataset use `self_harm_risk`. Trivially spotted by reviewer. | **MINOR** | § Category Definitions, Table VIII, Table XI | Standardise on a single label. Recommend `self_harm` (matches shipped Kotlin `ToxicityAnalyzer.kt`, dashboard components). |
| 7 | No inter-annotator agreement (κ) reported despite 5 annotators. Paper says "future work will include Cohen's/Fleiss' kappa." Reviewers will demand it now, not later. | **MAJOR** | § Dataset Description | Either compute Fleiss' κ on the existing double-annotated subset and report, or acknowledge as a hard limitation *and* explain why post-hoc computation is infeasible. Current wording ("not calculated…therefore not reported") reads as evasive. |
| 8 | No IRB / ethics-board approval statement, and no GDPR / COPPA / India DPDP Act discussion despite the target user being minors. Ethics section says "no formal approval required" because the technical evaluation used only public data — true, but the *deployed* system processes minors' text. | **MAJOR** | § Ethics Statement | Add explicit paragraph: (i) technical evaluation used only public content, no IRB required; (ii) any real-world deployment involving minors requires guardian consent, adolescent assent, and compliance with GDPR-K, COPPA, and DPDP Act 2023 (India). Cite the acts. |
| 9 | Threshold rationale inconsistent with Table XIV. Paper: "0.5 was retained…because the intended use is safety-oriented…where maintaining high sensitivity…is prioritized." But Table XIV shows threshold **0.4** dominates 0.5 on both recall (99.53 vs 95.73) *and* F1 (92.51 vs 90.58). Reviewer will ask: why not 0.4? | **MAJOR** | § ML Classifier + § Threshold Sensitivity | Either (a) change the deployed threshold to 0.4 and rerun downstream numbers, or (b) justify 0.5 with a precision/false-positive-fatigue argument grounded in the UX (each false positive interrupts a child). Current rationale is self-contradictory. |
| 10 | No mention of **received-message analysis**. SendWise only inspects outgoing text. A cyberbullying-safety paper that ignores the victim side needs to defend this scope explicitly. | **MAJOR** | § System Objectives + § Limitations | Add one paragraph: SendWise addresses the *sender-side intervention* threat model. Detecting inbound harassment against the child requires accessibility-service access, which contradicts the privacy-by-design goal. Explicitly out of scope. |
| 11 | Table XII (confusion matrix TN 4299 / FP 99 / FN 27 / TP 606) is consistent with Table XIII per-class metrics. ✅ | OK | Table XII/XIII | No action. |
| 12 | Bootstrap CI methodology correctly described (5,000 replicates, percentile method). ✅ | OK | Table XV | No action. |
| 13 | No prose alt-text-equivalent description of Fig 1, Fig 2, Fig 3 beyond one-line captions. ETASR expects self-contained figures. | MINOR | Figures 1–3 | Expand each caption to 2–3 sentences describing the actual content. |
| 14 | Paper never names the backend stack (Vercel / Next.js / Supabase / Upstash Redis) or dashboard URL. Reviewer cannot verify the live system. | MAJOR | § Backend Infrastructure | Add one sentence: "The backend is deployed as Next.js API routes on Vercel with Upstash Redis for metadata storage and Supabase Auth for parent accounts; the dashboard is publicly reachable at [URL]." |
| 15 | Reference [17] "ETASR vol. 16, no. 1, pp. 31809–31813, Feb. 2026" — verify this exists. Currently unverified. Ref [18] is a self-cite with `[ACTUAL LINK]` placeholder. | MAJOR | References | Verify [17]; complete [18]. |
| 16 | Reference formatting drift: mix of italicised and non-italicised journal titles; ref [3] and [10] are commercial-product web pages formatted inconsistently; "Accessed" dates use future date "Aug. 24, 2026" (that is the revision date, not access date). | MINOR | References | Normalise to IEEE style; correct access dates. |
| 17 | Duplicate paragraph content: severity-scoring introduction is stated twice in near-identical form (paragraphs 107 and 108). | MINOR | § Severity Scoring | Delete one of the two paragraphs. |
| 18 | Section-heading level bug: three consecutive paragraphs (174–176) are formatted as `Heading 4` but contain body prose ("The deployment of parental…", "The proposed architecture…", "Transparency is equally important…"). Also "Preliminary Parent Feedback", "Limitations and Future Research" are Heading 4 rather than Heading 2/3. | MINOR | § Ethical Considerations, § Limitations | Fix heading levels; demote body prose to Normal style. |
| 19 | "AI Use Declaration" is present and appropriately worded. ✅ | OK | End of paper | No action. |
| 20 | Table I labels commercial competitors ("Bark/Qustodio") with "Not reported" for empirical result, but the same row lists "Yes/Partial" for parent-sees-content — mixing capabilities with reporting completeness. Reviewer will call this a straw-man. | MINOR | Table I | Split into "capability" and "published empirical result" columns, or use dashes uniformly. |
| 21 | No power-consumption, latency, or memory numbers. Paper openly admits this. However the abstract still says "Battery consumption, memory usage, and processor load should remain low so that users do not experience noticeable performance issues" — the *goal* statement is fine; check that no metric is claimed. Grep confirms none. ✅ | OK | § Objectives, § Computational Considerations | No action; the honest admission is defensible. |
| 22 | Novelty claim of "separation of awareness from surveillance" is defensible and well-supported. ✅ | OK | § Contributions | No action. |
| 23 | Only 3 embedded figures for a system paper describing 3 tiers, 5 categories, and 6 metrics tables. No architecture diagram distinct from the workflow (Fig 1 doubles as both). Reviewer may request an architecture diagram + a screenshot of the pairing flow. | MINOR | Figures | Consider adding Fig 4: pairing sequence diagram; Fig 5: dashboard screenshot detail. |
| 24 | The word "conversational context" and "extended conversation histories" as future work directly contradict on-device single-message privacy design. Not fatal but reviewers will probe. | NIT | § Limitations | Reframe: "future work could enrich metadata with *aggregate* session features that do not require content retention." |
| 25 | "First-person plural" occurs (`We developed SendWise…`) in an otherwise passive-voice manuscript. Not wrong for ETASR but stylistically inconsistent. | NIT | § System Objectives | Optional: convert to passive. |
| 26 | No conflict-of-interest declaration explicitly labelled — actually present ("Declaration of Competing Interests"). ✅ | OK | End matter | No action. |
| 27 | Author contributions statement present but not in CRediT taxonomy. ETASR accepts free-form; not blocking. | NIT | End matter | Optional: reformat as CRediT roles. |

---

## 3. Consistency Mismatches: Paper vs Repo (`baefe7f`)

These will embarrass the author if a reviewer clones the repo:

| Aspect | Paper says | Repo actually ships | Impact |
|---|---|---|---|
| Pairing code TTL | "Not implemented; deferred to production" | 15-min TTL in `pairing/generate/route.ts` (`PAIRING_TTL_SECONDS = 15 * 60`) | Understates security |
| Retry limit | "Not implemented" | 5 wrong attempts → key deleted; dual rate-limit by parent_id and code | Understates security |
| One-time redeem | "Should additionally enforce" | Redeem endpoint deletes the code atomically | Understates security |
| Revocation / unlink | "Requires removal or reconfiguration…future versions should provide" | `DELETE /api/parent/children/[hash]` + Unlink Device UI (commit `997ff4c`) | Understates completeness |
| Certificate pinning | "Is used" | Stubbed / not activated | *Overstates* security |
| Salt for user_id_hash | Implies static | Per-device Keystore-backed random salt | Understates security |
| Backend stack | Only "Node.js 26.0.0 backend runtime" | Next.js on Vercel + Upstash Redis + Supabase Auth | Vague; unverifiable by reviewer |
| Parent auth | Unspecified | Supabase multi-parent auth | Missing detail |
| Action logging | "Records edited-vs-sent action" | Actually logs `edited` / `sent_anyway` / `cancelled` (three-way) | Minor undercount |
| Sensitive-field skip | Not mentioned | Skips passwords, PINs, banking apps | Missing feature the paper should claim as a privacy win |
| Category label | `self-harm risk` | `self_harm_risk` in dataset, `self_harm` in some UI code | Cosmetic drift |
| Table IV baseline F1s | 58–78% (except RF ~90) | 90.58–94.04% for all baselines | **Fabrication risk** |

---

## 4. Top 5 Things to Fix Before Submission (ranked)

1. **Rebuild Table IV from the actual `training_report.md`.** Rewrite the "why Random Forest" paragraph around **deployability, model size, on-device latency, interpretability** — not F1 superiority. This is the single biggest integrity risk.
2. **Purge every `[INSERT …]`, `202X`, and `etasr.XXXX` placeholder.** Add the real GitHub URL and the deployed dashboard URL.
3. **Rewrite the "prototype limitations" paragraphs in Tier 2 and Tier 3** to describe what actually ships (TTL, retry cap, one-time redeem, unlink, Keystore salt) and downgrade the cert-pinning claim from "is used" to "is prepared".
4. **Resolve the threshold contradiction.** Either move the deployed threshold to 0.4 (recompute Tables XII, XIII, XV) or add an explicit precision-oriented UX justification for 0.5.
5. **Add a minor-user compliance paragraph** citing GDPR-K, COPPA, and India's DPDP Act 2023, and either compute Fleiss' κ on the annotated subset or explain concretely why it cannot be recovered.

---

## 5. Ethics + Privacy Checklist

| Item | Status |
|---|---|
| Ethics statement present | PRESENT |
| IRB / institutional ethics approval mentioned | MISSING (paper argues N/A — defensible for the technical eval, but weak for deployment discussion) |
| Adolescent consent / assent framing | WEAK (mentioned as future work only) |
| Parental consent framing | WEAK |
| GDPR / GDPR-K (children) discussion | MISSING |
| COPPA (US) discussion | MISSING |
| India DPDP Act 2023 discussion | MISSING (author is India-based; this is expected) |
| Data-minimization justification | PRESENT (strong) |
| Retention policy on server | WEAK (admitted not enforced; no target retention period stated) |
| Right to erasure / GDPR Art. 17 | MISSING |
| "Warn, don't block" autonomy defense | PRESENT |
| Surveillance-vs-awareness framing | PRESENT (strong) |
| Conflict of interest | PRESENT |
| Funding statement | PRESENT ("no external funding") |
| Generative-AI use disclosure | PRESENT |

---

## 6. Reproducibility Scorecard

| Item | Status |
|---|---|
| Public repo URL in paper | **MISSING** (placeholder) |
| Dataset available | PRESENT (`model_training/data/SendWise_Dataset.csv`, 20,122 rows checked in) |
| Train/test split reproducible | PRESENT (split column in CSV, seed 42) |
| Training script | PRESENT (`train_sendwise_rf.py`) |
| Requirements pinned | PRESENT (`requirements.txt`) |
| Environment (Python, sklearn versions) reported in paper | PRESENT |
| Paper metrics reproduce exactly | PRESENT (`training_report.md` shows Δ ≤ 0.00 pp) |
| Bootstrap CI script | PRESENT (`training_report.md` shows CIs) |
| Trained model artifact / JSON export | PRESENT (`export_to_kotlin_json.py`) |
| Android build reproducible | PRESENT (GitHub Actions APK workflow) |
| Backend reproducible | PARTIAL (Vercel-specific; needs env-var doc) |
| Dashboard live | PRESENT (`https://sendwise-lac.vercel.app`) |
| Annotation guidelines | PRESENT (Table XI) |
| Inter-annotator κ | MISSING |
| Random seed reported | PRESENT (seed 42 in report; not stated in paper — add it) |
| Hardware benchmark reproducible | MISSING (openly admitted) |

**Overall reproducibility: strong** once the repo URL is inserted. The single biggest reviewer-facing risk is the URL placeholder plus the fabricated-looking Table IV — both are trivial to fix.

---

*End of review.*
