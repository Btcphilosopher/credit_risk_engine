# ==============================================================================
# ggplot2 Financial Visualization Module
# Quant Risk Engineering | Pipeline Step 9
# ==============================================================================
# Generates regulatory-reports grade charts (histogram distributions of defaults,
# scorecard allocations, stress comparison blocks) in native R.

library(tidyverse)

#' Plot Probability of Default (PD) Distribution
#' @param pds Numeric vector of PD values.
#' @param filename Filepath to save the plot image.
plot_pd_distribution <- function(pds, filename = "pd_distribution.png") {
  message("[ggplot2 Visuals] Generating default probability distribution chart...")
  
  df <- data.frame(PD = pds)
  
  p <- ggplot(df, aes(x = PD)) +
    geom_histogram(bins = 20, fill = "#1a365d", color = "white", alpha = 0.85) +
    geom_vline(aes(xintercept = mean(PD)), color = "#e53e3e", linetype = "dashed", size = 1) +
    annotate("text", x = mean(pds) + 0.05, y = 5, label = paste("Mean PD:", round(100*mean(pds), 2), "%"), color = "#e53e3e") +
    theme_minimal() +
    labs(
      title = "Probability of Default (PD) Profile",
      subtitle = "Frequency distribution of borrower loan-default expectations",
      x = "Estimated Probability of Default",
      y = "Borrower Count"
    ) +
    theme(
      plot.title = element_text(face = "bold", size = 14),
      plot.subtitle = element_text(color = "gray40", size = 10)
    )
  
  ggsave(filename, plot = p, width = 7, height = 4.5, dpi = 300)
  message(paste("[ggplot2 Visuals] Saved to:", filename))
}

#' Plot FICO Score Bands Allocation
#' @param scores Numeric vector of scores.
#' @param filename Filepath to save the plot.
plot_scorecard_bands <- function(scores, filename = "fico_bands.png") {
  message("[ggplot2 Visuals] Generating score scorecard allotment chart...")
  
  df <- data.frame(Score = scores) %>%
    mutate(Rating = case_when(
      Score >= 720 ~ "Prime (>=720)",
      Score >= 660 ~ "Near-Prime (660-719)",
      Score >= 600 ~ "Subprime Tier-1 (600-659)",
      Score >= 500 ~ "Subprime Tier-2 (500-599)",
      TRUE         ~ "Deep Risk (<500)"
    ))
  
  # Factor ordering for ordinal visualization
  df$Rating <- factor(df$Rating, levels = c("Prime (>=720)", "Near-Prime (660-719)", "Subprime Tier-1 (600-659)", "Subprime Tier-2 (500-599)", "Deep Risk (<500)"))
  
  p <- ggplot(df, aes(x = Rating, fill = Rating)) +
    geom_bar(color = "black", alpha = 0.8) +
    scale_fill_brewer(palette = "RdYlGn", direction = -1) +
    theme_minimal() +
    labs(
      title = "FICO Credit Rating Class Distribution",
      subtitle = "Allocation of underwriting risk tiers",
      x = "Credit Rating Class",
      y = "Underwritten Accounts count",
      fill = "Risk Tier"
    ) +
    theme(
      axis.text.x = element_text(angle = 30, hjust = 1, size = 9),
      legend.position = "none"
    )
  
  ggsave(filename, plot = p, width = 8, height = 4.5, dpi = 300)
  message(paste("[ggplot2 Visuals] Saved to:", filename))
}

#' Plot Stressed ECL comparison
#' @param baseline_ecl Sum value of baseline losses.
#' @param mod_recession_ecl Sum value of mod recession.
#' @param severe_stag_ecl Sum value of severe contraction.
#' @param filename Filepath to save.
plot_stress_comparison <- function(baseline_ecl, mod_recession_ecl, severe_stag_ecl, filename = "stress_test_provisions.png") {
  message("[ggplot2 Visuals] Generating macro stress test comparison bars...")
  
  df <- data.frame(
    Scenario = c("Baseline Mode", "Moderate Recession", "Severe Stagflation"),
    ECL = c(baseline_ecl, mod_recession_ecl, severe_stag_ecl),
    Fill = c("normal", "stress", "crisis")
  )
  
  p <- ggplot(df, aes(x = reorder(Scenario, ECL), y = ECL, fill = Fill)) +
    geom_bar(stat = "identity", color = "black", width = 0.6) +
    scale_fill_manual(values = c("normal" = "#2b6cb0", "stress" = "#dd6b20", "crisis" = "#e53e3e")) +
    theme_minimal() +
    labs(
      title = "ECL Underwriting Stress Test Provisions",
      subtitle = "Required loan book credit loss provisions under shock scenarios",
      x = "Macroeconomic Stress Scenario",
      y = "Total Expected Credit Loss ($)"
    ) +
    theme(
      legend.position = "none",
      plot.title = element_text(face = "bold")
    )
  
  ggsave(filename, plot = p, width = 7, height = 5, dpi = 300)
  message(paste("[ggplot2 Visuals] Saved to:", filename))
}
