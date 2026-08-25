# SendWise — Design Spec Extracted from Paper Mockups

**Source images**
- Fig 1: `_extracted_images/image1.png` — end-to-end flow diagram (reference only, not specced here)
- Fig 2: `_extracted_images/image2.png` (also `Warning.png`) — Intervention / Warning UI (Android)
- Fig 3: `_extracted_images/image3.png` (also `Dashboard.png`) — Parental Dashboard (web)

This spec is the single source of truth for implementation. Colors were sampled from the mockups; any color not present in the mockup is marked *(inferred)*.

---

## FIG 2 — Warning UI (Android)

### 1. Overall layout

The mockup shows an **isolated modal card**, floating on a plain white background. **No chat surface and no keyboard are rendered in the image** — the mock is intentionally decontextualized to focus on the intervention.

Implementation should therefore render this as a **modal overlay above the host chat/keyboard**, not as a full screen. The card is presented after the child taps "Send" and the classifier flags the outgoing message.

Vertical structure of the card (top → bottom):

1. **Header hero band** (pink, ~38% of card height)
   - Radial-glow shield icon with exclamation mark, centered
   - Small decorative accent marks around the shield: `+`, `+`, `×`, small dots (pale coral)
   - Title text `SendWise Warning` centered below the shield
2. **Body** (white)
   - Row A: red warning triangle icon (left) + two-line red headline (right)
   - Row B: **Category chip-row** — light-lavender pill, purple tag icon on left, label `Category:` (dark) + value `Harassment` (purple)
   - Row C: **Severity chip-row** — light-peach pill, orange bar-chart icon on left, label `Severity:` (dark) + value `Medium` (orange)
   - Italic quoted guidance line: `"Review your message before sending."`
   - Button row: `Edit Message` (outlined, left) and `Continue` (filled purple, right)

Card treatment: rounded corners (~24 dp), soft drop shadow, no visible border. Card is horizontally centered with ~16 dp screen margin. Vertically it sits roughly mid-screen; the host keyboard is dimmed behind a scrim.

**Recommended presentation**: full-screen `Dialog` (or `DialogFragment`) with a translucent scrim (`#66000000`) behind the card. Not a persistent banner and not a BottomSheet — the mock is a centered card with equal top/bottom whitespace, and its blocking nature (must Edit or Continue) matches modal `Dialog` semantics.

### 2. Colors (sampled hex)

| Token | Hex | Where |
|---|---|---|
| `card_bg` | `#FFFFFF` | Body background of the card |
| `hero_band_bg` | `#FDE4E1` | Pink header band behind shield |
| `hero_band_bg_deep` | `#FBD5D0` | Slightly deeper pink at bottom of band (subtle gradient) |
| `shield_red` | `#E5484D` | Shield fill |
| `shield_red_dark` | `#B4353A` | Shield outline/stroke |
| `hero_accent` | `#F4A9A2` | Decorative `+`, `×`, dot marks in hero band |
| `warning_triangle_red` | `#EF3E3E` | Left warning triangle icon |
| `headline_red` | `#E63946` | "Potentially harmful language detected" text |
| `category_chip_bg` | `#F3EFF8` | Light-lavender pill background |
| `category_icon_bg` | `#E8DEF7` | Circle behind tag icon |
| `category_icon_purple` | `#7C5CD6` | Tag icon fill |
| `category_value_purple` | `#5B2FD1` | "Harassment" text |
| `severity_chip_bg` | `#FBEFE0` | Light-peach pill background |
| `severity_icon_bg` | `#FCE1BE` | Circle behind bar-chart icon |
| `severity_icon_orange` | `#F59B2A` | Bar-chart icon fill |
| `severity_value_medium` | `#F59B2A` | "Medium" text |
| `severity_value_high` *(inferred)* | `#E5484D` | High severity value |
| `severity_value_low` *(inferred)* | `#2AAE6B` | Low severity value |
| `label_text` | `#111827` | "Category:", "Severity:" labels |
| `title_text` | `#101532` | "SendWise Warning" |
| `quote_text` | `#101532` | Italic guidance quote |
| `btn_primary_bg` | `#6C3FE1` | "Continue" button fill |
| `btn_primary_text` | `#FFFFFF` | "Continue" label |
| `btn_secondary_border` | `#6C3FE1` | "Edit Message" outline |
| `btn_secondary_text` | `#6C3FE1` | "Edit Message" label |
| `btn_secondary_bg` | `#FFFFFF` | "Edit Message" fill |
| `scrim` *(inferred)* | `#66000000` | Overlay behind modal |

### 3. Typography (inferred)

Face: Rounded geometric sans (visually consistent with **Nunito** or **Poppins Rounded**). Implementation may use `Poppins`, weights below.

