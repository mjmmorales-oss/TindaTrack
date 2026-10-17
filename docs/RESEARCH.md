# TindaTrack Research Methodology & AI Evaluation Guide

This document outlines the scientific evaluation methodology, mathematical formulations, controlled testing protocols, checkout timing benchmarks, and ethical guidelines for the AI capabilities in **TindaTrack v2.0.0** (Integrative Programming & Capstone Research).

---

## 1. Metrics, Mathematical Formulas & Data Sources

TindaTrack automatically captures telemetry during live POS sessions and controlled evaluation runs. All metrics can be analyzed directly in the **AI Research Lab** (`/ai-lab`) or exported as raw CSV data via `/api/ai/metrics/export.csv` and `/api/ai/experiments/{id}/export.csv`.

### 1.1 Basket Scan Accuracy Metrics
Source tables: `ai_scans`, `ai_scan_feedback`.

* **Suggested Lines ($S$):** The total number of line items suggested by the vision model across all scanned baskets.
* **Accepted Unchanged Lines ($A$):** Suggested lines kept by the cashier without modifying quantity or re-assigning product ID (`action = 'accepted'`).
* **Matched Lines Kept ($M$):** All suggested lines that were retained in the cart (`action IN ('accepted', 'qty_changed', 'product_changed')`).
* **Missed Lines ($Miss$):** Unmatched items identified by cashier from bounding boxes or items added manually during review (`action = 'added_manually'`).

$$\text{Item Precision} = \frac{A}{S} = \frac{\text{Accepted Unchanged Lines}}{\text{Total Suggested Lines}}$$

$$\text{Item Recall} = \frac{M}{M + Miss} = \frac{\text{Matched Lines Kept}}{\text{Kept Lines} + \text{Manually Added Lines}}$$

$$\text{Exact Quantity Accuracy} = \frac{\sum [q_{\text{final}} = q_{\text{suggested}}]}{M}$$

$$\text{Quantity Mean Absolute Error (MAE)} = \frac{1}{M} \sum_{i=1}^{M} |q_{\text{final}, i} - q_{\text{suggested}, i}|$$

### 1.2 Model Confidence Calibration
To determine whether low-confidence detections ($c < 0.50$) provide reliable signal or noise:

$$\text{Low Confidence Accuracy} = \frac{\text{Count of items with } c < 0.50 \text{ that were accepted or kept}}{\text{Total items with } c < 0.50}$$

*A high accuracy (>70%) indicates the model is overly conservative with confidence scoring; a low accuracy (<30%) justifies pruning low-confidence predictions.*

### 1.3 Checkout Duration & Efficiency
Source tables: `sales`, `sale_items`.
Duration is measured from the moment the first item enters the cart until cash tendered and receipt generation (`cart_duration_ms`). Sales are classified by **Dominant Add Method** (>50% of items entered using that modality):
1. **Manual Tap / Search:** Touchscreen grid taps or keyword search queries.
2. **Barcode Scanner:** Hardware barcode wedge or phone camera barcode stream.
3. **AI Basket Scan:** Multi-item computer vision basket scan.
4. **On-Device Visual Search:** Single-item camera viewfinder similarity chip selection.
5. **Mixed:** Transactions where no single method accounted for >50% of line items.

For each group, we compute:
* Mean Duration (seconds): $\bar{T} = \frac{1}{N} \sum T_i$
* Median Duration (seconds): $T_{\text{med}} = \text{median}(T)$
* Average Items per Sale: $\bar{K} = \frac{1}{N} \sum K_i$
* Efficiency Rate: $\text{Items per Minute} = \frac{\bar{K}}{\bar{T} / 60}$

### 1.4 Auto-Capture vs Manual Capture Telemetry
Source table: `ai_scans.capture_mode` (`auto`, `manual`, `upload`).

To evaluate whether automated computer-vision capture reduces cashier friction compared to traditional manual shutter buttons:
* **Edge Motion Guarding:** On-device motion detection (`useAutoCapture`) continuously samples video frames at 10 fps onto an offscreen $64 \times 48$ grayscale canvas. The algorithm computes mean absolute pixel difference without network overhead or heavy local ML models.
* **Settled Scene Gating:** The cloud vision model is only invoked when the scene has settled below the motion threshold for $\ge 1200\text{ ms}$, followed by a visual 3-2-1 countdown ring. Re-arming requires a minimum 3-second cooldown and detection of significant scene change ($\Delta > 8\%$).
* **Comparative Metrics:**
  - **Latency Comparison:** Compares mean inference and network round-trip time between modes.
  - **Acceptance Rate:** Fraction of detected items accepted without edits ($A / S$).
  - **User Correction Overhead:** Average user corrections per scan (quantity adjustments, line removals, re-assignments).
* **Academic Experimentation:** Researchers can benchmark auto-capture against manual capture in controlled runs (`/ai-lab` $\rightarrow$ Metrics Dashboard and CSV exports) to quantify whether auto-capture speeds up checkout throughput without compromising bounding box fidelity.

---

## 2. Controlled Testing Protocol (Ground-Truth Evaluation)

To eliminate real-world confounding variables (e.g. customer hesitation, change computation), researchers should execute a two-stage controlled protocol using the **AI Research Lab Runner** (`/ai-lab` $\rightarrow$ Controlled Experiments).

