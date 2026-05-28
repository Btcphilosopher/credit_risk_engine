# ==============================================================================
# Portfolio Credit Risk Simulation Module
# Quant Risk Engineering | Pipeline Step 7
# ==============================================================================
# Simulates full portfolio credit loss distributions using a Gaussian Capula model.
# Incorporates asset correlation (Vasicek framework) to calculate extreme tail risk
# parameters: Portfolio Value at Risk (VaR) and Expected Shortfall (ES).

library(tidyverse)

#' Run Gaussian Copula Portfolio Monte Carlo Simulation
#' @param pds Vector of borrower Probabilities of Default (PD).
#' @param lgds Vector of borrower Loss Given Default (LGD).
#' @param eads Vector of borrower Exposure at Default (EAD).
#' @param asset_corr Global asset correlation parameter (rho), e.g., 0.15 for Basel retail.
#' @param num_simutations Number of Monte Carlo trials. Default is 2500.
#' @return A list containing simulation statistics, loss distribution vectors, and VaR/ES.
simulate_portfolio_credit_loss <- function(pds, lgds, eads, asset_corr = 0.12, num_simulations = 2000) {
  message("--- Pipeline Step 7: Executing Gaussian Copula Portfolio Simulation ---")
  
  num_borrowers <- length(pds)
  portfolio_total_ead <- sum(eads)
  
  # Calculate asset return thresholds for each borrower: T_i = qnorm(PD_i)
  # A borrower defaults if their latent asset return falls below this threshold.
  thresholds <- qnorm(pds)
  
  # Vector to store total loss in each Monte Carlo trial
  simulated_portfolio_losses <- numeric(num_simulations)
  
  # Fix seed for reproducible simulation results
  set.seed(42)
  
  # Pre-calculate constants
  sqrt_rho <- sqrt(asset_corr)
  sqrt_one_minus_rho <- sqrt(1 - asset_corr)
  
  for (sim in 1:num_simulations) {
    # 1. Simulate the systemic market factor Z ~ N(0, 1)
    z <- rnorm(1)
    
    # 2. Simulate idiosyncratic factor for each borrower e_i ~ N(0, 1)
    epsilon <- rnorm(num_borrowers)
    
    # 3. Calculate latent asset return: X_i = sqrt_rho * Z + sqrt(1 - rho) * e_i
    asset_returns <- sqrt_rho * z + sqrt_one_minus_rho * epsilon
    
    # 4. Trigger default where return < individual threshold
    default_indices <- asset_returns < thresholds
    
    # 5. Compute total portfolio credit loss for this simulation trial
    trial_loss <- sum(default_indices * lgds * eads)
    simulated_portfolio_losses[sim] <- trial_loss
  }
  
  # Calculate Statistical Risk Metrics from simulated distribution
  expected_credit_loss_sim <- mean(simulated_portfolio_losses)
  
  # Value at Risk (VaR) at 99% and 95% confidence
  var_99 <- quantile(simulated_portfolio_losses, probs = 0.99)
  var_95 <- quantile(simulated_portfolio_losses, probs = 0.95)
  
  # Expected Shortfall (ES) at 99% (average loss in the worst 1% of trials)
  es_99 <- mean(simulated_portfolio_losses[simulated_portfolio_losses >= var_99])
  es_95 <- mean(simulated_portfolio_losses[simulated_portfolio_losses >= var_95])
  
  # Relative metrics (as % of total EAD)
  var_99_pct <- var_99 / portfolio_total_ead
  es_99_pct <- es_99 / portfolio_total_ead
  
  message(paste("[Portfolio Sim] Expected loss from simulation:", round(expected_credit_loss_sim, 2)))
  message(paste("[Portfolio Sim] 99% Value at Risk (VaR 99%):", round(var_99, 2), " (", round(100 * var_99_pct, 2), "% of book)"))
  message(paste("[Portfolio Sim] 99% Expected Shortfall (ES 99%):", round(es_99, 2), " (", round(100 * es_99_pct, 2), "% of book)"))
  
  return(list(
    sim_losses = simulated_portfolio_losses,
    expected_loss = expected_credit_loss_sim,
    var_99 = as.numeric(var_99),
    var_95 = as.numeric(var_95),
    es_99 = as.numeric(es_99),
    es_95 = as.numeric(es_95),
    var_99_pct = var_99_pct,
    es_99_pct = es_99_pct
  ))
}

#' Calculate Concentration Risk Metrics
#' @param data Borrowers data.frame.
#' @param eads Vector of Exposure at Default (EAD).
#' @return A list containing Herfindahl-Hirschman Index (HHI) and exposure distribution.
calculate_concentration_risk <- function(data, eads) {
  message("[Concentration Analyzer] Measuring portfolio vulnerability clusters...")
  
  total_exposure <- sum(eads)
  shares <- eads / total_exposure
  
  # Herfindahl-Hirschman Index (HHI) for borrower concentration
  # HHI ranges from 1/N to 1. A higher value implies higher concentration in few large loans.
  hhi <- sum(shares^2)
  
  # Sector concentration (categorized by loan purpose)
  sector_exposure <- tibble(
    purpose = data$purpose,
    ead = eads
  ) %>%
    group_by(purpose) %>%
    summarise(
      exposure = sum(ead),
      share = exposure / total_exposure
    ) %>%
    arrange(desc(exposure))
  
  return(list(
    hhi = hhi,
    sector_concentration = sector_exposure
  ))
}