| Element | Family/weight | Size (sp) |
|---|---|---|
| `SendWise Warning` title | Poppins SemiBold 700 | 22 |
| Headline `Potentially harmful language detected` | Poppins Bold 700 | 20, line-height 26 |
| Chip label (`Category:`, `Severity:`) | Poppins SemiBold 600 | 15 |
| Chip value (`Harassment`, `Medium`) | Poppins SemiBold 600 | 15 |
| Italic quote | Poppins Italic 500 | 14 |
| Button labels | Poppins SemiBold 600 | 15, all-caps off |

### 4. Warning copy (verbatim from the image)

- Title: `SendWise Warning`
- Headline: `Potentially harmful language detected`
- Metadata: `Category: Harassment`
- Metadata: `Severity: Medium`
- Guidance quote: `"Review your message before sending."`
- Buttons: `Edit Message`, `Continue`

### 5. Buttons

Two-button row, equal vertical padding, ~12 dp horizontal gap.

- **Edit Message** — secondary. Outlined pill, 2 dp purple border, purple pencil icon on left, purple label. Rounded 12 dp corners.
- **Continue** — primary. Filled purple pill, white paper-plane icon on left, white label. Same 12 dp radius. Slight elevation (~2 dp).

Order matters: secondary on the **left**, primary on the **right**. This makes "Continue" the default reading endpoint but requires an explicit tap — no auto-dismiss.

### 6. Severity indication mechanism

Severity is communicated with **three concurrent cues**, not color alone:

1. **Text label** — `Low` / `Medium` / `High`
2. **Value color** — green for Low, orange for Medium, red for High (values sampled/inferred above)
3. **Icon** — bar-chart icon in the severity chip (bars grow with severity; keep icon color aligned with the value color)

Category uses its own purple accent regardless of severity, so Category and Severity remain visually distinct.

### 7. Keyboard appearance

The keyboard is **not shown** in the mock. Since SendWise ships as a custom IME, the warning appears as an **overlay above the keyboard the child is actively using** (the SendWise IME itself). Do not restyle the system keyboard — render the modal on top of it via a `Dialog` window that does not resize the IME.

### 8. Icons

- Shield with center exclamation (hero) — filled red with darker outline
- Warning triangle with exclamation (headline row) — solid red
- Price-tag icon (Category chip) — purple, in a light-lavender circle
- Bar-chart icon (Severity chip) — orange, in a light-peach circle
- Pencil icon (Edit Message button) — purple, stroke
- Paper-plane / send icon (Continue button) — white, filled

Recommend Material Symbols equivalents: `shield`, `warning`, `sell` (tag), `bar_chart`, `edit`, `send`.

### 9. Recommended Android XML layout structure

- Host: `DialogFragment` with a transparent window background and `windowIsFloating=true`, dim scrim `#66000000`.
- Root: `MaterialCardView` (`app:cardCornerRadius=24dp`, `app:cardElevation=8dp`) with `layout_width=match_parent` and `layout_margin=16dp`, wrapped by a `FrameLayout` that centers it.
- Inside the card: a `ConstraintLayout`.
  - `View` for the pink hero band (constrained top, height ~38% via guideline). Give it a `background` drawable with a subtle vertical gradient `#FDE4E1 → #FBD5D0`, top corners rounded.
  - `ImageView` for the shield, centered horizontally inside the band. Use `AppCompatImageView` with a `layer-list` drawable that stacks a soft radial glow behind the shield.
  - Optional decorative `ImageView`s for the small `+`, `×`, dot accents (or bake into a single drawable).
  - `TextView` `SendWise Warning` centered below the shield, still within the band.
  - Body content in a vertical `LinearLayout` below the band:
    - Horizontal `LinearLayout` with the red triangle `ImageView` + the headline `TextView` (2-line wrap).
    - Category chip: `MaterialCardView` (radius 14 dp, no elevation) containing an icon+labels row.
    - Severity chip: same structure, different tint.
    - Italic quote `TextView`.
    - Button row: horizontal `LinearLayout` with equal weights.
      - `MaterialButton` `Edit Message` — `style=@style/Widget.Material3.Button.OutlinedButton`, `app:strokeColor=#6C3FE1`, `app:icon=@drawable/ic_edit`.
      - `MaterialButton` `Continue` — filled, `app:backgroundTint=#6C3FE1`, `app:icon=@drawable/ic_send`.

Do **not** implement as a system `AlertDialog` (its chrome will fight the design) and do **not** use `BottomSheetDialogFragment` (the mock is a centered card, not bottom-anchored).

---

## FIG 3 — Parental Dashboard (Web)

### 1. Overall layout

