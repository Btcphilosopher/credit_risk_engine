/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Terminal as TerminalIcon, 
  FileSpreadsheet, 
  Calculator, 
  Flame, 
  Activity, 
  Sparkles, 
  Code, 
  Play, 
  Download,
  BookOpen,
  FolderOpen
} from 'lucide-react';
import UnderwritingLedger from './components/UnderwritingLedger';
import Simulator from './components/Simulator';
import PortfolioAnalytics from './components/PortfolioAnalytics';
import StressTestDashboard from './components/StressTestDashboard';
import CodeExplorer from './components/CodeExplorer';
import RiskCopilot from './components/RiskCopilot';
import { CreditScores, PortfolioStressResult } from './types';

// Standard type for row score outcomes
interface ScoredRow {
  borrower: any;
  pd: number;
  lgd: number;
  ead: number;
  ecl: number;
  ficoScore: number;
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('ledger');
  const [pdModel, setPdModel] = useState<string>('logistic');
  const [lgdModel, setLgdModel] = useState<string>('heuristic');
  const [eadType, setEadType] = useState<string>('term');
  const [runningPipeline, setRunningPipeline] = useState<boolean>(false);
  const [pipelineTerminalLogs, setPipelineTerminalLogs] = useState<string[]>([
    "Initial quant risk session loaded at " + new Date().toISOString(),
    "Workspace ready. Selected baseline Logistic PD model & Heuristic LGD limits."
  ]);

  // Terminal actions
  const addLog = (msg: string) => {
    setPipelineTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Run calculation API triggers
  const executeUnderwritingCalculations = async (): Promise<ScoredRow[]> => {
    const response = await fetch('/api/sim/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdModel, lgdModel, eadType })
    });
    return response.json();
  };

