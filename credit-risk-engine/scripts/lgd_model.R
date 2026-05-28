# ==============================================================================
# Loss Given Default (LGD) Model
# Quant Risk Engineering | Pipeline Step 3
# ==============================================================================
# Models LGD, reflecting how much outstanding debt is lost permanently during default,
# incorporating collateral values, asset class recovery norms, and structural heuristics.

library(tidyverse)

#' Estimate LGD based on loan and collateral characteristics
#' @param data Borrowers and loans dataset.
#' @param model_type "linear", "beta", or "heuristic"
#' @return Numeric vector of LGD ratios (0 to 1 scale).
calculate_lgd <- function(data, model_type = "heuristic") {
  message(paste("--- Pipeline Step 3: Running LGD Model (Type:", model_type, ") ---"))
  
  n <- nrow(data)
  
  if (model_type == "heuristic") {
    # Real-world collateral/purpose heuristic guidelines:
    # 1. Mortgage: Highly collateralized. LGD is low, depending on estimated Loan-To-Value (LTV).
    # 2. Car: Moderately collateralized by vehicle. Rapid depreciation exists.
    # 3. Personal: Unsecured. Higher LGD, minimal collateral recovery.
    # 4. Business: Mixed inventory, cash registers, or director guarantees.
    
    lgd <- sapply(1:n, function(i) {
      purpose <- as.character(data$purpose[i])
      home <- as.character(data$home_ownership[i])
      dti_val <- data$dti[i]
      
      base_lgd <- switch(purpose,
        "mortgage" = 0.20, # 20% loss (80% recovery bank-sale)
        "car"      = 0.45, # 45% loss (vehicle auction recovers some portion)
        "business" = 0.55, # 55% loss base
        "personal" = 0.75, # 75% loss base
        0.70 # Default base
      )
      
      # Adjustments based on ownership and solvency (DTI)
      # Home owners who rent are riskier on Recovery than absolute owners.
      if (home == "OWN" && purpose == "mortgage") {
        base_lgd <- base_lgd - 0.05 # Lower loss, ownership signal is strong
      } else if (home == "RENT") {
        base_lgd <- base_lgd + 0.05 # Higher LGD due to lower recovery anchors
      }
      
      # Solvency adjustment
      if (dti_val > 35) {
        base_lgd <- base_lgd + 0.05 # Harder to collect from heavily indebted borrowers
      }
      
      # Bound recovery losses between 0.05 and 0.95 (conservative boundaries)
      return(max(0.05, min(0.95, base_lgd)))
    })
    
  } else if (model_type == "linear") {
    # Fitted OLS model simulating standard modeling
    # Synthesize linear response model
    intercept <- 0.65
    lgd <- intercept - 0.25 * (data$purpose == "mortgage") - 
      0.10 * (data$purpose == "car") + 
      0.08 * (data$home_ownership == "RENT") + 
      0.002 * data$dti
    
    lgd <- sapply(lgd, function(val) max(0.05, min(0.95, val)))
    
  } else if (model_type == "beta") {
    # Beta regression is the mathematical standard for LGD because recovery rates
    # are strictly bounded between (0, 1) and exhibit custom double-humped distributions.
    # In R, beta regression is typically set up via library(betareg).
    # Here, we simulate a beta regression density mapping function for precision.
    message("[LGD Beta Model] Applying logit-link beta mapping parameters...")
    
    lgd <- sapply(1:n, function(i) {
      # Logit scale predictor: eta
      x_beta <- 0.8 - 1.5 * (data$purpose[i] == "mortgage") - 
        0.5 * (data$purpose[i] == "car") + 
        0.3 * (data$home_ownership[i] == "RENT") +
        0.005 * data$dti[i]
      
      # Inverse logit mapping
      mu <- 1 / (1 + exp(-x_beta))
      return(max(0.05, min(0.95, mu)))
    })
  } else {
    stop("Unknown LGD model type specified.")
  }
  
  message(paste("[LGD Model] Average estimated recovery rate:", round(100 * (1 - mean(lgd)), 2), "%"))
  message(paste("[LGD Model] Average estimated loss rate (LGD):", round(100 * mean(lgd), 2), "%"))
  return(lgd)
}
