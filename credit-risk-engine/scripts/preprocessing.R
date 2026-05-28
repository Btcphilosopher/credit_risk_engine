# ==============================================================================
# Credit Risk Preprocessing Module
# Quant Risk Engineering | Pipeline Step 1
# ==============================================================================
# Focuses on missing value handling, categorical encoding, scaling/normalization,
# and outlier detection using the tidyverse and caret packages.

library(tidyverse)
library(caret)

#' Preprocess Credit Raw Data
#' @param data A data.frame containing credit dataset.
#' @return A preprocessed list with scaling params, clean dataset, and outliers.
preprocess_credit_data <- function(data) {
  message("--- Pipeline Step 1: Preprocessing Borrower and Loan Data ---")
  
  # 1. Missing Value Handling
  # Impute numeric variables with median and categoricals with mode
  data_clean <- data %>%
    mutate(
      income = ifelse(is.na(income), median(income, na.rm = TRUE), income),
      emp_length = ifelse(is.na(emp_length), median(emp_length, na.rm = TRUE), emp_length),
      credit_hist_length = ifelse(is.na(credit_hist_length), median(credit_hist_length, na.rm = TRUE), credit_hist_length),
      dti = ifelse(is.na(dti), median(dti, na.rm = TRUE), dti),
      age = ifelse(is.na(age), median(age, na.rm = TRUE), age),
      interest_rate = ifelse(is.na(interest_rate), median(interest_rate, na.rm = TRUE), interest_rate)
    )
  
  # Impute categorical variables if list has NAs
  data_clean <- data_clean %>%
    mutate(
      home_ownership = ifelse(is.na(home_ownership) | home_ownership == "", "RENT", home_ownership),
      purpose = ifelse(is.na(purpose) | purpose == "", "personal", purpose)
    )
  
  # 2. Outlier Detection (Tukey's Fences method on DTI and Income)
  # Flag records but retain to prevent loss of signal (or cap them)
  q_inc <- quantile(data_clean$income, probs = c(0.25, 0.75), na.rm = TRUE)
  iqr_inc <- q_inc[2] - q_inc[1]
  upper_fence_inc <- q_inc[2] + 1.5 * iqr_inc
  lower_fence_inc <- max(0, q_inc[1] - 1.5 * iqr_inc)
  
  data_clean <- data_clean %>%
    mutate(
      is_income_outlier = ifelse(income > upper_fence_inc | income < lower_fence_inc, 1, 0),
      # Cap extreme outlier income at upper fence (winsorization)
      income_capped = ifelse(income > upper_fence_inc, upper_fence_inc, income)
    )
  
  # 3. Categorical Factor Conversions
  # R handles model dummy generation natively via factors, but we can explicit convert
  data_clean$home_ownership <- as.factor(data_clean$home_ownership)
  data_clean$purpose <- as.factor(data_clean$purpose)
  data_clean$default <- as.factor(data_clean$default) # target as classification factor
  
  # 4. Standardizing and Normalizing Numeric Predictors
  # Save scaling parameters for testing datasets/new borrower scores
  scale_cols <- c("income_capped", "dti", "emp_length", "credit_hist_length", "loan_amount", "age")
  preProc_obj <- preProcess(data_clean[, scale_cols], method = c("center", "scale"))
  
  # Apply normalization
  data_scaled <- predict(preProc_obj, data_clean)
  
  message(paste("[Preprocessing] Records processed:", nrow(data_scaled)))
  message(paste("[Preprocessing] Outliers flagged in income:", sum(data_scaled$is_income_outlier)))
  
  return(list(
    scaled_data = data_scaled,
    clean_data = data_clean,
    scale_obj = preProc_obj,
    scale_cols = scale_cols,
    upper_fence_inc = upper_fence_inc
  ))
}