  const handleAddLoan = async (loanData: any) => {
    const response = await fetch('/api/sim/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData)
    });
    addLog(`Funded custom loan on active client list: ${loanData.name}`);
    return response.json();
  };

  const handleResetDatabase = async () => {
    const response = await fetch('/api/sim/reset', { method: 'POST' });
    addLog(`Restored Active Ledger records back to core baseline data packages.`);
    return response.json();
  };

  const handleRunMC = async (correlation: number, simulations: number) => {
    const response = await fetch('/api/sim/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdModel, lgdModel, eadType, assetCorrelation: correlation, simulations })
    });
    addLog(`Completed Gaussian Copula Monte Carlo simulation. Simulated ${simulations} trials at rho = ${(correlation * 100).toFixed(0)}%`);
    return response.json();
  };

  const handleRunStress = async (unemployment: number, gdp: number): Promise<PortfolioStressResult[]> => {
    const response = await fetch('/api/sim/stress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdModel, lgdModel, eadType, unemploymentChange: unemployment, gdpChange: gdp })
    });
    addLog(`Run macroeconomic stress testing models with Unemployment Spike = +${(unemployment * 100).toFixed(1)}% and GDP Shock = ${(gdp * 100).toFixed(1)}%`);
    return response.json();
  };

  const scoreSingleBorrower = async (bData: any): Promise<CreditScores> => {
    // We mock a temporary calculation on the server by triggering calculation for a single test item
    const response = await fetch('/api/sim/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdModel, lgdModel, eadType })
    });
    const all = await response.json();
    
    // Instead of forcing DB update we calculate using exact formula on server to return decision response
    const dtiTerm = 0.08 * bData.dti;
    const loansTerm = 0.25 * bData.existingLoans;
    const empTerm = -0.15 * Math.min(bData.empLength, 12);
    const histTerm = -0.06 * Math.min(bData.creditHistLength, 20);
    const incomeTerm = -0.012 * (Math.min(bData.income, 250000) / 1000);
    const ageTerm = -0.015 * Math.min(bData.age, 60);
    let baseIntercept = -3.2; if (pdModel === "lasso") baseIntercept = -3.1; else if (pdModel === "rf") baseIntercept = -3.4; else if (pdModel === "xgboost") baseIntercept = -3.3;
    let xLogit = baseIntercept + dtiTerm + loansTerm + empTerm + histTerm + incomeTerm + ageTerm;
    if (bData.purpose === "BUSINESS") xLogit += 0.4; if (bData.purpose === "PERSONAL") xLogit += 0.25; if (bData.purpose === "MORTGAGE") xLogit -= 0.6;
    if (bData.homeOwnership === "RENT") xLogit += 0.35; if (bData.homeOwnership === "OWN") xLogit -= 0.2;
    const pd = 1 / (1 + Math.exp(-xLogit));

    let lgd = 0.45;
    if (bData.purpose === "MORTGAGE") lgd = 0.20; else if (bData.purpose === "CAR") lgd = 0.40; else if (bData.purpose === "BUSINESS") lgd = 0.55; else lgd = 0.75;
    if (bData.homeOwnership === "OWN" && bData.purpose === "MORTGAGE") lgd -= 0.05; else if (bData.homeOwnership === "RENT") lgd += 0.05;
    if (bData.dti > 30) lgd += 0.05; lgd = Math.max(0.05, Math.min(0.95, lgd));

    const ead = bData.loanAmount * (eadType === "revolving" ? 0.90 : 0.98);
    const ecl = pd * lgd * ead;

    const adjustedPd = Math.max(0.0001, Math.min(0.9999, pd));
    const odds = (1.0 - adjustedPd) / adjustedPd;
    const factor = 50 / Math.log(2);
    const offset = 600 - factor * Math.log(20);
    let fico = Math.round(offset + factor * Math.log(odds));
    fico = Math.max(300, Math.min(850, fico));

    let riskGrade: 'A' | 'B' | 'C' | 'D' | 'E' = "C";
    if (fico >= 720) riskGrade = "A"; else if (fico >= 660) riskGrade = "B"; else if (fico >= 600) sig: riskGrade = "C"; else if (fico >= 500) riskGrade = "D"; else riskGrade = "E";

    const baseRate = 0.035; const targetMargin = 0.02; const riskPremium = pd * lgd; const capitalCharge = fico >= 700 ? 0.01 : (fico >= 600 ? 0.018 : 0.03);
    const recommendedRate = baseRate + targetMargin + riskPremium + capitalCharge;

    addLog(`Ran dynamic scorecard prediction for: ${bData.name} -> Score: ${fico} (${riskGrade})`);

    return {
      pd, lgd, ead, ecl, ficoScore: fico, riskGrade,
      pricingRecommendation: { recommendedRate: recommendedRate * 100, baseRate: baseRate * 100, riskPremium: riskPremium * 100, capitalCharge: capitalCharge * 100 }
    } as CreditScores;
  };

  const handleSimulateEngineCompile = async () => {
    setRunningPipeline(true);
    addLog("--- Sourcing Full R Credit risk Pipeline Engine ---");
    setPipelineTerminalLogs(prev => [...prev, "> Rscript main.R"]);
    setTimeout(() => {
      addLog("library(tidyverse) and library(caret) loaded successfully.");
    }, 400);
    setTimeout(() => {
      addLog(`Sourced scripts/preprocessing.R. Handled credit history and income missing values.`);
    }, 800);
    setTimeout(() => {
      addLog(`Sourced scripts/pd_model.R. Fitted baseline logistic formulation.`);
    }, 1200);
    setTimeout(() => {
      addLog(`Sourced scripts/lgd_model.R, scripts/ead_model.R -> Estimated recovery boundaries & drawn conversion bounds.`);
    }, 1600);
    setTimeout(() => {
      addLog(`Sourced scripts/scoring.R, scripts/portfolio.R -> Calibrated log-odds scorecards & launched Vasicek Monte Carlo copula.`);
    }, 2000);
    setTimeout(() => {
      addLog("======================================================================");
      addLog("                 R Pipeline compilation completed fully.              ");
      addLog("======================================================================");
      setRunningPipeline(false);
    }, 2400);
  };

  const handleRunSingleRScript = (filePath: string) => {
    addLog(`Simulated local R execution of file -> Rscript ${filePath}`);
    addLog(`Parsing modules structure... OK.`);
    addLog(`Compilation SUCCESS.`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between selection:bg-indigo-600 selection:text-white pb-12">
      {/* Premium Header Banner */}
      <header className="bg-[#0f172a]/40 backdrop-blur-md text-white shrink-0 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2.5 rounded-lg text-white shadow-lg shadow-indigo-500/15">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight font-sans text-white">
                Credit Risk Analytics Workspace
              </h1>
              <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-indigo-400 flex items-center space-x-2">
                <span>Quantitative Risk Engineering Console</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                <span>Active Simulator Mode</span>
              </p>
            </div>
          </div>

          {/* Model selection parameters strip */}
          <div className="flex flex-wrap items-center gap-4 bg-[#111827]/60 p-3 rounded-lg border border-slate-850 text-xs">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">PD Method</span>
              <select 
                value={pdModel} 
                onChange={e => { setPdModel(e.target.value); addLog(`Selected global prediction algorithm: ${e.target.value}`); }}
                className="bg-slate-950 border border-slate-800 rounded text-slate-100 px-2 py-1 mt-1 text-[11px] h-8 outline-hidden focus:border-indigo-500 transition font-bold select-none cursor-pointer"
              >
                <option value="logistic">Standard Logistic Regression</option>
                <option value="lasso">Penalized LASSO (glmnet)</option>
                <option value="rf">Random Forest Classifier</option>
                <option value="xgboost">Extreme Gradient Boosting</option>
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">LGD Method</span>
              <select 
                value={lgdModel} 
                onChange={e => { setLgdModel(e.target.value); addLog(`Selected Loss Given Default recovery method: ${e.target.value}`); }}
                className="bg-slate-950 border border-slate-800 rounded text-slate-100 px-2 py-1 mt-1 text-[11px] h-8 outline-hidden focus:border-indigo-500 transition font-bold select-none cursor-pointer"
              >
                <option value="heuristic">Collateral-Based Heuristics</option>
                <option value="linear">OLS Regression Estimation</option>
                <option value="beta">Beta regression Logit Link</option>
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">EAD Asset Class</span>
              <select 
                value={eadType} 
                onChange={e => { setEadType(e.target.value); addLog(`Selected Exposure method: ${e.target.value}`); }}
                className="bg-slate-950 border border-slate-800 rounded text-slate-100 px-2 py-1 mt-1 text-[11px] h-8 outline-hidden focus:border-indigo-500 transition font-bold select-none cursor-pointer"
              >
                <option value="term">Fixed Term Amortization Loans</option>
                <option value="revolving">Revolving Credit Limit + CCF</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto px-6 w-full flex-1 py-8 grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Hand: Tab Navigation & Step Runner Terminal */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[#0f172a]/40 backdrop-blur-sm rounded-xl border border-slate-800/80 p-5 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1.5 font-sans">Analytical Portals</h3>
            
            <button
              id="tab-ledger-btn"
              onClick={() => setActiveTab('ledger')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'ledger'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>Underwriting Ledger</span>
            </button>

            <button
              id="tab-simulator-btn"
              onClick={() => setActiveTab('simulator')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'simulator'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <Calculator size={15} />
              <span>Borrower Score Calculator</span>
            </button>

            <button
              id="tab-portfolio-btn"
              onClick={() => setActiveTab('portfolio')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'portfolio'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <Flame size={15} />
              <span>Portfolio Copula Sim</span>
            </button>

            <button
              id="tab-stress-btn"
              onClick={() => setActiveTab('stress')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'stress'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <Activity size={15} />
              <span>Macro Stress Testing</span>
            </button>

            <button
              id="tab-code-btn"
              onClick={() => setActiveTab('code')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'code'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <Code size={15} />
              <span>R Code Studio IDE</span>
            </button>

            <button
              id="tab-copilot-btn"
              onClick={() => setActiveTab('copilot')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'copilot'
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              <Sparkles size={15} />
              <span>AI Quant Advisor Chat</span>
            </button>
          </div>

          {/* Sourced R Pipeline runner console terminal block */}
          <div className="bg-[#030712] border border-slate-800/80 rounded-xl p-5 shadow-inner text-sky-400 font-mono flex flex-col justify-between h-[320px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <TerminalIcon size={14} />
                <span>R Session Console</span>
              </div>
              <button
                id="source-main-r-btn"
                disabled={runningPipeline}
                onClick={handleSimulateEngineCompile}
                className="bg-indigo-600 text-white hover:bg-indigo-500 rounded p-1.5 px-2.5 text-[10px] font-sans font-bold flex items-center space-x-1 cursor-pointer transition disabled:opacity-50 shadow-sm shadow-indigo-500/10"
              >
                <Play size={10} />
                <span>Source main.R</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 scrolling text-[10px] select-text">
              {pipelineTerminalLogs.map((log, idx) => (
                <div key={idx} className={`${
                  log.startsWith(">") ? 'text-slate-100 font-black' : 
                  log.startsWith("[E") ? 'text-amber-350' : 
                  log.startsWith("=") ? 'text-emerald-400 font-bold' : 'text-[#38bdf8]/80'
                }`}>
                  {log}
                </div>
              ))}
            </div>

            <div className="text-[9px] text-slate-500 border-t border-slate-800 pt-2 text-right">
              Console: R Session Stable
            </div>
          </div>
        </div>

        {/* Right Hand: Portals active view container */}
        <div className="xl:col-span-3">
          {activeTab === 'ledger' && (
            <UnderwritingLedger 
              onAddLoan={handleAddLoan} 
              onResetDatabase={handleResetDatabase} 
              onRunCalculations={executeUnderwritingCalculations} 
            />
          )}

          {activeTab === 'simulator' && (
            <Simulator onPreScored={scoreSingleBorrower} />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioAnalytics onRunMC={handleRunMC} />
          )}

          {activeTab === 'stress' && (
            <StressTestDashboard onRunStress={handleRunStress} />
          )}

          {activeTab === 'code' && (
            <CodeExplorer onRunR={handleRunSingleRScript} />
          )}

          {activeTab === 'copilot' && (
            <RiskCopilot />
          )}
        </div>
      </main>

      {/* Structured educational risk footer and guidelines */}
      <footer className="max-w-7xl mx-auto px-6 border-t border-slate-800 pt-6 mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-450">
        <div>
          <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <BookOpen size={12} />
            <span>Basel III Guidelines</span>
          </h4>
          <p className="leading-relaxed text-slate-400">
            The regulatory framework defines Credit Risk capital charges depending on exposure tiers (Prime vs. Subprime) and asset dependencies. Correctly modeling correlations prevents bank capital exhaustion under sudden, systematic stress testing periods.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <FileSpreadsheet size={12} />
            <span>Expected Impairments</span>
          </h4>
          <p className="leading-relaxed text-slate-400">
            IFRS 9 and CECL structures dictate that expected losses ($ECL = PD \times LGD \times EAD$) must be recognized immediately when credit portfolios are generated, replacing standard historic default write-off accounting.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <Flame size={12} />
            <span>Copula Correlations</span>
          </h4>
          <p className="leading-relaxed text-slate-400">
            Gaussian correlation scales define how likely borrowers trigger default indicators together under macroeconomic downturns. Increased correlation expands simulated portfolio loss skews, raising peak Tail Risk protections.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <Code size={12} />
            <span>R Quant Workspace</span>
          </h4>
          <p className="leading-relaxed text-slate-400">
            This workspace includes the reproducible R code sandbox representing step-by-step pipeline structures. Access and download each script in the Code Studio tab for local modeling and regression testing.
          </p>
        </div>
      </footer>
    </div>
  );
}
