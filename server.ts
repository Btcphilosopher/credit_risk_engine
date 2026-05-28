import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (err) {
  console.warn("Failed to initialize Gemini AI client:", err);
}

// Hastings approximation for Inverse Standard Normal Cumulative Distribution Function (normSInv)
function normSInv(p: number): number {
  if (p <= 0.0) p = 0.0001;
  if (p >= 1.0) p = 0.9999;
  
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  
  if (p < 0.5) {
    const t = Math.sqrt(-2.0 * Math.log(p));
    return -(t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1.0));
  } else {
    const t = Math.sqrt(-2.0 * Math.log(1.0 - p));
    return t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1.0);
  }
}

// Box-Muller Transform for standard normal distribution Z ~ N(0,1)
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Set up baseline simulated database of underwritten loan records
let loanDatabase = [
  { id: "L001", name: "Alpha Logistics Corp", age: 34, income: 145000, empLength: 6, creditHistLength: 8, dti: 14.5, existingLoans: 1, homeOwnership: "RENT", loanAmount: 45000, interestRate: 8.5, term: 36, purpose: "BUSINESS" },
  { id: "L002", name: "Sarah Jenkins & Associates", age: 43, income: 98000, empLength: 10, creditHistLength: 15, dti: 24.2, existingLoans: 0, homeOwnership: "MORTGAGE", loanAmount: 22000, interestRate: 6.2, term: 48, purpose: "PERSONAL" },
  { id: "L003", name: "David Vance", age: 26, income: 52000, empLength: 2, creditHistLength: 3, dti: 32.8, existingLoans: 2, homeOwnership: "RENT", loanAmount: 12000, interestRate: 11.8, term: 36, purpose: "CAR" },
  { id: "L004", name: "Prestige Realtors Ltd", age: 52, income: 280000, empLength: 15, creditHistLength: 22, dti: 9.8, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 150000, interestRate: 4.5, term: 180, purpose: "MORTGAGE" },
  { id: "L005", name: "Maya Patel", age: 29, income: 68000, empLength: 4, creditHistLength: 5, dti: 18.2, existingLoans: 0, homeOwnership: "RENT", loanAmount: 15000, interestRate: 7.9, term: 36, purpose: "PERSONAL" },
  { id: "L006", name: "Apex Food Distribution", age: 39, income: 115000, empLength: 8, creditHistLength: 11, dti: 21.6, existingLoans: 3, homeOwnership: "OWN", loanAmount: 60000, interestRate: 9.2, term: 60, purpose: "BUSINESS" },
  { id: "L007", name: "Charles Dubois", age: 48, income: 125000, empLength: 12, creditHistLength: 14, dti: 15.1, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 40000, interestRate: 5.8, term: 60, purpose: "CAR" },
  { id: "L008", name: "Emma Watson", age: 23, income: 38000, empLength: 1, creditHistLength: 2, dti: 38.5, existingLoans: 2, homeOwnership: "RENT", loanAmount: 8000, interestRate: 14.5, term: 36, purpose: "PERSONAL" },
  { id: "L009", name: "Dr. Nicholas Ryan", age: 55, income: 210000, empLength: 18, creditHistLength: 25, dti: 12.4, existingLoans: 0, homeOwnership: "OWN", loanAmount: 90000, interestRate: 4.8, term: 60, purpose: "MORTGAGE" },
  { id: "L010", name: "Greenwood Landscaping", age: 32, income: 74000, empLength: 5, creditHistLength: 6, dti: 28.1, existingLoans: 2, homeOwnership: "RENT", loanAmount: 18000, interestRate: 10.5, term: 36, purpose: "BUSINESS" },
  { id: "L011", name: "Julian Ramirez", age: 45, income: 92000, empLength: 9, creditHistLength: 12, dti: 20.4, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 25000, interestRate: 6.9, term: 48, purpose: "PERSONAL" },
  { id: "L012", name: "Sofia Larsson", age: 31, income: 83000, empLength: 4, creditHistLength: 7, dti: 19.8, existingLoans: 1, homeOwnership: "RENT", loanAmount: 14000, interestRate: 8.2, term: 36, purpose: "CAR" },
  { id: "L013", name: "Matrix Bio Solutions", age: 42, income: 165000, empLength: 7, creditHistLength: 9, dti: 16.5, existingLoans: 2, homeOwnership: "MORTGAGE", loanAmount: 75000, interestRate: 8.8, term: 60, purpose: "BUSINESS" },
  { id: "L014", name: "Taylor Brooks", age: 27, income: 49000, empLength: 3, creditHistLength: 4, dti: 29.5, existingLoans: 3, homeOwnership: "RENT", loanAmount: 9500, interestRate: 12.9, term: 36, purpose: "PERSONAL" },
  { id: "L015", name: "Liam O'Connor", age: 50, income: 135000, empLength: 14, creditHistLength: 18, dti: 11.2, existingLoans: 0, homeOwnership: "OWN", loanAmount: 50000, interestRate: 5.2, term: 120, purpose: "MORTGAGE" }
] as any[];

