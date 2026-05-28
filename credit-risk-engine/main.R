# ==============================================================================
# Credit Risk Modeling Engine - Orchestration Entry Point
# Quant Risk Engineering Group | Reproducible Financial Pipeline
# ==============================================================================
# Main orchestration script to load dependencies, source components, ingest data,
# model PD/LGD/EAD, compute expected losses, run portfolio Monte Carlo copulas,
# perform macro stress-testing, and output the final bank risk reports.

# 1. Pipeline Verification and Environment Setup
message("Initializing bank-grade Credit Risk Analytical Process...")

# Required packages
required_packages <- c("tidyverse", "caret", "glmnet")
missing_packages <- required_packages[!(required_packages %in% installed.packages()[,"Package"])]
if (length(missing_packages) > 0) {
  message("Installing missing packages: ", paste(missing_packages, collapse = ", "))
  install.packages(missing_packages, repos = "https://cloud.r-project.org")
}

library(tidyverse)
library(caret)

# 2. Source Subsections / Modules
scripts_dir <- "scripts/"
source(paste0(scripts_dir, "preprocessing.R"))
source(paste0(scripts_dir, "pd_model.R"))
source(paste0(scripts_dir, "lgd_model.R"))
source(paste0(scripts_dir, "ead_model.R"))
source(paste0(scripts_dir, "ecl_engine.R"))
source(paste0(scripts_dir, "scoring.R"))
source(paste0(scripts_dir, "portfolio.R"))
source(paste0(scripts_dir, "stress_testing.R"))
source(paste0(scripts_dir, "visualization.R"))

# 3. Ingest Loans Ledger
data_file <- "data/loans.csv"
if (!file.exists(data_file)) {
  stop("Missing loan data package at data/loans.csv.")
}

loans_df <- read_csv(data_file, show_col_types = FALSE)
message("Ingested ", nrow(loans_df), " active client accounts from credit ledger.")

# 4. Step 1: Data Preprocessing
prep_results <- preprocess_credit_data(loans_df)
df_scaled <- prep_results$scaled_data
df_clean <- prep_results$clean_data

# 5. Step 2: Probability of Default (PD) Modeling
# In this execution we use the highly robust logistic regression baseline
pd_model <- train_pd_model(df_scaled, method = "logistic")

# Generate standard out-of-sample default probabilities (on training set for illustration)
# Target level is the probability of the default class "Default" (2nd column usually)
predicted_pds <- predict(pd_model, df_scaled, type = "prob")[, "Default"]

# Categorize risk bands
risk_classes <- classify_risk_band(predicted_pds)

# 6. Step 3: Loss Given Default (LGD) Modeling
# Applying heuristic/collateralized asset parameters (e.g., mortgage vs. personal)
calculated_lgds <- calculate_lgd(df_clean, model_type = "heuristic")

# 7. Step 4: Exposure at Default (EAD) Modeling
calculated_eads <- calculate_ead(df_clean, product_type = "term_loan")

# 8. Step 5: Expected Credit Loss (ECL) Calculation
ecl_output <- compute_ecl(predicted_pds, calculated_lgds, calculated_eads)
df_ecl <- ecl_output$loan_ecl_df

# 9. Step 6: Credit Scorecard Calibration (300 - 850 FICO equivalent)
fico_scores <- map_pd_to_fico(predicted_pds, base_score = 620, base_odds = 25, pdo = 50)
rating_grades <- assign_rating_grade(fico_scores)

# Add metrics back to master borrower ledger
df_ledger <- df_clean %>%
  mutate(
    Predicted_PD = round(predicted_pds, 4),
    LGD = round(calculated_lgds, 3),
    EAD = round(calculated_eads, 2),
    ECL = round(df_ecl$ECL, 2),
    FICO_Score = FICO_Score,
    Rating = rating_grades,
    Risk_Band = risk_classes
  )

# 10. Step 7: Portfolio Monte Carlo Simulation (Gaussian Copula)
# Basel recommendation asset correlation (rho = 15% system risk)
portfolio_risk <- simulate_portfolio_credit_loss(
  pds = predicted_pds,
  lgds = calculated_lgds,
  eads = calculated_eads,
  asset_corr = 0.15,
  num_simulations = 2000
)

# Assess borrower purpose clusters (Concentration of risk)
concentration <- calculate_concentration_risk(df_clean, calculated_eads)

# 11. Step 8: Macroeconomic Stress Testing (Simulating Stress Scenarios)
# Recession Scenario (+4% Unemployment Increase, -3% GDP Growth contraction)
recession_stress <- run_macro_stress_test(
  baseline_pds = predicted_pds,
  baseline_lgds = calculated_lgds,
  eads = calculated_eads,
  scenario = "moderate_recession",
  unemp_shock = 0.04,
  gdp_contraction = -0.03
)

# Severe Stagflation Scenario (+7% Unemployment, -5% GDP contraction, and rate spikes)
stagflation_stress <- run_macro_stress_test(
  baseline_pds = predicted_pds,
  baseline_lgds = calculated_lgds,
  eads = calculated_eads,
  scenario = "severe_stagflation",
  unemp_shock = 0.07,
  gdp_contraction = -0.05
)

# 12. Create and Save Regulatory Visualizations
plot_pd_distribution(predicted_pds, "pd_distribution_plot.png")
plot_scorecard_bands(fico_scores, "fico_classes_plot.png")
plot_stress_comparison(
  baseline_ecl = ecl_output$total_ecl,
  mod_recession_ecl = recession_stress$total_ecl,
  severe_stag_ecl = stagflation_stress$total_ecl,
  filename = "stress_test_comparison_plot.png"
)

# 13. Output Final Credit Risk Audit Report Summary
cat("\n")
cat("======================================================================\n")
cat("                 REGULATORY CREDIT RISK ENGINE RECONCILIATION RESULT  \n")
cat("======================================================================\n")
cat(paste("Total Underwritten Exposure (EAD): $", round(ecl_output$total_ead, 2), "\n"))
cat(paste("Expected Credit Loss Provisoning:  $", round(ecl_output$total_ecl, 2), "\n"))
cat(paste("Portfolio Weighted Average PD:      ", round(100*ecl_output$weighted_pd, 2), "%\n"))
cat(paste("Portfolio Weighted Average LGD:     ", round(100*ecl_output$weighted_lgd, 2), "%\n"))
cat(paste("Herfindahl Index concentration:     ", round(concentration$hhi, 5), "\n"))
cat("----------------------------------------------------------------------\n")
cat("Portfolio Tail Risk (Gaussian Copula MC results):\n")
cat(paste("  - 99% Value-at-Risk (VaR):        $", round(portfolio_risk$var_99, 2), "\n"))
cat(paste("  - 99% Expected Shortfall (ES):    $", round(portfolio_risk$es_99, 2), "\n"))
cat("----------------------------------------------------------------------\n")
cat("Macro stress test ECL provisions impact:\n")
cat(paste("  - Baseline Mode:                  $", round(ecl_output$total_ecl, 2), "\n"))
cat(paste("  - Moderate Recession (+4% u/e):   $", round(recession_stress$total_ecl, 2), "\n"))
cat(paste("  - Severe Stagflation (+7% u/e):   $", round(stagflation_stress$total_ecl, 2), "\n"))
cat("======================================================================\n")
message("Pipeline completed fully. Diagnostics saved locally.")
