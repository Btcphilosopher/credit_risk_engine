# Credit Risk Analytics Engine in R
### Loan Default Prediction, Credit Scoring, and Portfolio Credit Loss Simulation

This directory contains a **reproducible, bank-grade quant risk engine** written entirely in R. It covers the full lifecycle of credit risk modeling—from data preprocessing to Probability of Default (PD), Loss Given Default (LGD), and Exposure at Default (EAD) estimations, culminating in a Basel-style Expected Credit Loss (ECL), FICO credit score conversions, Gaussian Copula portfolio tail risk simulations, and stress-testing under macro shocks.

---

## 📂 Project Structure

```
credit-risk-engine/
│
├── data/
│   └── loans.csv                # Sample borrower and active loan ledger
│
├── scripts/
│   ├── preprocessing.R          # Missing value imputations, factor encodings & outlier winsorization
│   ├── pd_model.R               # Logistic, Penalized (Lasso/Ridge), and XGBoost default probability models
│   ├── lgd_model.R              # Bounded recovery and collateral valuation models (Beta regression & heuristics)
│   ├── ead_model.R              # Exposure calculations using credit conversion factors (CCF)
│   ├── ecl_engine.R             # expected credit loss calculator: ECL = PD * LGD * EAD
│   ├── scoring.R                # Log-odds scale translation into FICO score (300-850) and Rating Grades
│   ├── portfolio.R              # Gaussian Copula Monte Carlo simulation for correlation tail risk (VaR & ES)
│   ├── stress_testing.R         # Logit macro cycle regressions for GDP and Unemployment spikes
│   └── visualization.R          # ggplot2 generator for risk distributions, curves & charts
│
├── main.R                       # Main orchestration runner / pipeline compiler
└── README.md                    # Regulatory & Quantitative methodology reference
```

---

## 🧮 Theoretical Background

Banks analyze credit risk to estimate capital reserves under regulatory frameworks such as **IFRS 9**, **CECL**, and **Basel III**.

### 1. Expected Credit Loss (ECL) Framework
ECL is the core metric used to provisions balances for upcoming credit write-offs:
$$\text{ECL} = \text{PD} \times \text{LGD} \times \text{EAD}$$

*   **Probability of Default (PD)**: The probability a borrower defaults within a given time horizon.
*   **Loss Given Default (LGD)**: The percentage of outstanding balance written off permanently, net of collateral recovery: 
    $$\text{LGD} = 1 - \text{Recovery Rate}$$
*   **Exposure at Default (EAD)**: The total outstanding dollar value exposed when the default is triggered. For revolving products, it combines the drawn balance with a **Credit Conversion Factor (CCF)** applied to undrawn credit limits:
    $$\text{EAD} = \text{Drawn Balance} + \text{Undrawn Limit} \times \text{CCF}$$

### 2. Credit Score Conversion
 Continuous probabilities of default (PD) are converted to a standard FICO scorecard (300 to 850 range) using a **logistic calibration** that maps non-defaulting odds:
$$\text{Odds} = \frac{1 - \text{PD}}{\text{PD}}$$
$$\text{Credit Score} = \text{Offset} + \text{Factor} \times \ln(\text{Odds})$$

`Offset` and `Factor` are calibrated based on **Points to Double the Odds (PDO)**. If we set a score of 600 to represent odds of 20:1, and a PDO of 50:
$$\text{Factor} = \frac{\text{PDO}}{\ln(2)}$$
$$\text{Offset} = \text{Base Score} - \text{Factor} \times \ln(\text{Base Odds})$$

### 3. Portfolio Credit Risk & Default Correlations
 defaults are not independent. Correlated failures occur under systemic stress (e.g., market crashes). 
We use the **Vasicek Single-Risk-Factor (Gaussian Copula)** framework. A borrower $i$ defaults if their latent asset return $X_i$ falls below their default threshold $Z_i = \Phi^{-1}(PD_i)$.
The latent return is modeled as:
$$X_i = \sqrt{\rho} Z + \sqrt{1 - \rho} \epsilon_i$$

*   $Z \sim N(0,1)$ is the global systemic macroeconomic factor (common to all borrowers).
*   $\epsilon_i \sim N(0,1)$ is the borrower's idiosyncratic risk.
*   $\rho$ is the asset correlation parameter.

By conducting **Monte Carlo simulations**, we build the portfolio loss distribution and calculate:
*   **Value at Risk (VaR 99%)**: The worst loss expected at a 99% confidence level.
*   **Expected Shortfall (ES 99%)**: The average credit loss given that the loss has exceeded the 99% VaR.

---

## 🚀 How to Execute the Pipeline

Ensure R and its package management dependencies are installed, then run the orchestration script:

```bash
# Clone or navigate to the repository
cd credit-risk-engine/

# Execute the complete credit risk pipeline
Rscript main.R
```

---

## 📊 Model Interpretation & User Guide

### 1. Risk Ratings & Score Interpretation
*   **A-Grade (Scores 720–850)**: Prime quality. Extremely low defaults ($<1\%$). Standard pricing recommended (base rate + tiny risk premium).
*   **B-Grade (Scores 660–719)**: Near-prime quality. Moderate default probability. Solid collateral coverage required.
*   **C-Grade (Scores 600–659)**: Subprime Tier-1. Susceptible to macro downturns. Requires tighter debt covenants.
*   **D-Grade (Scores 500–599)**: Subprime Tier-2. High defaults ($15\%-30\%$). Premium risk-pricing required.
*   **E-Grade (Scores 300–499)**: Near-default / Deep Subprime. Standard underwriting rejects these candidates.

### 2. Risk-Based Pricing Formula
Banks price loans so that healthy assets cross-subsidize defaults:
$$\text{Recommended APR} = \text{Cost of Funds} + \text{Operational Markup} + (\text{PD} \times \text{LGD}) + \text{Capital reserves charge}$$

---

## 🛠️ Limitations & Future Improvements

1.  **Macroeconomic Sensitivity Limitations**: Simple logit shifts on PD may underestimate tail risks in unprecedented, non-linear Black Swan events.
2.  **Model Drift**: Credit scores are static snapshots. To prevent credit scoring models from becoming stale as borrower behavior shifts (drift), dynamic **Population Stability Index (PSI)** and **Characteristic Analysis Index** should be conducted quarterly.
3.  **Alternative Data Ingestion**: Traditional scorecards omit rental ledger history or asset flows. Incorporating machine learning models (XGBoost) with SHAP value interpretation helps expand the credit perimeter without compromising transparency.