// Pre-scoring algorithms mapped from R formulas
function scoreBorrower(b: any, modelType = "logistic", lgdType = "heuristic", eadType = "term"): any {
  // 1. Estimate Probability of Default (PD)
  // Logistic regression scoring equation base:
  // logit(p) = Intercept + b1*DTI + b2*existing_loans - b3*empLength - b4*creditHistLength - b5*Income_thou - b6*Age
  const dtiTerm = 0.08 * b.dti;
  const loansTerm = 0.25 * b.existingLoans;
  const empTerm = -0.15 * Math.min(b.empLength, 12);
  const histTerm = -0.06 * Math.min(b.creditHistLength, 20);
  const incomeTerm = -0.012 * (Math.min(b.income, 250000) / 1000);
  const ageTerm = -0.015 * Math.min(b.age, 60);
  
  // Model coefficients shifts
  let baseIntercept = -3.2; // roughly 4% default rate base
  if (modelType === "lasso") baseIntercept = -3.1;
  else if (modelType === "rf") baseIntercept = -3.4;
  else if (modelType === "xgboost") baseIntercept = -3.3;

  let xLogit = baseIntercept + dtiTerm + loansTerm + empTerm + histTerm + incomeTerm + ageTerm;
  
  // Factor purpose/ownership adjustments
  if (b.purpose === "BUSINESS") xLogit += 0.4;
  if (b.purpose === "PERSONAL") xLogit += 0.25;
  if (b.purpose === "MORTGAGE") xLogit -= 0.6;
  if (b.homeOwnership === "RENT") xLogit += 0.35;
  if (b.homeOwnership === "OWN") xLogit -= 0.2;

  const pd = 1 / (1 + Math.exp(-xLogit));
  
  // 2. Estimate Loss Given Default (LGD)
  let lgd = 0.45; // baseline personal / average
  if (lgdType === "heuristic" || lgdType === "beta") {
    if (b.purpose === "MORTGAGE") lgd = 0.20;
    else if (b.purpose === "CAR") lgd = 0.40;
    else if (b.purpose === "BUSINESS") lgd = 0.55;
    else lgd = 0.75; // Unsecured Personal typical write-off is 75%

    // Collateral adjust
    if (b.homeOwnership === "OWN" && b.purpose === "MORTGAGE") lgd -= 0.05;
    else if (b.homeOwnership === "RENT") lgd += 0.05;

    // Financial capacity adjustment
    if (b.dti > 30) lgd += 0.05;
  } else {
    // Linear regression baseline representation
    lgd = 0.65 - 0.25 * (b.purpose === "MORTGAGE" ? 1 : 0) - 0.10 * (b.purpose === "CAR" ? 1 : 0) + 0.08 * (b.homeOwnership === "RENT" ? 1 : 0) + 0.002 * b.dti;
  }
  lgd = Math.max(0.05, Math.min(0.95, lgd));

  // 3. Estimate Exposure at Default (EAD)
  let ead = b.loanAmount;
  if (eadType === "revolving") {
    // CCF: Credit Conversion Factor of 40% applied to undrawn credit limits
    const creditLimit = b.loanAmount * 1.30;
    const remainingBalance = b.loanAmount * (b.dti > 25 ? 0.90 : 0.75);
    const undrawnLimit = creditLimit - remainingBalance;
    ead = remainingBalance + undrawnLimit * 0.40;
  } else {
    // Fixed principal amortization factor
    ead = b.loanAmount * 0.98; // accounting for 2% typical pay-downs before trigger
  }

  // 4. Expected Credit Loss (ECL)
  const ecl = pd * lgd * ead;

  // 5. FICO scorecard scale Calibration (300-850)
  // Mapping log odds to score. base 600 score at 20:1 odds, PDO of 50
  const adjustedPd = Math.max(0.0001, Math.min(0.9999, pd));
  const odds = (1.0 - adjustedPd) / adjustedPd;
  const factor = 50 / Math.log(2);
  const offset = 600 - factor * Math.log(20);
  
  let fico = Math.round(offset + factor * Math.log(odds));
  fico = Math.max(300, Math.min(850, fico));

  // 6. Risk grades
  let riskGrade: 'A' | 'B' | 'C' | 'D' | 'E' = "C";
  if (fico >= 720) riskGrade = "A";
  else if (fico >= 660) riskGrade = "B";
  else if (fico >= 600) riskGrade = "C";
  else if (fico >= 500) riskGrade = "D";
  else riskGrade = "E";

  // 7. Suggested Risk-Based Pricing APR
  const baseRate = 0.035; // 3.5% cost of funds
  const targetMargin = 0.02; // 2% profit margin
  const riskPremium = pd * lgd; // Cover expected loss
  const capitalCharge = fico >= 700 ? 0.01 : (fico >= 600 ? 0.018 : 0.03); // higher reserve for riskier loans
  const recommendedRate = baseRate + targetMargin + riskPremium + capitalCharge;

  return {
    pd,
    lgd,
    ead,
    ecl,
    ficoScore: fico,
    riskGrade,
    pricingRecommendation: {
      recommendedRate: recommendedRate * 100,
      baseRate: baseRate * 100,
      riskPremium: riskPremium * 100,
      capitalCharge: capitalCharge * 100
    }
  };
}

