import React, { useState, useEffect } from 'react';
import { Borrower, CreditScores } from '../types';
import { Plus, Search, HelpCircle, HardDrive, Trash2, Filter, Calculator, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface ScoredLedgerRow {
  borrower: Borrower;
  pd: number;
  lgd: number;
  ead: number;
  ecl: number;
  ficoScore: number;
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface UnderwritingLedgerProps {
  onAddLoan: (borrowerData: any) => Promise<any>;
  onResetDatabase: () => Promise<any>;
  onRunCalculations: () => Promise<ScoredLedgerRow[]>;
}

export default function UnderwritingLedger({ onAddLoan, onResetDatabase, onRunCalculations }: UnderwritingLedgerProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [ledger, setLedger] = useState<ScoredLedgerRow[]>([]);
  const [filterPurpose, setFilterPurpose] = useState<string>("ALL");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // New Loan Form values
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newLoan, setNewLoan] = useState<Partial<Borrower>>({
    name: "",
    age: 32,
    income: 82000,
    empLength: 5,
    creditHistLength: 8,
    dti: 19.4,
    existingLoans: 0,
    homeOwnership: 'RENT',
    loanAmount: 25000,
    interestRate: 7.5,
    term: 36,
    purpose: 'PERSONAL'
  });

  useEffect(() => {
    reloadLedger();
  }, []);

  const reloadLedger = async () => {
    setLoading(true);
    try {
      const results = await onRunCalculations();
      setLedger(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Reset underwriting ledger database back to standard sample items?")) {
      setLoading(true);
      try {
        await onResetDatabase();
        const results = await onRunCalculations();
        setLedger(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.name || !newLoan.income || !newLoan.loanAmount) return;
    setLoading(true);
    try {
      await onAddLoan(newLoan);
      setShowAddForm(false);
      setNewLoan({
        name: "",
        age: 32,
        income: 82000,
        empLength: 5,
        creditHistLength: 8,
        dti: 19.4,
        existingLoans: 0,
        homeOwnership: 'RENT',
        loanAmount: 25000,
        interestRate: 7.5,
        term: 36,
        purpose: 'PERSONAL'
      });
      const results = await onRunCalculations();
      setLedger(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLedger = ledger.filter(row => {
    const matchesPurpose = filterPurpose === "ALL" || row.borrower.purpose === filterPurpose;
    const matchesGrade = filterGrade === "ALL" || row.riskGrade === filterGrade;
    const matchesSearch = row.borrower.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          row.borrower.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPurpose && matchesGrade && matchesSearch;
  });

  // Calculate Aggregates
  const totalEad = filteredLedger.reduce((sum, r) => sum + r.ead, 0);
  const totalEcl = filteredLedger.reduce((sum, r) => sum + r.ecl, 0);
  const averageFico = filteredLedger.length > 0 
    ? Math.round(filteredLedger.reduce((sum, r) => sum + r.ficoScore, 0) / filteredLedger.length)
    : 0;

  const getBadgeColor = (grade: string) => {
    switch(grade) {
      case "A": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "B": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "C": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "D": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "E": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-slate-500/15 text-slate-400 border-slate-500/25";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="underwriting-ledger-section">
      {/* Search and Filters Strip */}
      <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              id="search-accounts-input"
              type="text"
              placeholder="Search active accounts by Name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 bg-slate-950/70 text-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <Filter size={13} className="text-slate-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400">Purpose</span>
              <select
                id="filter-purpose-select"
                value={filterPurpose}
                onChange={e => setFilterPurpose(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-800 bg-slate-950 text-slate-200 text-xs select-none focus:border-indigo-500 outline-hidden"
              >
                <option value="ALL">All Purposes</option>
                <option value="MORTGAGE">Mortgage</option>
                <option value="BUSINESS">Business</option>
                <option value="car">Car / Auto</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rating</span>
              <select
                id="filter-grade-select"
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-800 bg-slate-950 text-slate-200 text-xs select-none focus:border-indigo-500 outline-hidden"
              >
                <option value="ALL">All Grades</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
                <option value="E">Grade E</option>
              </select>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>

            <button
              id="new-loan-entry-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1 shadow-sm shadow-indigo-500/10"
            >
              <Plus size={13} />
              <span>New Loan Entry</span>
            </button>

            <button
              id="reset-ledger-btn"
              onClick={handleReset}
              className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center space-x-1"
              title="Reset Database to base ledger files"
            >
              <RefreshCw size={13} />
              <span>Reset Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Overview Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div id="metric-exposure-card" className="bg-[#0f172a]/45 border border-slate-800/80 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Portfolio Exposure</span>
            <span className="text-xl font-black text-slate-100 font-mono inline-block mt-0.5">
              ${Math.round(totalEad).toLocaleString()}
            </span>
          </div>
          <div className="text-xs bg-slate-950 border border-slate-850 p-2 rounded-lg font-mono text-slate-400">
            Accounts: {filteredLedger.length}
          </div>
        </div>

        <div id="metric-lps-card" className="bg-[#0f172a]/45 border border-slate-800/80 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Loss Provisions (ECL)</span>
            <span className="text-xl font-black text-slate-100 font-mono inline-block mt-0.5">
              ${totalEcl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-850 p-2 rounded-lg">
            Provision: {(totalEcl / (totalEad || 1) * 100).toFixed(2)}%
          </div>
        </div>

        <div id="metric-fico-card" className="bg-[#0f172a]/45 border border-slate-800/80 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Average FICO Grade</span>
            <span className="text-xl font-black text-slate-100 font-mono inline-block mt-0.5">
              {averageFico}
            </span>
          </div>
          <div className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 py-1">
            {averageFico >= 660 ? 'Credit Healthy' : 'Subprime Cluster'}
          </div>
        </div>
      </div>

      {/* Add Loan form modal segment */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="bg-[#0f172a]/50 border border-slate-800 p-5 rounded-xl space-y-4 animate-fade-in">
          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Add New Borrower Record</div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Borrower Full Name</label>
              <input
                id="form-borrower-name"
                type="text"
                required
                value={newLoan.name}
                onChange={e => setNewLoan(prev => ({ ...prev, name: e.target.value }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 focus:outline-hidden focus:border-indigo-500"
                placeholder="e.g. Zenith Global Ltd"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Annual Income ($)</label>
              <input
                id="form-annual-income"
                type="number"
                required
                value={newLoan.income}
                onChange={e => setNewLoan(prev => ({ ...prev, income: Number(e.target.value) }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Requested Loan ($)</label>
              <input
                id="form-requested-loan"
                type="number"
                required
                value={newLoan.loanAmount}
                onChange={e => setNewLoan(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">DTI (%)</label>
              <input
                id="form-dti"
                type="number"
                step="0.1"
                required
                value={newLoan.dti}
                onChange={e => setNewLoan(prev => ({ ...prev, dti: Number(e.target.value) }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Emp Length (Yrs)</label>
              <input
                id="form-emp-length"
                type="number"
                required
                value={newLoan.empLength}
                onChange={e => setNewLoan(prev => ({ ...prev, empLength: Number(e.target.value) }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 font-mono focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Ownership</label>
              <select
                id="form-ownership"
                value={newLoan.homeOwnership}
                onChange={e => setNewLoan(prev => ({ ...prev, homeOwnership: e.target.value as any }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 focus:outline-hidden"
              >
                <option value="RENT">RENT</option>
                <option value="MORTGAGE">MORTGAGE</option>
                <option value="OWN">OWN</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Purpose</label>
              <select
                id="form-purpose"
                value={newLoan.purpose}
                onChange={e => setNewLoan(prev => ({ ...prev, purpose: e.target.value as any }))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-850 rounded bg-slate-950 text-slate-200 mt-1 focus:outline-hidden"
              >
                <option value="PERSONAL">PERSONAL</option>
                <option value="MORTGAGE">MORTGAGE</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="CAR">CAR / AUTO</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              id="cancel-loan-btn"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-400 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              id="submit-loan-btn"
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white rounded-lg bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
            >
              Add Borrower
            </button>
          </div>
        </form>
      )}

      {/* Main Ledger Database table */}
      <div className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead className="bg-[#030712]/50 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Borrower Account Name</th>
                <th className="px-4 py-3.5 text-center">FICO</th>
                <th className="px-4 py-3.5 text-center">Grade</th>
                <th className="px-4 py-3.5 text-right">Income</th>
                <th className="px-4 py-3.5 text-right flex-nowrap border-r border-slate-800/20">Exposure (EAD)</th>
                <th className="px-4 py-3.5 text-center">Est. PD</th>
                <th className="px-4 py-3.5 text-center">Est. LGD</th>
                <th className="px-4 py-3.5 text-right">Est. ECL</th>
                <th className="px-4 py-3.5 text-center">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((row) => (
                  <tr key={row.borrower.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-400">{row.borrower.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-100">{row.borrower.name}</td>
                    <td className="px-4 py-3 text-center font-bold font-mono text-slate-200">{row.ficoScore}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-sm border text-[10px] font-bold ${getBadgeColor(row.riskGrade)}`}>
                        {row.riskGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${row.borrower.income.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-100 border-r border-slate-800/20">${Math.round(row.ead).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-mono">{(row.pd * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center font-mono">{(row.lgd * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">${row.ecl.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase font-sans">
                        {row.borrower.purpose}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-500 font-mono italic">
                    {loading ? "Calculating fresh quantitative scores..." : "No borrower ledger items matched current criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
