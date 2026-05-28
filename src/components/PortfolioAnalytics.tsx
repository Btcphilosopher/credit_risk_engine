import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ShieldAlert, Award, TrendingUp, Info, HelpCircle, Flame } from 'lucide-react';

interface PortfolioAnalyticsProps {
  onRunMC: (correlation: number, simulations: number) => Promise<any>;
}

export default function PortfolioAnalytics({ onRunMC }: PortfolioAnalyticsProps) {
  const [assetCorrelation, setAssetCorrelation] = useState<number>(12); // in percent
  const [simulations, setSimulations] = useState<number>(2000);
  const [loading, setLoading] = useState<boolean>(false);
  const [mcResults, setMcResults] = useState<any | null>(null);

  useEffect(() => {
    runMCSimulation();
  }, []);

  const runMCSimulation = async () => {
    setLoading(true);
    try {
      const data = await onRunMC(assetCorrelation / 100, simulations);
      setMcResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSim = (e: React.FormEvent) => {
    e.preventDefault();
    runMCSimulation();
  };

  const formatCurrency = (val: number) => {
    return '$' + Math.round(val).toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in" id="portfolio-simulations">
      {/* Simulation Controls Card */}
      <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight font-sans flex items-center space-x-2">
              <Flame className="text-red-500" size={20} />
              <span>Gaussian Copula Portfolio Tail Risk Simulator</span>
            </h2>
            <p className="text-xs text-indigo-400 mt-1 uppercase font-bold tracking-wider">Vasicek Single-Risk-Factor Model (Monte Carlo)</p>
          </div>

          <form onSubmit={handleRunSim} className="flex flex-wrap items-end gap-4 bg-slate-950 px-4 py-3 rounded-lg border border-slate-850">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Asset Correlation (Rho)</label>
              <div className="flex items-center space-x-2.5">
                <input
                  id="rho-range-slider"
                  type="range"
                  min="2"
                  max="35"
                  step="1"
                  value={assetCorrelation}
                  onChange={e => setAssetCorrelation(Number(e.target.value))}
                  className="w-28 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-200 w-8">{assetCorrelation}%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation Trials</label>
              <select
                id="sim-trials-select"
                value={simulations}
                onChange={e => setSimulations(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded border border-slate-800 bg-[#0b0f19] text-xs text-slate-200 font-mono font-bold focus:border-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="1000">1,000 Trials</option>
                <option value="2000">2,000 Trials (Standard)</option>
                <option value="3000">3,000 Trials (Max Precision)</option>
              </select>
            </div>

            <button
              id="mc-rerun-btn"
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm shadow-indigo-500/10"
            >
              {loading ? "Simulating..." : "Rerun Portfolio Trials"}
            </button>
          </form>
        </div>

        {mcResults && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sum Exposure (EAD)</span>
              <div className="text-xl font-black font-mono text-slate-100 mt-1">
                {formatCurrency(mcResults.totalEad)}
              </div>
              <span className="text-[9px] text-slate-500">Ledger-wide active lines</span>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expected Loss (ECL)</span>
              <div className="text-xl font-black font-mono text-slate-100 mt-1">
                {formatCurrency(mcResults.expectedCreditLoss)}
              </div>
              <span className="text-[9px] text-slate-500">Mean simulated provision</span>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-teal-500/20 bg-teal-500/5 rounded-lg">
              <span className="text-[10px] font-bold text-teal-400 uppercase">95% Value at Risk (VaR)</span>
              <div className="text-xl font-black font-mono text-teal-400 mt-1">
                {formatCurrency(mcResults.var95)}
              </div>
              <span className="text-[9px] text-teal-500">95% confidence ceiling</span>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-amber-500/20 bg-amber-500/5 rounded-lg">
              <span className="text-[10px] font-bold text-amber-400 uppercase">99% Value at Risk (VaR)</span>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">
                {formatCurrency(mcResults.var99)}
              </div>
              <span className="text-[9px] text-amber-500">99% confidence ceiling</span>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-red-500/20 bg-red-500/5 rounded-lg col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold text-red-400 uppercase">99% Expected Shortfall</span>
              <div className="text-xl font-black font-mono text-red-400 mt-1">
                {formatCurrency(mcResults.es99)}
              </div>
              <span className="text-[9px] text-red-500">Average loss in worst 1%</span>
            </div>
          </div>
        )}
      </div>

      {/* MC Output Distribution Histogram graph */}
      {mcResults && mcResults.histogramDistribution && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 p-6 flex flex-col justify-between h-[380px]">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulated Portfolio Credit Loss Density</h3>
              <span className="text-[10px] text-slate-500">Frequency distribution of total credit loss with tail boundaries</span>
            </div>

            <div className="flex-1 w-full h-[240px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mcResults.histogramDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="binStart" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatCurrency} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1e293b", color: "#f1f5f9" }} formatter={(value: any, name: string, props: any) => [value, "Trials Count (Density)"]} labelFormatter={(val) => `Loss Range: $${val}`} />
                  <ReferenceLine x={mcResults.expectedCreditLoss} stroke="#6366f1" strokeWidth={2} label={{ value: `Simulated Mean ECL`, fill: `#818cf8`, position: 'top', fontSize: 9 }} />
                  <ReferenceLine x={mcResults.var99} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" label={{ value: `99% VaR`, fill: `#fbbf24`, position: 'top', fontSize: 10 }} />
                  <Area type="monotone" dataKey="frequency" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#lossGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Copula explanations and definitions */}
          <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Quantitative Metric Cheat Sheet</h3>
            
            <div className="space-y-4 text-xs">
              <div className="border border-slate-850 rounded-lg p-3.5 bg-slate-950/60">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  <span>Probability Density skew</span>
                </h4>
                <p className="text-slate-400 leading-relaxed mt-1">
                  Credit risk curves display long right tails (heavy skewness). This represents normal years of low, stable defaults interrupted by massive economic adjustments when high correlation triggers systemic defaults.
                </p>
              </div>

              <div className="border border-slate-850 rounded-lg p-3.5 bg-slate-950/60">
                <h4 className="font-bold text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  <span>Value at Risk (VaR 99%)</span>
                </h4>
                <p className="text-slate-400 leading-relaxed mt-1">
                  Asserts that there is a 99% probability that our portfolio credit loss will not exceed <strong className="font-bold text-slate-200">{formatCurrency(mcResults.var99)}</strong> during any given year under standard assumptions.
                </p>
              </div>

              <div className="border border-slate-850 rounded-lg p-3.5 bg-[#ef4444]/5 border-red-500/20">
                <h4 className="font-bold text-red-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  <span>Expected Shortfall (ES 99%)</span>
                </h4>
                <p className="text-slate-400 leading-relaxed mt-1">
                  Also known as Conditional VaR, this measures extreme catastrophical tail events. It specifies that if we are in the worst 1% of years, the average credit loss is projected to climb to <strong className="font-bold text-slate-200">{formatCurrency(mcResults.es99)}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
