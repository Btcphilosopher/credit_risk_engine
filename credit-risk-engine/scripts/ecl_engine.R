# ==============================================================================
# Expected Credit Loss (ECL) Calculator
# Quant Risk Engineering | Pipeline Step 5
# ==============================================================================
# Computes expected credit loss using the core regulatory credit formula:
# ECL = Probability of Default (PD) * Loss Given Default (LGD) * Exposure at Default (EAD)
# Generates aggregated balances, provisions, and metrics under standard conditions.

library(tidyverse)

#' Calculate Expected Credit Loss (ECL)
#' @param pd Vector of default probabilities (decimal 0 to 1).
#' @param lgd Vector of loss given default percentages (decimal 0 to 1).
#' @param ead Vector of exposure amounts (dollar scale).
#' @return A data.frame with individual ECL metrics and total sums.
compute_ecl <- function(pd, lgd, ead) {
  message("--- Pipeline Step 5: Executing Expected Credit Loss (ECL) Engine ---")
  
  if (length(pd) != length(lgd) || length(pd) != length(ead)) {
    stop("Input score vectors (PD, LGD, EAD) must have identical lengths.")
  }
  
  # Structural formula execution
  individual_ecl <- pd * lgd * ead
  
  # Calculate aggregate statistics
  total_ead <- sum(ead)
  total_ecl <- sum(individual_ecl)
  weighted_pd <- sum(pd * ead) / total_ead
  weighted_lgd <- sum(lgd * ead) / total_ead
  
  message(paste("[ECL Engine] Aggregated Portfolio EAD:", round(total_ead, 2)))
  message(paste("[ECL Engine] Total Expected Credit Loss (ECL) Provision:", round(total_ecl, 2)))
  message(paste("[ECL Engine] Portfolio Weighted Average PD:", round(100 * weighted_pd, 2), "%"))
  message(paste("[ECL Engine] Portfolio Weighted Average LGD:", round(100 * weighted_lgd, 2), "%"))
  message(paste("[ECL Engine] Overall Provision Coverage Ratio:", round(100 * total_ecl / total_ead, 2), "%"))
  
  # Format detailed loans breakdown frame
  results <- data.frame(
    PD = pd,
    LGD = lgd,
    EAD = ead,
    ECL = round(individual_ecl, 2),
    CoverageRatio = round(individual_ecl / ead, 4)
  )
  
  return(list(
    loan_ecl_df = results,
    total_ead = total_ead,
    total_ecl = total_ecl,
    weighted_pd = weighted_pd,
    weighted_lgd = weighted_lgd
  ))
}