// API Routes
// 1. Fetch loans ledger
app.get("/api/sim/loans", (req, res) => {
  res.json(loanDatabase);
});

// 2. Add an underwritten borrower record
app.post("/api/sim/loans", (req, res) => {
  const { name, age, income, empLength, creditHistLength, dti, existingLoans, homeOwnership, loanAmount, interestRate, term, purpose } = req.body;
  if (!name || isNaN(income) || isNaN(loanAmount)) {
    return res.status(400).json({ error: "Required fields name, income, and loanAmount must be numbers." });
  }

  const newId = "L" + String(loanDatabase.length + 1).padStart(3, "0");
  const newLoan = {
    id: newId,
    name,
    age: Number(age || 30),
    income: Number(income),
    empLength: Number(empLength || 3),
    creditHistLength: Number(creditHistLength || 5),
    dti: Number(dti || 20),
    existingLoans: Number(existingLoans || 0),
    homeOwnership: homeOwnership || "RENT",
    loanAmount: Number(loanAmount),
    interestRate: Number(interestRate || 8.0),
    term: Number(term || 36),
    purpose: purpose || "PERSONAL"
  };

  loanDatabase.push(newLoan);
  res.status(201).json(newLoan);
});

// 3. Reset database
app.post("/api/sim/reset", (req, res) => {
  loanDatabase = [
    { id: "L001", name: "Alpha Logistics Corp", age: 34, income: 145000, empLength: 6, creditHistLength: 8, dti: 14.5, existingLoans: 1, homeOwnership: "RENT", loanAmount: 45000, interestRate: 8.5, term: 36, purpose: "BUSINESS" },
    { id: "L002", name: "Sarah Jenkins & Associates", age: 43, income: 98000, empLength: 10, creditHistLength: 15, dti: 24.2, existingLoans: 0, homeOwnership: "MORTGAGE", loanAmount: 22000, interestRate: 6.2, term: 48, purpose: "PERSONAL" },
    { id: "L003", name: "David Vance", age: 26, income: 52000, empLength: 2, creditHistLength: 3, dti: 32.8, existingLoans: 2, homeOwnership: "RENT", loanAmount: 12000, interestRate: 11.8, term: 36, purpose: "CAR" },
    { id: "L004", name: "Prestige Realtors Ltd", age: 52, income: 280000, empLength: 15, creditHistLength: 22, dti: 9.8, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 150000, interestRate: 4.5, term: 180, purpose: "MORTGAGE" },
    { id: "L005", name: "Maya Patel", age: 29, income: 68000, empLength: 4, creditHistLength: 5, dti: 18.2, existingLoans: 0, homeOwnership: "RENT", loanAmount: 15000, interestRate: 7.9, term: 36, purpose: "PERSONAL" },
    { id: "L006", name: "Apex Food Distribution", age: 39, income: 115000, empLength: 8, creditHistLength: 11, dti: 21.6, existingLoans: 3, homeOwnership: "OWN", loanAmount: 60000, interestRate: 9.2, term: 60, purpose: "BUSINESS" },
    { id: "L007", name: "Charles Dubois", age: 48, income: 125000, empLength: 12, creditHistLength: 14, dti: 15.1, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 40000, interestRate: 5.8, term: 60, purpose: "CAR" },
    { id: "L008", name: "Emma Watson", age: 23, income: 38000, empLength: 1, creditHistLength: 2, dti: 38.5, existingLoans: 2, homeOwnership: "RENT", loanAmount: 8000, interestRate: 14.5, term: 36, purpose: "PERSONAL" },
    { id: "L010", name: "Greenwood Landscaping", age: 32, income: 74000, empLength: 5, creditHistLength: 6, dti: 28.1, existingLoans: 2, homeOwnership: "RENT", loanAmount: 18000, interestRate: 10.5, term: 36, purpose: "BUSINESS" },
    { id: "L011", name: "Julian Ramirez", age: 45, income: 92000, empLength: 9, creditHistLength: 12, dti: 20.4, existingLoans: 1, homeOwnership: "MORTGAGE", loanAmount: 25000, interestRate: 6.9, term: 48, purpose: "PERSONAL" },
    { id: "L012", name: "Sofia Larsson", age: 31, income: 83000, empLength: 4, creditHistLength: 7, dti: 19.8, existingLoans: 1, homeOwnership: "RENT", loanAmount: 14000, interestRate: 8.2, term: 36, purpose: "CAR" },
    { id: "L013", name: "Matrix Bio Solutions", age: 42, income: 165000, empLength: 7, creditHistLength: 9, dti: 16.5, existingLoans: 2, homeOwnership: "MORTGAGE", loanAmount: 75000, interestRate: 8.8, term: 60, purpose: "BUSINESS" },
    { id: "L014", name: "Taylor Brooks", age: 27, income: 49000, empLength: 3, creditHistLength: 4, dti: 29.5, existingLoans: 3, homeOwnership: "RENT", loanAmount: 9500, interestRate: 12.9, term: 36, purpose: "PERSONAL" },
    { id: "L015", name: "Liam O'Connor", age: 50, income: 135000, empLength: 14, creditHistLength: 18, dti: 11.2, existingLoans: 0, homeOwnership: "OWN", loanAmount: 50000, interestRate: 5.2, term: 120, purpose: "MORTGAGE" }
  ];
  res.json({ status: "success", count: loanDatabase.length });
});