- **Light theme**, single-column above the fold on desktop but structured as a **2×2 grid of widget cards** below the header.
- **Header bar** spans full width: SendWise shield logo + wordmark on the left; two-line `SendWise / Parental Dashboard` label; on the right, a **Child selector** showing an avatar circle, the word `Child`, and `Alex (13)`.
- **No sidebar.** Navigation is implied to be top-level only in this view.
- Below the header, four **card widgets** in a 2-column CSS grid:
  - Row 1 left: `30-Day Intervention Trend` (area/line chart)
  - Row 1 right: `Category Distribution` (donut + legend)
  - Row 2 left: `Severity Distribution` (donut + legend)
  - Row 2 right: `Edited vs Sent Unchanged` (donut + legend)
- Figure caption below reads: `Fig. 3. Original SendWise parental dashboard showing aggregated behavioural risk indicators.` (Not part of the app UI; drop in implementation.)

Card treatment: white background, ~16 px radius, subtle 1 px border `#ECEEF3` and very soft shadow. Generous padding (~24 px). Equal card heights per row.

### 2. Colors (sampled hex)

| Token | Hex | Use |
|---|---|---|
| `page_bg` | `#F7F8FB` | App background |
| `card_bg` | `#FFFFFF` | All widget cards |
| `card_border` | `#ECEEF3` | 1 px hairline around cards |
| `text_primary` | `#101532` | Titles, KPI numbers, axis labels |
| `text_secondary` | `#6B7280` | "Total Interventions" caption, axis units |
| `accent_purple` | `#6C3FE1` | Brand shield, logo, link accents |
| `accent_blue` | `#2F6BFF` | Line chart series + "Privacy Risk" / "Sent Unchanged" |
| `series_red` | `#E5484D` | High severity, Self-Harm Risk |
| `series_orange` | `#F59B2A` | Medium severity, Stranger Contact |
| `series_green` | `#2AAE6B` | Low severity, Edited Before Sending |
| `series_purple` | `#7C5CD6` | Cyberbullying category |
| `series_blue` | `#2F6BFF` | Privacy Risk, Sent Unchanged |
| `grid_line` | `#E5E7EB` | Dashed chart gridlines |
| `area_fill` | `#DCE7FF` *(inferred)* | Light-blue area under the line chart |

### 3. Widgets — position, size, content

Container: max-width ~1200 px, centered, 24 px page padding. Grid: `grid-cols-1 lg:grid-cols-2 gap-6`. Each card ~ 560 × 420 px on desktop.

#### 3.1 Header (full width, ~96 px tall)
- Left: purple shield logo (32 px) + two-line text: `SendWise` (bold 22) over `Parental Dashboard` (regular 14, muted).
- Right: pill area — avatar circle (~44 px, `#E8DEF7` bg, dark user glyph) + right-aligned text: caption `Child` over bold `Alex (13)`.
- **Note on KPI tiles**: the mockup does **not** include KPI tiles. `Total Interventions: 80` is repeated inside three of the donut cards as a secondary caption; treat it as an in-card metric, not a header KPI. If KPI tiles are desired in implementation, add them later — they are not in the paper mock.

#### 3.2 30-Day Intervention Trend (Row 1, Left)
- Chart type: **line chart with light-blue area fill under the line**.
- Y-axis: `Interventions`, ticks at 0, 10, 20, 30, 40, 50 with horizontal dashed gridlines (`#E5E7EB`).
- X-axis: `Date`, labels `20 July`, `27 July`, `3 August`, `10 August`, `20 August` (5 points).
- Data points shown: approx `10, 18, 26, 38, 21`.
- Line color: `#2F6BFF`, 2.5 px stroke, filled circular markers (~6 px) at each point.
- Area fill under line: `#DCE7FF` at ~60% opacity.
- Title: `30-Day Intervention Trend`, Poppins SemiBold 18, `#101532`, top-left of card.

#### 3.3 Category Distribution (Row 1, Right)
- Chart type: **donut** (inner radius ~55% of outer), 4 slices — not 5.
- Slices with in-slice white percentage labels:
  - `Self-Harm Risk` 45% — `#E5484D`
  - `Stranger Contact` 25% — `#F59B2A`
  - `Cyberbullying` 20% — `#7C5CD6`
  - `Privacy Risk` 10% — `#2F6BFF`
- Right-side legend: color square + label (left) and percentage (right-aligned).
- Below the legend: `Total Interventions` (secondary text) with `80` in large bold below it.

#### 3.4 Severity Distribution (Row 2, Left)
- Chart type: **donut**, 3 slices:
  - `High` 25% — `#E5484D`
  - `Medium` 50% — `#F59B2A`
  - `Low` 25% — `#2AAE6B`
- Legend layout identical to Category card.
- Same `Total Interventions / 80` metric.
- This is the **composite risk indicator** for the dashboard — no separate "risk score" gauge is drawn.

