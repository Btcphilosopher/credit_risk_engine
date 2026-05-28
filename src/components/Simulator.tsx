import React, { useState } from 'react';
import { Borrower, CreditScores } from '../types';
import { ShieldAlert, ShieldCheck, Scale, Award, Info, Percent, DollarSign, Calculator } from 'lucide-react';

interface SimulatorProps {
  onPreScored: (params: any) => Promise<CreditScores>;
}

export default function Simulator({ onPreScored }: SimulatorProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [borrower, setBorrower] = useState<Partial<Borrower>>({
    name: "Dr. Alexander Thorne",
    age: 38,
    income: 125000,
    empLength: 8,
    creditHistLength: 12,
    dti: 18.5,
    existingLoans: 1,
    homeOwnership: 'MORTGAGE',
    loanAmount: 45000,
    interestRate: 6.5,
    term: 48,
    purpose: 'BUSINESS'
  });

  const [scores, setScores] = useState<CreditScores | null>({
    pd: 0.0215,
    lgd: 0.55,
    ead: 44100,
    ecl: 521.48,
    ficoScore: 712,
    riskGrade: 'B',
    pricingRecommendation: {
      recommendedRate: 8.18,
      baseRate: 3.5,
      riskPremium: 1.18,
      capitalCharge: 1.5
    }
  });

  const handleInputChange = (field: keyof Borrower, value: any) => {
    setBorrower(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const computed = await onPreScored(borrower);
      setScores(computed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: "A" | "B" | "C" | "D" | "E") => {
    switch (grade) {
      case "A": return "bg-emerald-500 border-emerald-600 text-emerald-990";
      case "B": return "bg-teal-500 border-teal-600 text-teal-990";
      case "C": return "bg-yellow-500 border-yellow-600 text-yellow-990";
      case "D": return "bg-orange-500 border-orange-600 text-orange-990";
      case "E": return "bg-red-500 border-red-600 text-red-990";
      default: return "bg-slate-500 text-white";
    }
  };

  const getFicoColor = (score: number) => {
    if (score >= 720) return "text-emerald-500";
    if (score >= 660) return "text-teal-500";
    if (score >= 600) return "text-yellow-600";
    if (score >= 500) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="underwriting-playground">
      {/* Parameters Form */}
      <form onSubmit={handleSimulate} className="lg:col-span-6 bg-[#0f172a]/40 backdrop-blur-sm rounded-xl border border-slate-805/80 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calculator className="text-indigo-500" size={20} />
          <h2 className="text-lg font-bold text-slate-100 tracking-tight font-sans">Interactive Underwriting Inputs</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Borrower / Business Name</label>
            <input
              id="playground-borrower-name"
              type="text"
              required
              value={borrower.name || ""}
              onChange={e => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm"
              placeholder="e.g. John Doe Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Applicant Age (Years)</label>
            <input
              id="playground-borrower-age"
              type="number"
              min="18"
              max="95"
              required
              value={borrower.age || 30}
              onChange={e => handleInputChange('age', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Annual Income ($)</label>
            <input
              id="playground-borrower-income"
              type="number"
              min="5000"
              max="2000000"
              step="1000"
              required
              value={borrower.income || 60000}
              onChange={e => handleInputChange('income', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Employment Length (Yrs)</label>
            <input
              id="playground-borrower-emp"
              type="number"
              min="0"
              max="45"
              required
              value={borrower.empLength}
              onChange={e => handleInputChange('empLength', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Credit History (Yrs)</label>
            <input
              id="playground-borrower-history"
              type="number"
              min="0"
              max="50"
              required
              value={borrower.creditHistLength}
              onChange={e => handleInputChange('creditHistLength', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Debt-Store-To-Income (%)</label>
            <input
              id="playground-borrower-dti"
              type="number"
              min="0"
              max="150"
              step="0.1"
              required
              value={borrower.dti || 15}
              onChange={e => handleInputChange('dti', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Other Active Loans</label>
            <input
              id="playground-borrower-active"
              type="number"
              min="0"
              max="15"
              required
              value={borrower.existingLoans}
              onChange={e => handleInputChange('existingLoans', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Home Ownership</label>
            <select
              id="playground-borrower-ownership"
              value={borrower.homeOwnership}
              onChange={e => handleInputChange('homeOwnership', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm select-none"
            >
              <option value="RENT">RENT</option>
              <option value="MORTGAGE">MORTGAGE</option>
              <option value="OWN">OWN</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Requested Loan Amt ($)</label>
            <input
              id="playground-borrower-amount"
              type="number"
              min="1000"
              max="2000000"
              step="500"
              required
              value={borrower.loanAmount || 10000}
              onChange={e => handleInputChange('loanAmount', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Loan Purpose Focus</label>
            <select
              id="playground-borrower-purpose"
              value={borrower.purpose}
              onChange={e => handleInputChange('purpose', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm select-none"
            >
              <option value="MORTGAGE">Real estate / Mortgage</option>
              <option value="BUSINESS">Business Expansion / Capex</option>
              <option value="PERSONAL">Personal Unsecured Credit</option>
              <option value="CAR">Vehicle Purchase / Auto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Repayment Term</label>
            <select
              id="playground-borrower-term"
              value={borrower.term || 36}
              onChange={e => handleInputChange('term', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-hidden focus:border-indigo-500 text-sm select-none"
            >
              <option value="36">36 Months</option>
              <option value="48">48 Months</option>
              <option value="60">60 Months</option>
              <option value="120">120 Months (Mortgages Only)</option>
              <option value="180">180 Months (Mortgages Only)</option>
            </select>
          </div>
        </div>

        <button
          id="playground-simulate-btn"
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition transition-all cursor-pointer shadow-md shadow-indigo-500/10 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <span>Computing credit scorecards...</span>
          ) : (
            <>
              <Calculator size={16} />
              <span>Simulate Underwriting Decision</span>
            </>
          )}
        </button>
      </form>

      {/* Underwriting output results */}
      <div className="lg:col-span-6 space-y-6">
        {scores ? (
          <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/85 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Scoring Scorecard Output</h3>
              <div className={`text-xs font-bold px-3 py-1 rounded-full border ${getGradeColor(scores.riskGrade)}`}>
                Rating Grade: {scores.riskGrade}
              </div>
            </div>

            {/* Score Metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">FICO-Calibrated</span>
                <span className={`text-2xl font-black font-mono mt-1 ${getFicoColor(scores.ficoScore)}`}>
                  {scores.ficoScore}
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Range: 300 - 850</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase">Default Prob (PD)</span>
                <span className="text-2xl font-black font-mono text-slate-100 mt-1">
                  {(scores.pd * 100).toFixed(2)}%
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Cyclical probability</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase">Recovery Loss (LGD)</span>
                <span className="text-2xl font-black font-mono text-slate-100 mt-1">
                  {(scores.lgd * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Unrecoverable at default</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-300 uppercase">Exposure (EAD)</span>
                <span className="text-xl font-black font-mono text-slate-100 mt-1">
                  ${Math.round(scores.ead).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Adjusted capital limit</span>
              </div>
            </div>

            {/* Mathematical Provision Result info box */}
            <div className="bg-rose-950/10 border border-rose-500/20 rounded-lg p-4 flex items-start space-x-3">
              <ShieldAlert className="text-rose-400 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">Expected Credit Loss (ECL) Provision</h4>
                <p className="text-xs text-rose-300/80 leading-relaxed mt-1">
                  If this loan is funded, the bank must set aside an expected credit loss provision of <strong className="font-bold text-rose-200 font-mono">${scores.ecl.toFixed(2)}</strong> immediately under IFRS 9 / CECL rules based on standard calculations:
                </p>
                <div className="text-[11px] font-mono text-rose-200 mt-2 bg-rose-950/40 border border-rose-550/20 rounded-md px-2.5 py-1.5 inline-block">
                  ECL = PD × LGD × EAD = {(scores.pd * 100).toFixed(2)}% × {(scores.lgd * 100).toFixed(1)}% × ${Math.round(scores.ead).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Risk-Based Interest Rate Pricing component */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>Suggested Risk-Based Pricing (APR)</span>
                <Percent size={14} className="text-slate-500" />
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="border border-slate-850 rounded p-1.5 text-center bg-slate-950/30">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Base Cost</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {scores.pricingRecommendation.baseRate.toFixed(2)}%
                  </span>
                </div>
                <div className="border border-slate-850 rounded p-1.5 text-center bg-slate-950/30">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Markup Margin</span>
                  <span className="text-xs font-mono font-bold text-slate-300">2.00%</span>
                </div>
                <div className="border border-slate-850 rounded p-1.5 text-center bg-slate-950/30">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Risk Premium</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {scores.pricingRecommendation.riskPremium.toFixed(2)}%
                  </span>
                </div>
                <div className="border border-slate-850 rounded p-1.5 text-center bg-slate-950/30">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Capital Reserve</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {scores.pricingRecommendation.capitalCharge.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2.5 px-3 bg-indigo-500/10 border border-indigo-500/25 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-indigo-200">Recommended Borrowing APR</div>
                  <div className="text-[9px] text-indigo-400">Risk-neutral hurdle price guideline</div>
                </div>
                <div className="text-xl font-black font-mono text-indigo-400">
                  {scores.pricingRecommendation.recommendedRate.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Underwriting Recommendation */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {scores.ficoScore >= 600 ? (
                  <ShieldCheck className="text-emerald-400" size={18} />
                ) : (
                  <ShieldAlert className="text-red-400" size={18} />
                )}
                <span className="text-xs font-bold text-slate-300">Underwriting Recommendation:</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-sm uppercase ${
                scores.ficoScore >= 720 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                scores.ficoScore >= 600 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {scores.ficoScore >= 720 ? 'Approve Prime (Unconditional)' :
                 scores.ficoScore >= 600 ? 'Approve Subprime (With Covenants)' :
                 'Decline Account (Significant Default Risk)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#0f172a]/30 rounded-xl border border-slate-800 border-dashed p-10 text-center flex flex-col items-center justify-center space-y-3 h-[420px]">
            <Calculator className="text-slate-600 stroke-1" size={48} />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awaiting Decision Parameters</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Adjust borrower demographics and financial constraints in the sidebar panel to see live quantitative default metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