// 4. Run standard scorecard modeling & risk metrics calculations across full ledger
app.post("/api/sim/calculate", (req, res) => {
  const { pdModel, lgdModel, eadType } = req.body;
  
  const results = loanDatabase.map(b => {
    const scores = scoreBorrower(b, pdModel, lgdModel, eadType);
    return {
      borrower: b,
      ...scores
    };
  });

  res.json(results);
});

// 5. Run Gaussian Copula Portfolio Simulation on active ledger probabilities
app.post("/api/sim/portfolio", (req, res) => {
  const { pdModel, lgdModel, eadType, assetCorrelation, simulations } = req.body;
  
  const rho = Number(assetCorrelation || 0.12);
  const mSims = Number(simulations || 2000);
  
  const loansScored = loanDatabase.map(b => {
    return scoreBorrower(b, pdModel, lgdModel, eadType);
  });

  const numBorrowers = loansScored.length;
  const thresholds = loansScored.map(l => normSInv(l.pd));
  const totalEad = loansScored.reduce((acc, l) => acc + l.ead, 0);

  const trialLosses: number[] = [];
  const sqrtRho = Math.sqrt(rho);
  const sqrtOneMinusRho = Math.sqrt(1.0 - rho);

  // Monte Carlo loop
  for (let s = 0; s < mSims; s++) {
    const z = randomNormal(); // Global systemic macro factor Z
    let trialLoss = 0;
    for (let i = 0; i < numBorrowers; i++) {
      const epsilon = randomNormal(); // Idiosyncratic risk
      const latentReturn = sqrtRho * z + sqrtOneMinusRho * epsilon;
      
      // Default triggered if latent return falls below individual critical threshold Ti
      if (latentReturn < thresholds[i]) {
        trialLoss += loansScored[i].ead * loansScored[i].lgd;
      }
    }
    trialLosses.push(trialLoss);
  }

  // Sort losses for Value at Risk and tail distributions
  trialLosses.sort((a, b) => a - b);

  const meanLoss = trialLosses.reduce((sum, l) => sum + l, 0) / mSims;
  
  // Percentiles for VaR
  const var95Idx = Math.floor(mSims * 0.95);
  const var99Idx = Math.floor(mSims * 0.99);
  const var95 = trialLosses[var95Idx] || 0;
  const var99 = trialLosses[var99Idx] || 0;

  // Expected Shortfall (tail loss average above VaR)
  const tail99Losses = trialLosses.slice(var99Idx);
  const es99 = tail99Losses.reduce((sum, l) => sum + l, 0) / (tail99Losses.length || 1);

  // Build histogram bins for rendering
  const maxLoss = Math.max(...trialLosses, 1000);
  const binCount = 30;
  const binWidth = maxLoss / binCount;
  const binnedMatches = Array.from({ length: binCount }, (_, idx) => ({
    binStart: Math.round(idx * binWidth),
    binEnd: Math.round((idx + 1) * binWidth),
    frequency: 0
  }));

  trialLosses.forEach(loss => {
    let bIdx = Math.floor(loss / binWidth);
    if (bIdx >= binCount) bIdx = binCount - 1;
    if (bIdx < 0) bIdx = 0;
    binnedMatches[bIdx].frequency += 1;
  });

  res.json({
    totalEad,
    expectedCreditLoss: meanLoss,
    var95,
    var99,
    es99,
    concentrationHHI: 1.0 / numBorrowers, // simplied HHI representation
    simLosses: trialLosses.slice(0, 100), // truncated sample paths for display
    histogramDistribution: binnedMatches
  });
});

