# ==============================================================================
# Credit Scorecard Mapping Module
# Quant Risk Engineering | Pipeline Step 6
# ==============================================================================
# Translates continuous probabilities of default (PD) into intuitive FICO-style credit
# scores ranging from 300 to 850, defining investment rating bands (A through E).

library(tidyverse)

#' Map Probability of Default (PD) to FICO-style Credit Score
#' @param pd Numeric vector of probabilities (between 0.0001 and 0.9999).
#' @param base_score Baseline score, e.g., 600 points.
#' @param base_odds Target odds at base score (e.g., 50 to 1 odds of non-default).
#' @param pdo Points to Double the Odds, typically 20 or 50.
#' @return Numeric vector of credit scores capped between 300 and 850.
map_pd_to_fico <- function(pd, base_score = 600, base_odds = 20, pdo = 50) {
  message("--- Pipeline Step 6: Calibrating PD scorecards to FICO-scale (300-850) ---")
  
  # Avoid log of zero or infinity by adding extreme bounds
  pd_adj <- papply <- sapply(pd, function(p) max(0.0001, min(0.9999, p)))
  
  # Odds = (1 - PD) / PD (Odds of non-defaulting)
  odds <- (1 - pd_adj) / pd_adj
  
  # Factor = PDO / ln(2)
  factor_multiplier <- pdo / log(2)
  # Offset = Base_Score - Factor * ln(Base_Odds)
  offset_coef <- base_score - factor_multiplier * log(base_odds)
  
  # Credit Score = Offset + Factor * ln(Odds)
  scores <- offset_coef + factor_multiplier * log(odds)
  
  # Clean, integer round, and hard-cap within official FICO limits [300, 850]
  fico_scores <- sapply(scores, function(s) {
    rounded <- round(s)
    max(300, min(850, rounded))
  })
  
  return(fico_scores)
}

#' Map FICO credit scores to regulatory rating bands
#' @param score Numeric vector of credit scores (300 to 850 scale).
#' @return Character vector of credit ratings: 'A', 'B', 'C', 'D', 'E'
assign_rating_grade <- function(score) {
  case_when(
    score >= 720 ~ "A", # Prime (Excellent low risk)
    score >= 660 ~ "B", # Near-Prime (Good)
    score >= 600 ~ "C", # Subprime Tier-1 (Moderate)
    score >= 500 ~ "D", # Subprime Tier-2 (High Risk)
    TRUE         ~ "E"  # Default / Near-Default
  )
}

#' Pricing Engine: Establish risk-based interest rate recommendations
#' @param pd Probability of default.
#' @param lgd Loss given default.
#' @param cost_of_funds Base lending rate, e.g. 0.03 (3%).
#' @param target_margin Profit margin target, e.g. 0.02 (2%).
#' @param capital_charge Capital reserve penalty for credit tier.
#' @return Suggested loan APR.
recommend_interest_rate <- function(pd, lgd, cost_of_funds = 0.03, target_margin = 0.02, capital_charge = 0.015) {
  # Base risk-neutral pricing: Suggested APR = Cost of Funds + Target Margin + Expected Loss (PD * LGD) + Capital Charge
  expected_loss_premium <- pd * lgd
  suggested_apr <- cost_of_funds + target_margin + expected_loss_premium + capital_charge
  return(round(suggested_apr * 100, 2)) # return as percentage APR (e.g. 8.45%)
}
