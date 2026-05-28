export interface Borrower {
  id: string;
  name: string;
  age: number;
  income: number;
  empLength: number; // in years
  creditHistLength: number; // in years
  dti: number; // Debt-to-income ratio (0-100)
  existingLoans: number;
  homeOwnership: 'OWN' | 'MORTGAGE' | 'RENT' | 'OTHER';
  loanAmount: number;
  interestRate: number; // percentage
  term: number; // monthly (e.g., 36 or 60)
  purpose: 'MORTGAGE' | 'CAR' | 'PERSONAL' | 'BUSINESS';
}

export interface CreditScores {
  pd: number; // 0-1
  lgd: number; // 0-1
  ead: number; // exposure amount
  ecl: number; // expected credit loss
  ficoScore: number; // 300-850
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  pricingRecommendation: {
    recommendedRate: number;
    baseRate: number;
    riskPremium: number;
    capitalCharge: number;
  };
}

export interface PortfolioStressResult {
  scenarioName: string;
  averagePD: number;
  expectedCreditLoss: number;
  defaultRate: number;
  valueAtRisk: number; // 99% confidence VaR
  expectedShortfall: number; // Tail loss
  capitalAdequacyRatio: number; // Simulated adequacy (e.g., 12% baseline)
}

export interface EvaluationMetrics {
  auc: number;
  brierScore: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface RFile {
  name: string;
  path: string;
  content: string;
  description: string;
}
