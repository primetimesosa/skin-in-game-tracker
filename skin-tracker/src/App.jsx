import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Info, TrendingUp, User, FileText, Globe, XCircle, Fingerprint, CheckCircle2, HelpCircle, MessageSquareQuote, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Replace this with your secure AWS API Gateway URL
const AWS_BACKEND_URL = "https://ssmpf1q1y6.execute-api.us-east-1.amazonaws.com/default/SkinInTheGameBackend"; 

const BracketScorer = ({ range }) => {
  const getActiveLevel = (text) => {
    if (!text) return 0;
    const lower = text.toLowerCase();
    if (lower.includes('holds shares') || lower.includes('product conviction')) return 6;
    if (lower.includes('shares') && !lower.includes('none')) {
      const shareCount = parseInt(lower.replace(/,/g, '').match(/\d+/)?.[0] || '0');
      return shareCount > 100000 ? 6 : 4;
    }
    if (lower.includes('over $1') || lower.includes('1,000,000')) return 6;
    if (lower.includes('500,001') || lower.includes('$500k-$1m')) return 5;
    if (lower.includes('100,001') || lower.includes('$100k-$500k')) return 4;
    if (lower.includes('50,001') || lower.includes('$50k-$100k')) return 3;
    if (lower.includes('10,001') || lower.includes('$10k-$50k')) return 2;
    if (lower.includes('$1') || lower.includes('10,000')) return 1;
    return 0; 
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
          <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${level >= i ? (i >= 5 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'bg-indigo-400') : 'bg-slate-700/50'}`} />
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');
  const [hasConfirmedIdentity, setHasConfirmedIdentity] = useState(false);

  // 1. AUTHENTICATION (Mandatory for Firestore)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleSearch = async (e, manualCorrection = null) => {
    if (e) e.preventDefault();
    const searchTicker = manualCorrection ? result.ticker : query.toUpperCase().trim();
    
    if (!searchTicker) return;

    setIsLoading(true);
    setError(null);
    if (!manualCorrection) {
      setResult(null);
      setHasConfirmedIdentity(false);
    }
    setShowCorrection(false);
    
    try {
      // Check if we already have a verified mapping for this ticker in Firestore
      let verifiedName = manualCorrection;
      if (!manualCorrection && user) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'verified_mappings', searchTicker);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          verifiedName = docSnap.data().fundName;
          setHasConfirmedIdentity(true); // Auto-hide prompt if already verified in DB
        }
      }

      const response = await fetch(AWS_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: searchTicker,
          userCorrection: verifiedName 
        })
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

  const handleConfirmIdentity = async () => {
    if (!user || !result) return;
    
    try {
      // Store the verified mapping in the public data collection
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'verified_mappings', result.ticker);
      await setDoc(docRef, {
        ticker: result.ticker,
        fundName: result.name,
        cik: result.cik || null,
        timestamp: new Date().toISOString(),
        verifiedBy: user.uid
      });
      
      // UI feedback: hide the window
      setHasConfirmedIdentity(true);
    } catch (err) {
      console.error("Failed to cache verified mapping:", err);
    }
  };

  const submitCorrection = (e) => {
    e.preventDefault();
    handleSearch(null, correctionInput);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white">Skin in the Game Tracker</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">Precision Audit Engine for SEC Beneficial Ownership Disclosure</p>
        </div>

        <form onSubmit={(e) => handleSearch(e)} className="mb-12 relative max-w-2xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              className="w-full bg-slate-800/50 border-2 border-slate-700/50 text-slate-100 text-lg rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:border-indigo-500/50 uppercase placeholder:normal-case shadow-xl transition-all"
              placeholder="Enter ticker (VOO, BLOX, BTCI, SCHD)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={isLoading || !query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 py-2 px-6 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50">
              {isLoading ? 'Scanning...' : 'Analyze'}
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-pulse">
            <Globe className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-indigo-300 font-medium tracking-wide">Retrieving Official SEC Filings...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center text-red-400 mb-8">
            <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Analysis Interrupted</h3>
            <p className="text-sm max-w-md mx-auto">{error}</p>
          </div>
        )}

        {result && !isLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            
            {/* User Verification Prompt - Disappears on Confirmation */}
            {!hasConfirmedIdentity && !showCorrection && (
              <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-slate-200">Is <span className="text-indigo-300 font-bold underline decoration-indigo-500/50">"{result.name}"</span> the correct fund for this ticker?</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={handleConfirmIdentity} className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Yes, Correct
                  </button>
                  <button onClick={() => setShowCorrection(true)} className="flex-1 md:flex-none px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-all">
                    No, Fix Name
                  </button>
                </div>
              </div>
            )}

            {/* Manual Training Input */}
            {showCorrection && (
              <form onSubmit={submitCorrection} className="bg-slate-800/95 border border-yellow-500/30 rounded-2xl p-6 animate-in zoom-in-95 shadow-2xl">
                <h4 className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4" /> Train FundSkinAI: Provide Correct Name
                </h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <input 
                    type="text" 
                    autoFocus
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:border-yellow-500/50 focus:outline-none transition-all text-white placeholder:text-slate-500"
                    placeholder="Enter the EXACT full fund name (e.g. Nicholas Crypto Income ETF)..."
                    value={correctionInput}
                    onChange={(e) => setCorrectionInput(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="px-6 py-2 bg-yellow-600 text-white rounded-xl text-sm font-bold hover:bg-yellow-500 transition-all">
                      Update Cache
                    </button>
                    <button type="button" onClick={() => setShowCorrection(false)} className="px-4 py-2 text-slate-400 text-sm font-bold hover:text-slate-200">
                      Cancel
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3 italic tracking-wide">Providing a manual name forces a direct SEC lookup and stores the result for future users.</p>
              </form>
            )}

            {/* Main Result Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Database className="w-24 h-24 text-indigo-500" />
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-black rounded-lg text-xs tracking-widest uppercase">{result.ticker}</span>
                  <div className="flex items-center text-[10px] text-slate-500 font-bold tracking-widest bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/30">
                    <Fingerprint className="w-3 h-3 mr-1.5 text-indigo-400" />
                    CIK: {result.cik || 'VERIFIED'}
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-6 leading-tight pr-12">{result.name}</h2>
                <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest relative z-10">
                  <div className="bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700/30 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                    AUM: {result.aum || 'N/A'}
                  </div>
                  <div className="bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700/30 flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                    DATA AS OF: {result.lastFilingDate || 'RECENT'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Alignment Score</p>
                <div className={`px-8 py-4 rounded-3xl border-2 font-black text-3xl transition-all hover:scale-105 shadow-xl ${result.overallScore?.toLowerCase() === 'high' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : result.overallScore?.toLowerCase() === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5' : 'text-red-400 border-red-500/30 bg-red-500/5'}`}>
                  {result.overallScore || 'LOW'}
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium uppercase tracking-tight">Based on total dollar value held by management.</p>
              </div>
            </div>

            {/* Insight Block */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] p-8 flex items-start space-x-6 backdrop-blur-md transition-all hover:bg-indigo-500/10">
              <Info className="w-6 h-6 text-indigo-400 flex-shrink-0" />
              <div>
                <h4 className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest flex items-center gap-2">
                  Audit Context {hasConfirmedIdentity && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] border border-emerald-500/30 font-bold tracking-widest">VERIFIED</span>}
                </h4>
                <p className="text-slate-300 text-sm font-medium italic leading-relaxed">"{result.insight}"</p>
              </div>
            </div>

            {/* Manager Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(result.managers || []).map((m, i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700/50 p-8 rounded-[2rem] hover:bg-slate-800/50 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-1">
                    <User className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{m.name}</h4>
                  </div>
                  <p className="text-slate-500 text-xs mb-8 font-medium">{m.role}</p>
                  <p className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">SEC Reported Range (Rule 16a-1)</p>
                  <p className="text-2xl font-black text-white tracking-tighter transition-all group-hover:translate-x-1">{m.ownershipRange}</p>
                  <BracketScorer range={m.ownershipRange} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}