// 6. Stress testing API
app.post("/api/sim/stress", (req, res) => {
  const { pdModel, lgdModel, eadType, unemploymentChange, gdpChange } = req.body;
  
  // Scenarios defined as macro adjustments
  // Baseline, Moderate Recession, Severe Stagflation
  const scenarios = [
    { name: "Baseline Mode", unemp: 0.0, gdp: 0.0, label: "normal" },
    { name: "Moderate Recession", unemp: Number(unemploymentChange || 0.04), gdp: Number(gdpChange || -0.03), label: "stress" },
    { name: "Severe Stagflation", unemp: Number(unemploymentChange || 0.04) + 0.03, gdp: Number(gdpChange || -0.03) - 0.02, label: "crisis" }
  ];

  const summary = scenarios.map(sc => {
    const scoredLoansStressed = loanDatabase.map(b => {
      const bBase = scoreBorrower(b, pdModel, lgdModel, eadType);
      
      // Calculate stressed PD using logit-elastic sensitivities (unemployment beta=2.2, GDP beta=-1.5)
      const pdAdj = Math.max(0.001, Math.min(0.999, bBase.pd));
      const logitPd = Math.log(pdAdj / (1 - pdAdj));
      const stressedLogit = logitPd + (2.2 * sc.unemp) - (1.5 * sc.gdp);
      const stressedPd = 1 / (1 + Math.exp(-stressedLogit));

      // Calculate stressed LGD
      const multiplier = 1 + (0.5 * sc.unemp) - (0.8 * sc.gdp);
      const stressedLgd = Math.max(0.05, Math.min(0.95, bBase.lgd * multiplier));

      return {
        pd: Math.min(0.999, Math.max(0.001, stressedPd)),
        lgd: stressedLgd,
        ead: bBase.ead,
        ecl: Math.min(0.99, stressedPd) * stressedLgd * bBase.ead
      };
    });

    const totalEad = scoredLoansStressed.reduce((sum, l) => sum + l.ead, 0);
    const totalEcl = scoredLoansStressed.reduce((sum, l) => sum + l.ecl, 0);
    const averagePD = scoredLoansStressed.reduce((sum, l) => sum + l.pd, 0) / scoredLoansStressed.length;
    const defaultRate = averagePD; // simple representation

    // Simulated Basel Capital adequacy
    const baselineCET1 = 2000000; // $2M reserve capital
    const rwa = 15000000; // $15M risk weighted assets
    const baseEcl = loanDatabase.map(b => scoreBorrower(b, pdModel, lgdModel, eadType))
                                .reduce((sum, l) => sum + l.ecl, 0);
    const rMargin = totalEcl - baseEcl; // Escalation
    const stressedCAR = Math.max(0.02, (baselineCET1 - (rMargin > 0 ? rMargin : 0)) / rwa) * 100;

    return {
      scenarioName: sc.name,
      averagePD,
      expectedCreditLoss: totalEcl,
      defaultRate: defaultRate * 100,
      valueAtRisk: totalEcl * 1.8, // simplified stress Value at Risk projection
      expectedShortfall: totalEcl * 2.3,
      capitalAdequacyRatio: stressedCAR,
      unemp: sc.unemp * 100,
      gdp: sc.gdp * 100
    };
  });

  res.json(summary);
});

