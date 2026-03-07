import React, { useState } from 'react';
import { Search, ShieldCheck, Info, TrendingUp, User, FileText, ChevronRight, XCircle, Globe } from 'lucide-react';

// ============================================================================
// PRODUCTION SETUP REQUIRED:
// Replace this URL with your actual AWS API Gateway Endpoint URL
// e.g., "https://xyz123.execute-api.us-east-1.amazonaws.com/SkinInTheGameBedrock"
// ============================================================================
const AWS_BACKEND_URL = "https://ssmpf1q1y6.execute-api.us-east-1.amazonaws.com/default/SkinInTheGameBackend"; 

const BracketScorer = ({ score, range }) => {
  const brackets = [
    { label: 'None', minScore: 0 },
    { label: '$1-$10k', minScore: 1 },
    { label: '$10k-$100k', minScore: 2 },
    { label: '$100k-$500k', minScore: 3 },
    { label: '$500k-$1M', minScore: 4 },
    { label: 'Over $1M', minScore: 5 },
  ];

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>None</span>
        <span className="font-semibold text-slate-200">{range}</span>
        <span>$1M+</span>
      </div>
      <div className="flex h-2 w-full gap-1">
        {brackets.map((b, i) => (
          <div 
            key={i} 
            className={`flex-1 rounded-full ${
              score >= b.minScore && b.minScore !== 0
                ? i === 5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                  : i === 4 ? 'bg-emerald-400'
                  : i === 3 ? 'bg-yellow-400'
                  : i === 2 ? 'bg-orange-400'
                  : 'bg-red-400'
                : 'bg-slate-700'
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

    if (AWS_BACKEND_URL === "YOUR_AWS_API_GATEWAY_URL_HERE") {
      setError("System Error: AWS Backend URL has not been configured in the application. Please follow the deployment guide to connect your AWS API Gateway.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    const ticker = query.toUpperCase().trim();

    try {
      // Calling your secure AWS Lambda backend powered by Amazon Bedrock
      const response = await fetch(AWS_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const parsedData = await response.json();

      if (!parsedData.managers || parsedData.managers.length === 0) {
         setError(`Could not find portfolio manager data for "${ticker}". It may be a single stock rather than an ETF/Mutual Fund, or filings are unavailable.`);
      } else {
         setResult(parsedData);
      }
    } catch (err) {
      console.error("Backend Error:", err);
      setError("An error occurred while communicating with the backend server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    switch(score) {
      case 'High': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'Medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'Low': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-2xl mb-4">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Skin in the Game Tracker
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Live web-scanning tool: Discover if mutual fund and ETF portfolio managers are investing their own wealth into their funds.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-12 relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-6 h-6 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-800 border-2 border-slate-700 text-slate-100 text-lg rounded-2xl py-4 pl-14 pr-32 focus:outline-none focus:border-indigo-500 transition-colors uppercase placeholder:normal-case placeholder:text-slate-500"
              placeholder="Enter ANY mutual fund or ETF ticker..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={isLoading || !query}
              className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium py-2.5 px-6 rounded-xl transition-colors"
            >
              {isLoading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
            <Globe className="w-12 h-12 text-indigo-400 animate-spin" />
            <p className="text-slate-400">Analyzing SEC EDGAR data via Amazon Bedrock...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center text-center">
            <XCircle className="w-12 h-12 text-red-400 mb-3" />
            <h3 className="text-xl font-semibold text-red-100 mb-2">Scan Failed</h3>
            <p className="text-red-200/80 max-w-lg">{error}</p>
          </div>
        )}

        {/* Results Dashboard */}
        {result && !isLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-3xl">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg text-sm">
                    {result.ticker}
                  </span>
                  {result.type && (
                    <span className="text-slate-400 text-sm border border-slate-700 px-2 py-1 rounded-md">
                      {result.type}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{result.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                  {result.aum && (
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      AUM: {result.aum}
                    </div>
                  )}
                  {result.lastFilingDate && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Latest Data: {result.lastFilingDate}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                <p className="text-slate-400 font-medium mb-3">Overall Alignment</p>
                <div className={`px-6 py-3 rounded-2xl border-2 font-bold text-2xl uppercase tracking-wider shadow-lg ${getScoreColor(result.overallScore)}`}>
                  {result.overallScore}
                </div>
                <p className="text-xs text-slate-500 mt-4 max-w-[200px]">
                  Based on total dollar value held by the management team.
                </p>
              </div>
            </div>

            {/* AI Insight / Context */}
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-6 flex items-start space-x-4">
              <div className="bg-indigo-500/20 p-2 rounded-full flex-shrink-0 mt-1">
                <Info className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-indigo-300 font-semibold mb-1">AI Analysis & Context</h4>
                <p className="text-indigo-100/80 leading-relaxed">{result.insight}</p>
              </div>
            </div>

            {/* Managers List */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-400" /> 
                Portfolio Managers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.managers.map((manager, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-500 transition-colors">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                    
                    <div className="relative z-10">
                      <h4 className="text-xl font-bold text-white mb-1">{manager.name}</h4>
                      <p className="text-slate-400 text-sm mb-6">{manager.role}</p>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reported Ownership</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {manager.ownershipRange || "Unknown"}
                        </p>
                      </div>

                      <BracketScorer score={manager.score || 0} range={manager.ownershipRange || "N/A"} />
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