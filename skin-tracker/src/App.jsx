import React, { useState } from 'react';
import { Search, ShieldCheck, Info, TrendingUp, User, FileText, Globe, XCircle } from 'lucide-react';

// Replace this with your secure AWS API Gateway URL
const AWS_BACKEND_URL = "https://ssmpf1q1y6.execute-api.us-east-1.amazonaws.com/default/SkinInTheGameBackend"; 

const BracketScorer = ({ range }) => {
  const getActiveLevel = (text) => {
    if (!text) return 0;
    const lower = text.toLowerCase();
    
    // 1. Handle specialized Trust/Sponsor statuses
    if (lower.includes('holds shares') || lower.includes('product conviction') || lower.includes('high alignment')) return 6;
    if (lower.includes('shares') && !lower.includes('none')) {
      const shareCount = parseInt(lower.replace(/,/g, '').match(/\d+/)?.[0] || '0');
      if (shareCount > 100000) return 6; // High conviction share count
      if (shareCount > 10000) return 4;
      return 2;
    }
    
    // 2. Handle standard SEC Dollar Brackets
    if (lower.includes('over $1') || lower.includes('1,000,000')) return 6;
    if (lower.includes('500,001') || lower.includes('$500k-$1m')) return 5;
    if (lower.includes('100,001') || lower.includes('$100k-$500k')) return 4;
    if (lower.includes('50,001') || lower.includes('$50k-$100k')) return 3;
    if (lower.includes('10,001') || lower.includes('$10k-$50k')) return 2;
    if (lower.includes('$1') || lower.includes('10,000')) return 1;
    
    return 0; // "None", "Custodial", or "Not disclosed"
  };

  const level = getActiveLevel(range);

  return (
    <div className="mt-4">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 uppercase tracking-tighter">
        <span>Low Alignment</span>
        <span className="font-bold text-indigo-400">{range || 'None'}</span>
        <span>High Alignment</span>
      </div>
      <div className="flex h-1.5 w-full gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className={`flex-1 rounded-full transition-all duration-500 ${
              level >= i 
                ? i >= 5 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-indigo-400'
                : 'bg-slate-700/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(AWS_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: query.toUpperCase().trim() })
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze ticker. Check backend logs.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    const s = score?.toLowerCase();
    if (s === 'high') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (s === 'medium') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Skin in the Game Tracker
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
            Powered by <span className="text-indigo-400 font-medium text-sm border border-indigo-500/30 px-2 py-0.5 rounded-md">FundSkinAI</span> • Cross-referencing SEC EDGAR & StockAnalysis.com
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-12 relative max-w-2xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              className="w-full bg-slate-800/50 border-2 border-slate-700/50 text-slate-100 text-lg rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all uppercase placeholder:normal-case placeholder:text-slate-600 shadow-2xl"
              placeholder="Ticker (e.g. OUNZ, BLOX, VOO, SCHD)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={isLoading || !query}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-6 rounded-xl transition-all shadow-lg active:scale-95"
            >
              {isLoading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-pulse">
            <Globe className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-indigo-300 font-medium tracking-wide">Retrieving Latest SEC Filings...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 flex flex-col items-center text-center">
            <XCircle className="w-12 h-12 text-red-500/50 mb-4" />
            <h3 className="text-xl font-bold text-red-100 mb-2">Analysis Interrupted</h3>
            <p className="text-red-300/70 max-w-md text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {result && !isLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] backdrop-blur-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-black rounded-lg text-xs tracking-widest uppercase">
                    {result.ticker}
                  </span>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest border border-slate-700/50 px-2 py-1 rounded-md">
                    {result.type || 'ASSET'}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-6 leading-tight">{result.name}</h2>
                <div className="flex flex-wrap gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700/30">
                    <TrendingUp className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                    {result.aum || 'N/A'}
                  </div>
                  <div className="flex items-center bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700/30">
                    <FileText className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                    DATA AS OF: {result.lastFilingDate || 'RECENT'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Alignment Score</p>
                <div className={`px-8 py-4 rounded-3xl border-2 font-black text-3xl tracking-tighter shadow-2xl transition-all hover:scale-105 ${getScoreColor(result.overallScore)}`}>
                  {result.overallScore || 'LOW'}
                </div>
                <p className="text-[10px] text-slate-600 mt-6 font-medium leading-relaxed">
                  Based on total dollar value or shares held by the management team.
                </p>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] p-8 flex items-start space-x-6">
              <div className="bg-indigo-500/20 p-3 rounded-2xl flex-shrink-0">
                <Info className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">FundSkinAI Contextual Analysis</h4>
                <p className="text-slate-300 leading-relaxed text-sm font-medium italic">"{result.insight}"</p>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center ml-4">
                <User className="w-4 h-4 mr-2 text-indigo-500/50" /> 
                Management Team Disclosures
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(result.managers || []).map((manager, idx) => (
                  <div key={idx} className="bg-slate-800/30 border border-slate-700/50 p-8 rounded-[2rem] relative overflow-hidden group hover:bg-slate-800/50 transition-all duration-300">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                    
                    <div className="relative z-10">
                      <h4 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{manager.name}</h4>
                      <p className="text-slate-500 text-xs font-medium mb-8 leading-snug">{manager.role}</p>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reported Ownership</p>
                        <p className="text-2xl font-black text-white tracking-tighter">
                          {manager.ownershipRange || "None"}
                        </p>
                      </div>

                      <BracketScorer range={manager.ownershipRange} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}