#### 3.5 Edited vs Sent Unchanged (Row 2, Right)
- Chart type: **donut**, 2 slices:
  - `Edited Before Sending` 60% — `#2AAE6B`
  - `Sent Unchanged` 40% — `#2F6BFF`
- Same legend + `Total Interventions / 80` block.

#### 3.6 Privacy notice
- **Not present in the mockup.** The image contains no privacy disclosure line. For implementation, add a subtle footer strip beneath the grid, 12 px text, `#6B7280`, left-aligned, e.g. `Aggregated indicators only. No message content is shown or stored on this dashboard.` Flag this as an intentional addition beyond the paper.

### 4. Typography

Face: same rounded geometric sans as Fig 2 (Poppins recommended).

| Element | Weight | Size |
|---|---|---|
| Logo wordmark `SendWise` | 700 | 22 px |
| Sub-wordmark `Parental Dashboard` | 400 | 14 px, `#6B7280` |
| Child pill primary `Alex (13)` | 700 | 16 px |
| Child pill caption `Child` | 400 | 12 px, `#6B7280` |
| Card titles | 700 | 18 px, `#101532` |
| Chart axis labels | 500 | 12 px, `#6B7280` |
| Chart axis ticks | 400 | 12 px, `#6B7280` |
| Donut in-slice % | 700 | 14 px, `#FFFFFF` |
| Legend labels | 500 | 14 px, `#101532` |
| Legend values (%) | 700 | 14 px, `#101532` |
| `Total Interventions` caption | 500 | 13 px, `#6B7280` |
| `80` metric | 800 | 28 px, `#101532` |

### 5. Overall theme

**Light.** No dark-mode variant is shown in the paper. Backgrounds are near-white with soft cool grey (`#F7F8FB`) behind cards; text is deep near-black navy `#101532`.

### 6. Tech mapping — Tailwind + Recharts

Page shell:
```
bg-[#F7F8FB] min-h-screen text-[#101532] font-[Poppins]
```

Header:
```
w-full bg-white border-b border-[#ECEEF3] px-8 py-5 flex items-center justify-between
```

Grid:
```
max-w-[1200px] mx-auto px-6 py-8
grid grid-cols-1 lg:grid-cols-2 gap-6
```

Card:
```
bg-white rounded-2xl border border-[#ECEEF3] shadow-sm p-6
```

Chart mapping (Recharts):

| Widget | Recharts component | Notes |
|---|---|---|
| 30-Day Intervention Trend | `AreaChart` with `Area type="monotone"` + `Line`+`Dot`, `CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB"` | Line `#2F6BFF`, area fill `#DCE7FF` |
| Category Distribution | `PieChart` with `Pie innerRadius="55%" outerRadius="85%"` + `Cell` per slice | Colors above; `Label` inside slice for `%` |
| Severity Distribution | Same `PieChart` pattern | 3 cells: red/orange/green |
| Edited vs Sent Unchanged | Same `PieChart` pattern | 2 cells: green/blue |

Legend is easier to hand-build with a small flex list next to each `PieChart` (Recharts' default legend won't match the right-aligned percentage column).

---

## Cross-figure design tokens (use for both surfaces)

| Token | Hex |
|---|---|
| `brand.purple` | `#6C3FE1` |
| `brand.purple.soft` | `#E8DEF7` |
| `severity.high` | `#E5484D` |
| `severity.medium` | `#F59B2A` |
| `severity.low` | `#2AAE6B` |
| `category.harassment` | `#7C5CD6` |
| `category.threats` | `#F59B2A` |
| `category.hate_speech` | `#2F6BFF` |
| `category.sexual_content` | `#E5484D` |
| `category.self_harm` | `#B08CFF` |
| `surface.page` | `#F7F8FB` |
| `surface.card` | `#FFFFFF` |
| `border.hairline` | `#ECEEF3` |
| `text.primary` | `#101532` |
| `text.secondary` | `#6B7280` |

Typeface: **Poppins** (fallback: system rounded sans). Weights used: 400, 500, 600, 700, 800.

---

## Notes for implementation

1. The Fig 2 mock is a standalone card; do not invent a chat or keyboard mockup — render as a modal `Dialog` above the SendWise IME.
2. The Fig 3 mock has **no KPI header tiles**, **no separate risk-score gauge**, and **no privacy footer**. If any of these are added later, mark them as extensions beyond the paper.
3. Severity color mapping is consistent across both surfaces (red/orange/green). Reuse the tokens above rather than redefining them per screen.
4. All decorative accents in the Fig 2 hero band (`+`, `×`, dots) should be baked into a single SVG asset to avoid layout drift on different screen densities.
