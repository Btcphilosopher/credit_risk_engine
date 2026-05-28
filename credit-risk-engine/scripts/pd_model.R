# ==============================================================================
# Probability of Default (PD) Model
# Quant Risk Engineering | Pipeline Step 2
# ==============================================================================
# Trains and fits multiple probability models (Logistic, Lasso, Random Forest, XGBoost)
# to predict the likelihood a borrower default occurs.

library(tidyverse)
library(caret)

#' Train Probability of Default Model
#' @param train_data Preprocessed training dataframe.
#' @param method Character designating model: "logistic", "lasso", "ridge", "rf", "xgboost"
#' @return A model object with training logs.
train_pd_model <- function(train_data, method = "logistic") {
  message(paste("--- Pipeline Step 2: Training", method, "PD Model ---"))
  
  # Ensure target is factor
  train_data$default <- as.factor(train_data$default)
  
  # Set up cross-validation parameters
  fit_control <- trainControl(
    method = "cv",
    number = 5,
    classProbs = TRUE,
    summaryFunction = twoClassSummary # ROC metric tuning
  )
  
  # Convert target levels to valid R variable names for caret
  levels(train_data$default) <- c("NonDefault", "Default")
  
  # Define predictors (excluding ID fields and helper flags)
  formula <- default ~ income_capped + emp_length + credit_hist_length + dti + loan_amount + age + home_ownership + purpose
  
  model <- NULL
  
  if (method == "logistic") {
    model <- train(
      formula,
      data = train_data,
      method = "glm",
      family = "binomial",
      metric = "ROC",
      trControl = fit_control
    )
  } else if (method == "lasso") {
    # glmnet implements penalized regression. alpha = 1 for Lasso.
    tune_grid <- expand.grid(alpha = 1, lambda = seq(0.001, 0.1, by = 0.01))
    model <- train(
      formula,
      data = train_data,
      method = "glmnet",
      metric = "ROC",
      tuneGrid = tune_grid,
      trControl = fit_control
    )
  } else if (method == "ridge") {
    # alpha = 0 for Ridge
    tune_grid <- expand.grid(alpha = 0, lambda = seq(0.001, 0.1, by = 0.01))
    model <- train(
      formula,
      data = train_data,
      method = "glmnet",
      metric = "ROC",
      tuneGrid = tune_grid,
      trControl = fit_control
    )
  } else if (method == "rf") {
    tune_grid <- expand.grid(mtry = c(2, 4))
    model <- train(
      formula,
      data = train_data,
      method = "rf",
      metric = "ROC",
      tuneGrid = tune_grid,
      trControl = fit_control,
      ntree = 100
    )
  } else if (method == "xgboost") {
    # Compact grid to ensure quick local build
    tune_grid <- expand.grid(
      nrounds = 50,
      max_depth = c(3, 5),
      eta = c(0.01, 0.1),
      gamma = 0,
      colsample_bytree = 0.8,
      min_child_weight = 1,
      subsample = 0.8
    )
    model <- train(
      formula,
      data = train_data,
      method = "xgbTree",
      metric = "ROC",
      tuneGrid = tune_grid,
      trControl = fit_control,
      verbose = FALSE
    )
  } else {
    stop("Unknown modeling methodology choice.")
  }
  
  message("[PD Model] Model training completed successfully.")
  return(model)
}

#' Classify borrower risks based on PD score thresholds
#' @param pd Numeric vector of default probabilities
#' @return Character vector indicating 'Low Risk', 'Medium Risk', or 'High Risk'
classify_risk_band <- function(pd) {
  case_when(
    pd < 0.05 ~ "Low Risk",
    pd < 0.20 ~ "Medium Risk",
    TRUE      ~ "High Risk"
  )
}
