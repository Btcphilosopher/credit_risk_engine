import { useState } from 'react';
import { Folder, File, Copy, Check, ChevronRight, ChevronDown, Download, Terminal } from 'lucide-react';

interface CodeExplorerProps {
  onRunR: (scriptPath: string) => void;
}

export default function CodeExplorer({ onRunR }: CodeExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string>('README.md');
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedFolder, setExpandedFolder] = useState<boolean>(true);

  // Embedded perfect R scripts for browser viewing and instant copying
  const rProjectFiles: Record<string, { path: string; desc: string; isR: boolean; content: string }> = {
    'README.md': {
      path: 'credit-risk-engine/README.md',
      desc: 'Regulatory & Quantitative methodology reference',
      isR: false,
      content: `# Credit Risk Analytics Engine in R
### Loan Default Prediction, Credit Scoring, and Portfolio Credit Loss Simulation

This directory contains a reproducible, bank-grade quant risk engine written in R. 
It covers the full lifecycle of credit risk modeling—from preprocessing to Expected Credit Loss (ECL), 
Gaussian Copula tail risk simulations, and stress-testing under macro shocks.

### Core Mathematical Framework:
- expected credit loss: ECL = PD * LGD * EAD
- FICO scorecard logit calibration: Score = Offset + Factor * ln(Odds)
- Gaussian Copula systemic return: Xi = sqrt(rho)*Z + sqrt(1-rho)*Ei
`
    },
    'main.R': {
      path: 'credit-risk-engine/main.R',
      desc: 'Orchestrates the entire analytical credit model pipeline',
      isR: true,
      content: `# ==============================================================================
# Credit Risk Modeling Engine - Orchestration Entry Point
# Quant Risk Engineering Group | Reproducible Financial Pipeline
# ==============================================================================
library(tidyverse)
library(caret)

# Source Subsections
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

# Ingest and Process Loans Ledger
loans_df <- read_csv("data/loans.csv")
prep_results <- preprocess_credit_data(loans_df)

# Train baseline Logistic PD Model
pd_model <- train_pd_model(prep_results$scaled_data, method = "logistic")
predicted_pds <- predict(pd_model, prep_results$scaled_data, type = "prob")[, "Default"]

# Calculate core metrics: LGD, EAD, ECL
calculated_lgds <- calculate_lgd(prep_results$clean_data, model_type = "heuristic")
calculated_eads <- calculate_ead(prep_results$clean_data, product_type = "term_loan")
ecl_output <- compute_ecl(predicted_pds, calculated_lgds, calculated_eads)

# Calibrate Scorecard
fico_scores <- map_pd_to_fico(predicted_pds, base_score = 620, base_odds = 25, pdo = 50)
rating_grades <- assign_rating_grade(fico_scores)

# Run Portfolio Copula Simulation
portfolio_risk <- simulate_portfolio_credit_loss(predicted_pds, calculated_lgds, calculated_eads, asset_corr = 0.15)
`
    },
    'preprocessing.R': {
      path: 'credit-risk-engine/scripts/preprocessing.R',
      desc: 'Imputation, Winsorization, factorizing, and scaling',
      isR: true,
      content: `library(tidyverse)
library(caret)

preprocess_credit_data <- function(data) {
  # 1. Missing Value Medians Imputation
  data_clean <- data %>%
    mutate(
      income = ifelse(is.na(income), median(income, na.rm = TRUE), income),
      emp_length = ifelse(is.na(emp_length), median(emp_length, na.rm = TRUE), emp_length),
      dti = ifelse(is.na(dti), median(dti, na.rm = TRUE), dti)
    )
  
  # 2. Tukey Outlier detection & Winsorization
  q_inc <- quantile(data_clean$income, probs = c(0.25, 0.75), na.rm = TRUE)
  upper_fence_inc <- q_inc[2] + 1.5 * (q_inc[2] - q_inc[1])
  
  data_clean <- data_clean %>%
    mutate(
      income_capped = ifelse(income > upper_fence_inc, upper_fence_inc, income),
      home_ownership = as.factor(ifelse(is.na(home_ownership), "RENT", home_ownership)),
      default = as.factor(default)
    )
  
  # 3. Standardization scale mapping
  scale_cols <- c("income_capped", "dti", "emp_length", "loan_amount")
  preProc_obj <- preProcess(data_clean[, scale_cols], method = c("center", "scale"))
  data_scaled <- predict(preProc_obj, data_clean)
  
  return(list(scaled_data = data_scaled, clean_data = data_clean, scale_obj = preProc_obj))
}`
    },
    'pd_model.R': {
      path: 'credit-risk-engine/scripts/pd_model.R',
      desc: 'Fits predictive models for individual default probabilities',
      isR: true,
      content: `library(tidyverse)
library(caret)

train_pd_model <- function(train_data, method = "logistic") {
  fit_control <- trainControl(
    method = "cv", number = 5, classProbs = TRUE, summaryFunction = twoClassSummary
  )
  levels(train_data$default) <- c("NonDefault", "Default")
  formula <- default ~ income_capped + emp_length + dti + loan_amount + home_ownership + purpose
  
  if (method == "logistic") {
    model <- train(formula, data = train_data, method = "glm", family = "binomial", metric = "ROC", trControl = fit_control)
  } else if (method == "lasso") {
    model <- train(formula, data = train_data, method = "glmnet", metric = "ROC", tuneGrid = expand.grid(alpha = 1, lambda = seq(0.001, 0.05, by = 0.01)), trControl = fit_control)
  } else if (method == "xgboost") {
    model <- train(formula, data = train_data, method = "xgbTree", metric = "ROC", trControl = fit_control, verbose = FALSE)
  }
  return(model)
}`
    },
    'lgd_model.R': {
      path: 'credit-risk-engine/scripts/lgd_model.R',
      desc: 'Recovery logic bounded on security values',
      isR: true,
      content: `calculate_lgd <- function(data, model_type = "heuristic") {
  if (model_type == "heuristic") {
    lgd <- sapply(1:nrow(data), function(i) {
      purpose <- as.character(data$purpose[i])
      base_lgd <- switch(purpose,
        "mortgage" = 0.20,
        "car"      = 0.45,
        "business" = 0.55,
        0.75
      )
      return(max(0.05, min(0.95, base_lgd)))
    })
  } else if (model_type == "beta") {
    # Beta distribution mapping logic
    lgd <- sapply(1:nrow(data), function(i) {
      x_beta <- 0.8 - 1.5 * (data$purpose[i] == "mortgage") + 0.005 * data$dti[i]
      return(1 / (1 + exp(-x_beta)))
    })
  }
  return(lgd)
}`
    },
    'ead_model.R': {
      path: 'credit-risk-engine/scripts/ead_model.R',
      desc: 'Drawn plus undrawn Credit Conversion metrics',
      isR: true,
      content: `calculate_ead <- function(data, product_type = "term_loan", default_ccf = 0.40) {
  ead <- sapply(1:nrow(data), function(i) {
    loan_amt <- data$loan_amount[i]
    if (product_type == "revolving") {
      credit_limit <- loan_amt * 1.3
      remaining_balance <- loan_amt * 0.8
      return(remaining_balance + (credit_limit - remaining_balance) * default_ccf)
    } else {
      return(loan_amt * 0.98) # Fixed Term principal amortization buffer
    }
  })
  return(ead)
}`
    },
    'ecl_engine.R': {
      path: 'credit-risk-engine/scripts/ecl_engine.R',
      desc: 'Combines PD * LGD * EAD expected credit loss totals',
      isR: true,
      content: `compute_ecl <- function(pd, lgd, ead) {
  individual_ecl <- pd * lgd * ead
  total_ead <- sum(ead)
  total_ecl <- sum(individual_ecl)
  
  return(list(
    loan_ecl_df = data.frame(PD = pd, LGD = lgd, EAD = ead, ECL = individual_ecl),
    total_ead = total_ead,
    total_ecl = total_ecl,
    weighted_pd = sum(pd * ead) / total_ead,
    weighted_lgd = sum(lgd * ead) / total_ead
  ))
}`
    },
    'scoring.R': {
      path: 'credit-risk-engine/scripts/scoring.R',
      desc: 'Scorecard mapping of default odds to FICO scales',
      isR: true,
      content: `map_pd_to_fico <- function(pd, base_score = 600, base_odds = 20, pdo = 50) {
  pd_adj <- sapply(pd, function(p) max(0.0001, min(0.9999, p)))
  odds <- (1 - pd_adj) / pd_adj
  
  factor_multiplier <- pdo / log(2)
  offset_coef <- base_score - factor_multiplier * log(base_odds)
  
  scores <- offset_coef + factor_multiplier * log(odds)
  return(sapply(scores, function(s) max(300, min(850, round(s)))))
}`
    },
    'portfolio.R': {
      path: 'credit-risk-engine/scripts/portfolio.R',
      desc: 'Gaussian Copula systematic dependence simulations',
      isR: true,
      content: `simulate_portfolio_credit_loss <- function(pds, lgds, eads, asset_corr = 0.12, num_simulations = 2000) {
  thresholds <- qnorm(pds)
  simulated_losses <- numeric(num_simulations)
  
  for (sim in 1:num_simulations) {
    z <- rnorm(1) # Systemic factor
    epsilon <- rnorm(length(pds)) # Idiosyncratic factor
    asset_returns <- sqrt(asset_corr) * z + sqrt(1 - asset_corr) * epsilon
    
    defaults <- asset_returns < thresholds
    simulated_losses[sim] <- sum(defaults * lgds * eads)
  }
  
  var_99 <- quantile(simulated_losses, probs = 0.99)
  es_99 <- mean(simulated_losses[simulated_losses >= var_99])
  
  return(list(expected_loss = mean(simulated_losses), var_99 = var_99, es_99 = es_99))
}`
    },
    'stress_testing.R': {
      path: 'credit-risk-engine/scripts/stress_testing.R',
      desc: 'Macro unemployment logit and collateral stresses',
      isR: true,
      content: `run_macro_stress_test <- function(baseline_pds, baseline_lgds, eads, scenario = "baseline", unemp_shock = 0.04, gdp_contraction = -0.03) {
  stressed_pds <- sapply(baseline_pds, function(pd) {
    logit_pd <- log(pd / (1 - pd))
    stressed_logit <- logit_pd + (2.2 * unemp_shock) - (1.5 * gdp_contraction)
    return(1 / (1 + exp(-stressed_logit)))
  })
  
  stressed_lgds <- baseline_lgds * (1 + 0.5 * unemp_shock - 0.8 * gdp_contraction)
  return(list(stressed_pds = stressed_pds, stressed_lgds = stressed_lgds, total_ecl = sum(stressed_pds * stressed_lgds * eads)))
}`
    },
    'visualization.R': {
      path: 'credit-risk-engine/scripts/visualization.R',
      desc: 'Generates reports-grade diagnostics using ggplot2',
      isR: true,
      content: `library(tidyverse)

plot_pd_distribution <- function(pds, filename = "pd_distribution.png") {
  p <- ggplot(data.frame(PD = pds), aes(x = PD)) +
    geom_histogram(bins = 20, fill = "#1a365d", color = "white", alpha = 0.85) +
    geom_vline(aes(xintercept = mean(PD)), color = "red", linetype = "dashed") +
    theme_minimal() +
    labs(title = "Probability of Default Profile", x = "PD", y = "Count")
  ggsave(filename, plot = p, width = 7, height = 4.5)
}`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rProjectFiles[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentFile = rProjectFiles[selectedFile];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden h-[600px] shadow-none" id="r-code-workspace">
      {/* File Sidebar */}
      <div className="md:col-span-1 bg-[#0a0f1d]/60 border-r border-slate-800/80 p-4 overflow-y-auto flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 font-sans">R Project Structure</h3>
          
          <div className="space-y-1">
            <div 
              className="flex items-center space-x-1.5 text-sm font-semibold text-slate-300 cursor-pointer hover:text-indigo-400 transition"
              onClick={() => setExpandedFolder(!expandedFolder)}
            >
              {expandedFolder ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Folder size={16} className="text-indigo-450 fill-indigo-50/10" />
              <span>credit-risk-engine</span>
            </div>

            {expandedFolder && (
              <div className="pl-6 space-y-1 border-l border-slate-800 ml-2">
                {/* README */}
                <button
                  onClick={() => setSelectedFile('README.md')}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs text-left transition ${
                    selectedFile === 'README.md'
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-450 font-medium'
                      : 'text-slate-400 hover:bg-slate-950/45 hover:text-slate-200'
                  }`}
                >
                  <File size={14} className="text-slate-500" />
                  <span className="truncate">README.md</span>
                </button>

                {/* main.R */}
                <button
                  onClick={() => setSelectedFile('main.R')}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs text-left transition ${
                    selectedFile === 'main.R'
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-450 font-medium'
                      : 'text-slate-400 hover:bg-slate-950/45 hover:text-slate-200'
                  }`}
                >
                  <File size={14} className="text-indigo-400" />
                  <span className="truncate">main.R</span>
                </button>

                {/* scripts/ subfolder */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 pl-2">scripts /</span>
                  <div className="space-y-1 mt-1 pl-1">
                    {Object.keys(rProjectFiles)
                      .filter(f => f !== 'README.md' && f !== 'main.R')
                      .map(fileKey => (
                        <button
                          key={fileKey}
                          onClick={() => setSelectedFile(fileKey)}
                          className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs text-left transition ${
                            selectedFile === fileKey
                              ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-450 font-medium'
                              : 'text-slate-400 hover:bg-slate-950/45 hover:text-slate-200'
                          }`}
                        >
                          <File size={13} className="text-indigo-400" />
                          <span className="truncate">{fileKey}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-4">
          <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-850">
            <h4 className="text-xs font-bold text-slate-205 mb-1 flex items-center space-x-1">
              <Terminal size={12} className="text-indigo-400" />
              <span>Reproducible R Script</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              These files are fully functional and ready to be run locally inside standard R sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Code Editor Screen */}
      <div className="md:col-span-3 flex flex-col justify-between h-full bg-[#070b14]/50 text-slate-150 p-5 font-mono overflow-hidden">
        {/* Editor Top Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-slate-500 font-sans">Active Sandbox File:</div>
            <div className="text-sm font-semibold text-indigo-450 flex items-center space-x-2">
              <File size={14} />
              <span>{currentFile.path}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans italic mt-0.5">{currentFile.desc}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-xs text-slate-200 transition border border-slate-800 cursor-pointer"
              title="Copy code block to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-450 animate-pulse" />
                  <span className="text-emerald-455">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Clean R Code</span>
                </>
              )}
            </button>

            {currentFile.isR && (
              <button
                id="run-rc-simulate-btn"
                onClick={() => onRunR(currentFile.path)}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md shadow-indigo-500/10 border-none"
              >
                <Terminal size={13} />
                <span>Simulate Run</span>
              </button>
            )}
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 my-4 overflow-auto rounded-lg bg-[#03070f] p-4 text-[12px] leading-relaxed text-emerald-400/90 font-mono select-text border border-slate-850">
          <pre className="whitespace-pre-wrap font-mono">
            <code>{currentFile.content}</code>
          </pre>
        </div>

        {/* Editor Footer */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-800 font-sans">
          <span>Target Environment: R v4.3+ | caret, tidyverse</span>
          <span>UTF-8 Encoding</span>
        </div>
      </div>
    </div>
  );
}
