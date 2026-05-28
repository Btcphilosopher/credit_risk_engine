import React, { useState, useEffect } from 'react';
import { PortfolioStressResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { Activity, ShieldAlert, Award, FileText, TrendingUp, Info } from 'lucide-react';

interface StressTestDashboardProps {
  onRunStress: (unemployment: number, gdp: number) => Promise<PortfolioStressResult[]>;
}

export default function StressTestDashboard({ onRunStress }: StressTestDashboardProps) {
  const [unempShock, setUnempShock] = useState<number>(4); // +4% default
  const [gdpChange, setGdpChange] = useState<number>(-3); // -3% default
  const [loading, setLoading] = useState<boolean>(false);
  const [stressData, setStressData] = useState<any[]>([]);

  useEffect(() => {
    fetchStressResults();
  }, []);

  const fetchStressResults = async () => {
    setLoading(true);
    try {
      // API expects decimals (e.g. 0.04 and -0.03)
      const data = await onRunStress(unempShock / 100, gdpChange / 100);
      setStressData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStress = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStressResults();
  };

  const formatCurrency = (val: number) => {
    return '$' + Math.round(val).toLocaleString();
  };

  const formatPercent = (val: number) => {
    return val.toFixed(2) + '%';
  };

  return (
    <div className="space-y-6 animate-fade-in" id="stress-testing-workspace">
      {/* Top controls */}
      <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-105 tracking-tight font-sans flex items-center space-x-2">
              <Activity className="text-indigo-400" size={20} />
              <span>Macroeconomic Stress Testing Workspace</span>
            </h2>
            <p className="text-xs text-indigo-405 mt-1 uppercase font-bold tracking-wider">Calibrate Credit Cycles Sensitivity</p>
          </div>

          <form onSubmit={handleUpdateStress} className="flex flex-wrap items-end gap-4 bg-slate-950 px-4 py-3 rounded-lg border border-slate-850">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Unemployment Increase</label>
              <div className="flex items-center space-x-2.5">
                <input
                  id="unemp-shock-slider"
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={unempShock}
                  onChange={e => setUnempShock(Number(e.target.value))}
                  className="w-28 accent-indigo-505 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-200 w-8">+{unempShock}%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GDP Growth Rate Shock</label>
              <div className="flex items-center space-x-2.5">
                <input
                  id="gdp-shock-slider"
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={gdpChange}
                  onChange={e => setGdpChange(Number(e.target.value))}
                  className="w-28 accent-indigo-505 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className={`text-xs font-mono font-bold w-10 ${gdpChange < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{gdpChange}%</span>
              </div>
            </div>

            <button
              id="run-stress-btn"
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md shadow-indigo-955/10"
            >
              Run Stress Model
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-slate-950/60 border border-slate-855 p-4 rounded-lg">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stress Baseline (ECL)</h4>
            <div className="text-2xl font-black text-slate-105 font-mono mt-1">
              {stressData[0] ? formatCurrency(stressData[0].expectedCreditLoss) : "$0"}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Standard portfolio loss provisioning level</p>
          </div>

          <div className="bg-slate-950/60 border border-amber-500/20 p-4 rounded-lg relative overflow-hidden">
            <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Stressed Write-Off (Moderate)</h4>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {stressData[1] ? formatCurrency(stressData[1].expectedCreditLoss) : "$0"}
            </div>
            <p className="text-[10px] text-amber-500/80 mt-1">Scale: +{(stressData[1]?.expectedCreditLoss / stressData[0]?.expectedCreditLoss * 100 - 100 || 0).toFixed(0)}% provision expansion</p>
          </div>

          <div className="bg-slate-950/60 border border-rose-500/20 p-4 rounded-lg">
            <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Stressed Write-Off (Crisis Mode)</h4>
            <div className="text-2xl font-black text-rose-450 font-mono mt-1">
              {stressData[2] ? formatCurrency(stressData[2].expectedCreditLoss) : "$0"}
            </div>
            <p className="text-[10px] text-rose-500/80 mt-1">Scale: +{(stressData[2]?.expectedCreditLoss / stressData[0]?.expectedCreditLoss * 100 - 100 || 0).toFixed(0)}% shock escalation</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Expected Loss Comparisons */}
        <div className="lg:col-span-6 bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-80-85 p-6 flex flex-col justify-between h-[360px]">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Credit Loss (ECL) Provisions</h3>
            <span className="text-[10px] text-slate-500">Comparing required reserves (ECL) under severe scenarios</span>
          </div>

          <div className="flex-1 w-full h-[220px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stressData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="scenarioName" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatCurrency} />
                <Tooltip contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1e293b", color: "#f1f5f9" }} formatter={(value: any) => [formatCurrency(value), "Required Provision"]} />
                <Bar dataKey="expectedCreditLoss" name="ECL Provisions" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {stressData.map((entry, index) => {
                    let color = "#6366f1";
                    if (index === 1) color = "#f59e0b";
                    if (index === 2) color = "#ef4444";
                    return <Bar key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Adequacy Ratio impacts */}
        <div className="lg:col-span-6 bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-80-85 p-6 flex flex-col justify-between h-[360px]">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital Adequacy Ratio (CAR %) Solvency Impact</h3>
            <span className="text-[10px] text-slate-500">Estimated bank capital strength vs Basel 8.0% minimum boundary</span>
          </div>

          <div className="flex-1 w-full h-[220px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stressData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="scenarioName" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(val) => val + '%'} domain={[0, 15]} />
                <Tooltip contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1e293b", color: "#f1f5f9" }} formatter={(value: any) => [value.toFixed(2) + "%", "Capital CAR"]} />
                <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Basel III Min Rule (8.0%)', fill: '#f87171', position: 'top', fontSize: 9 }} />
                <Line type="monotone" dataKey="capitalAdequacyRatio" name="Capital CAR %" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stress Guide informative cards */}
      <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-850 flex items-start space-x-3">
        <Info className="text-indigo-400 mt-0.5 shrink-0" size={18} />
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Methodology Note: Macro-Structural Multipliers</h4>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Standard credit cycles translate baseline loan traits into stressed outputs through logit elasticities. Standard asset recovery models assume that elevated unemployment reduces the bank-sale recovery price of assets (cars, inventory, real-estate), raising Loss Given Default (LGD). These shocks trigger rapid increases in Expected Credit Losses, depleting equity reserves and affecting simulated Tier-1 Capital Ratios.
          </p>
        </div>
      </div>
    </div>
  );
}
