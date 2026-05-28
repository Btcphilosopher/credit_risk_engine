# ==============================================================================
# Exposure At Default (EAD) Model
# Quant Risk Engineering | Pipeline Step 4
# ==============================================================================
# Evaluates total capital exposed on the date default occurs. For standard loans,
# this tracks principal drawdown. For revolving products/business credit lines,
# we apply a Credit Conversion Factor (CCF) to measure undrawn drawdowns.

library(tidyverse)

#' Calculate Exposure at Default (EAD)
#' @param data Borrowers and loans dataset.
#' @param product_type "term_loan" or "revolving"
#' @param default_ccf Credit Conversion Factor (CCF) for unused lines (0 to 1). Default 0.40.
#' @return Numeric vector of EAD dollar amounts.
calculate_ead <- function(data, product_type = "term_loan", default_ccf = 0.40) {
  message(paste("--- Pipeline Step 4: Assessing EAD (Product Type:", product_type, ") ---"))
  
  n <- nrow(data)
  
  # Base remaining balance is typically modeled as a function of repayment schedule.
  # If a borrower has a long history, they've paid down some principal.
  # Let's assess: remaining_balance = loan_amount * (1 - (emp_length / max(emp_length, 10)) * 0.2)
  # Limit of paid down is conservative.
  
  ead <- sapply(1:n, function(i) {
    loan_amt <- data$loan_amount[i]
    term_months <- data$term[i]
    repay_score <- data$repayment_score[i] # 1 to 100 indicator
    
    # Calculate expected remaining utilization
    # Borrowers with poor repayment score (closer to default) usually tap more credit
    util_rate <- 1.0
    if (repay_score < 50) {
      util_rate <- 0.95 # Drew down almost everything
    } else {
      util_rate <- 0.75 - (repay_score - 50) * 0.005 # Paid down more if higher score
    }
    util_rate <- max(0.40, min(1.0, util_rate))
    
    remaining_balance <- loan_amt * util_rate
    
    # For revolving lines (like business/personal cards), they could draw down more
    # CCF determines how much of the unutilized limit will be drawn down pre-default
    if (product_type == "revolving") {
      credit_limit <- loan_amt * 1.3 # Hypothetical credit limit
      undrawn_limit <- credit_limit - remaining_balance
      ccf_adjustment <- undrawn_limit * default_ccf
      total_ead <- remaining_balance + ccf_adjustment
    } else {
      # For a fixed term loan: remaining principal balance + typical delinquent interest accrual (e.g., 2% buffer)
      total_ead <- remaining_balance * 1.02
    }
    
    return(round(total_ead, 2))
  })
  
  message(paste("[EAD Model] Total portfolio limit:", sum(data$loan_amount)))
  message(paste("[EAD Model] Total exposure at default (EAD):", sum(ead)))
  message(paste("[EAD Model] Portfolio-wide EAD-to-Limit Ratio:", round(100 * sum(ead) / sum(data$loan_amount), 2), "%"))
  
  return(ead)
}