### Phase A: Single-Item Visual Search Evaluation (30 Products × 5 Angles)
1. **Sample Selection:**
   * 30 common Philippine sari-sari products representing diverse packaging forms (bottles, sachets, foil pouches, cans, boxes).
   * Ensure 10 products have visual lookalikes (e.g. *Piattos Cheese* vs *Piattos Sour Cream*, *Bear Brand Fortified* vs *Bear Brand Choco*).
2. **Image Capture:**
   * 5 photos per product captured under standard diffuse lighting (300–450 lux):
     - Angle 1: Frontal ($0^\circ$).
     - Angle 2: High isometric ($45^\circ$ elevation).
     - Angle 3: Oblique side ($30^\circ$ rotation).
     - Angle 4: Slight crinkle / deformation (for sachets and bags).
     - Angle 5: Partial occlusion (bottom 25% covered by counter edge).
3. **Execution:**
   * Feed each photo to the Visual Search embedder (`onnx-community/dinov2-small`).
   * Record Top-1 and Top-3 accuracy.

### Phase B: Multi-Item Basket Evaluation (20 Baskets)
1. **Basket Configurations:**
   * 20 test baskets containing between 3 and 10 items per basket.
   * Grouping distribution:
     - 5 Small Baskets: 3–4 items, non-overlapping.
     - 10 Medium Baskets: 5–7 items, realistic counter clutter and slight overlap.
     - 5 Complex Baskets: 8–10 items, including multiple quantities of identical SKUs (e.g., 3 Kopiko sachets).
2. **Procedure:**
   * Open `/ai-lab` $\rightarrow$ **Controlled Experiments**.
   * Click **New Test Case**.
   * Upload or capture the basket photo.
   * Input the exact ground truth items and quantities.
   * Click **Run Evaluation**.
   * The system automatically computes Exact Match, Precision, Recall, MAE, and Latency.
   * Export the dataset via **Export Cases (CSV)** for statistical analysis (ANOVA, t-test).

---

## 3. System Usability Scale (SUS) Questionnaire

For measuring subjective usability and cognitive load among sari-sari store owners and cashiers, administer the standard 10-item System Usability Scale (Brooke, 1996) immediately after a 1-week deployment period. Each item is scored on a 5-point Likert scale (1 = Strongly Disagree to 5 = Strongly Agree).

| # | Question (English) | Filipino (Taglish Helper) |
|---|--------------------|---------------------------|
| 1 | I think that I would like to use TindaTrack's AI features frequently. | Gusto kong gamitin ang AI features ng TindaTrack nang madalas. |
| 2 | I found the AI basket scan unnecessarily complex. | Naramdaman kong masyadong kumplikado ang AI basket scan. |
| 3 | I thought the visual search was easy to use. | Madali at mabilis gamitin ang camera visual search. |
| 4 | I think that I would need the assistance of a technical person to use the AI scan. | Kakailanganin ko pa ng tulong ng eksperto para magamit ang AI scan. |
| 5 | I found the various functions in TindaTrack's AI Lab well integrated. | Maayos at magkakaugnay ang mga feature ng TindaTrack. |
| 6 | I thought there was too much inconsistency in the AI suggestions. | Masyadong paiba-iba o hindi pare-pareho ang mga mungkahi ng AI. |
| 7 | I would imagine that most store owners would learn to use this system very quickly. | Mabilis matututunan ng karamihang may-ari ng tindahan ang sistemang ito. |
| 8 | I found the AI review and quantity correction process very cumbersome. | Mabigat o nakakapagod i-koreksyon ang dami at mga mungkahi ng AI bago ibenta. |
| 9 | I felt very confident using the AI scanner at the counter. | Kampante at may tiwala ako habang ginagamit ang AI scanner sa harap ng mamimili. |
| 10 | I needed to learn a lot of things before I could get going with this AI system. | Marami pa akong kinailangang aralin bago ko nagamit nang maayos ang AI. |

### Scoring Formula:
* For odd items ($1, 3, 5, 7, 9$): Score contribution = $\text{User Response} - 1$.
* For even items ($2, 4, 6, 8, 10$): Score contribution = $5 - \text{User Response}$.
* Final SUS Score = $\left(\sum \text{Contributions}\right) \times 2.5$ (Range: 0–100; >68 is above average, >80 is excellent).

---

## 4. Limitations and Ethical Considerations

1. **Cloud Vision & Data Policy:**
   * The Gemini Vision provider transmits compressed images over HTTPS to Google APIs. Under Google's free-tier Terms of Service, anonymized data may be sampled for model tuning. Store owners must be informed via the First-Use Consent Dialog before enabling AI features.
2. **Privacy & No Human Faces:**
   * Images must strictly focus on goods and counter items. Cashiers are instructed never to frame customer or staff faces. The system includes preflight warnings reminding operators of this rule.
3. **Human-in-the-Loop Safeguard:**
   * AI detections are never auto-committed to financial transactions. The `BasketReviewSheet` and `AiProductReviewTable` enforce explicit human verification of quantities, prices, and line items.
4. **Economic & Inventory Impact:**
   * False-negative detections (missed items) risk inventory shrinkage if cashiers rely blindly on camera input. Explicit item-stepper verification and stock validation safeguards prevent negative inventory states.
