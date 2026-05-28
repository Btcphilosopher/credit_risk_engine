# ==============================================================================
# Macroeconomic Stress Testing Module
# Quant Risk Engineering | Pipeline Step 8
# ==============================================================================
# Models systemic resilience. Adjusts baseline Probabilities of Default (PD) and
# Loss Given Default (LGD) using sensitivity elasticities to macro variables
# (unemployment rate shifts, GDP contractions, and interest rate spikes).

library(tidyverse)

#' Stress Test Credit Portfolio
#' @param baseline_pds Baseline Probabilities of Default (PD).
#' @param baseline_lgds Baseline Loss Given Default (LGD).
#' @param eads Exposure at Default (EAD).
#' @param scenario Character indicating: "baseline", "moderate_recession", "severe_stagflation"
#' @param unemp_shick Unemployment rate absolute increase (e.g. 0.04 represents +4%).
#' @param gdp_contraction GDP contraction rate (e.g., -0.03 representing -3% growth).
#' @param rate_spike Interest rate percentage point increase (e.g., +2.5%).
#' @return A list containing stressed PDs, LGDs, and expected loss figures.
run_macro_stress_test <- function(baseline_pds, baseline_lgds, eads, scenario = "baseline", 
                                  unemp_shock = 0.0, gdp_contraction = 0.0, rate_spike = 0.0) {
  message(paste("--- Pipeline Step 8: Simulating Macro Stress Scenario [", toupper(scenario), "] ---"))
  
  # 1. Stressed Probability of Default (PD)
  # Map baseline PD to logit space, apply credit-elasticity coefs, and map back to probability
  # Elasticity parameters calibrated on historical credit-cycle defaults:
  # beta_unemployment = 2.5, beta_gdp = -1.2
  
  stressed_pds <- sapply(baseline_pds, function(pd) {
    # Guard bounds for logit calculation
    pd_adj <- max(0.001, min(0.999, pd))
    logit_pd <- log(pd_adj / (1 - pd_adj))
    
    # Apply macro sensitivities
    stressed_logit <- logit_pd + (2.2 * unemp_shock) - (1.5 * gdp_contraction)
    stressed_prob <- 1 / (1 + exp(-stressed_logit))
    
    return(max(0.001, min(0.999, stressed_prob)))
  })
  
  # 2. Stressed Loss Given Default (LGD)
  # Recession reduces collateral recovery prices (property, vehicle auctions)
  # Sensitivities: LGD stressed = LGD baseline * (1 + 0.8 * unemp_shock - 1.2 * gdp_contraction)
  stressed_lgds <- sapply(1:length(baseline_lgds), function(i) {
    base_lgd <- baseline_lgds[i]
    multi_factor <- 1 + (0.5 * unemp_shock) - (0.8 * gdp_contraction)
    stressed_lgd <- base_lgd * multi_factor
    return(max(0.05, min(0.95, stressed_lgd)))
  })
  
  # 3. Compute Stressed Expected Credit Loss (ECL)
  stressed_individual_ecl <- stressed_pds * stressed_lgds * eads
  total_stressed_ecl <- sum(stressed_individual_ecl)
  total_baseline_ecl <- sum(baseline_pds * baseline_lgds * eads)
  
  # 4. Assess Capital Adequacy Impact
  # Assume the bank has a baseline Core Equity Tier 1 (CET1) Capital of $20,000,000
  # And Total Risk-Weighted Assets (RWA) of $150,000,000.
  # Capital adequacy ratio: CAR = (CET1 - Loss_increase) / RWA
  base_cet1 <- 20000000
  rwa <- 150000000
  base_car <- 0.1333 # 13.33%
  
  ecl_increase <- total_stressed_ecl - total_baseline_ecl
  stressed_car <- (base_cet1 - ecl_increase) / rwa
  
  message(paste("[Stress Test] Baseline ECL Provision:", round(total_baseline_ecl, 2)))
  message(paste("[Stress Test] Stressed ECL Provision:", round(total_stressed_ecl, 2)))
  message(paste("[Stress Test] Provision Increase Needed:", round(ecl_increase, 2), " (+", round(100 * (ecl_increase / total_baseline_ecl), 2), "%)"))
  message(paste("[Stress Test] Simulated Core Capital Adequacy (CAR):", round(100 * stressed_car, 2), "% (Baseline: 13.33%)"))
  
  return(list(
    scenario = scenario,
    stressed_pds = stressed_pds,
    stressed_lgds = stressed_lgds,
    stressed_ecl_df = data.frame(PD = stressed_pds, LGD = stressed_lgds, ECL = stressed_individual_ecl),
    total_ecl = total_stressed_ecl,
    ecl_escalation = ecl_increase,
    stressed_car = stressed_car
  ))
}