// 7. Gemini AI Credit Advisor integration
app.post("/api/gemini/advisor", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body." });
  }

  if (!ai) {
    return res.json({
      text: "Unified Gemini Advisor: I am functioning in sandbox mode. To activate my server-side Gemini AI intelligence, please locate your actual **GEMINI_API_KEY** under the **Settings > Secrets** panel in AI Studio. \n\n*General Advisor tip:* Standard credit models map borrower default likelihoods ($PD$) using log-odds card scales ($Score = C_1 + C_2 \\ln(Odds)$). Adjusting unemployment spikes shifts these default probabilities upwards along log-linear curves."
    });
  }

  try {
    const contents = `You are a Senior Quantitative Credit Risk Modeling Advisor named Gemini Risk Copilot. 
    A credit modeling analyst is asking you a question about Basel III requirements, expected credit loss (ECL), IFRS 9 or CECL standards, FICO scorecard calibration, or Gaussian Copula simulations.
    Provide an accurate, educational, clear, and highly professional explanation, occasionally using Markdown latex-style equations to highlight pricing or loss equations ($ECL = PD \\times LGD \\times EAD$, log-odds, or Vasicek asset returns). Keep your response professional and helpful.
    
    Analyst Question: ${prompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Advisor API Error:", error);
    res.json({
      text: `Unified Gemini Advisor encountered an error when communicating with Gemini: ${error?.message || error}. I will provide advice based on quantitative standards: ECL represents expected defaults, and the Herfindahl (HHI) concentration limits portfolios to ensure diversification.`
    });
  }
});

// Start the Express custom server checking for development state
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Credit risk engine server booting on http://localhost:${PORT}`);
  });
}

startServer();
