import React, { useState } from 'react';
import { 
  LogIn, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Lock, 
  Mail, 
  Key, 
  ArrowRight, 
  User, 
  UserCheck,
  Star,
  Layers,
  Activity,
  Zap
} from 'lucide-react';

export default function LoginPage({ currentUser, onLogin, onCancel }) {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'guest'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleUserLoginSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email or username');
      return;
    }
    
    const namePart = email.split('@')[0].trim();
    const initials = namePart.length >= 2 
      ? namePart.slice(0, 2).toUpperCase() 
      : namePart.toUpperCase() || 'US';
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    
    const authenticatedUser = {
      name: formattedName,
      initials,
      role: 'ML Data Analyst',
      pipelinesCount: Math.floor(Math.random() * 15) + 3,
      email: email.includes('@') ? email.trim() : `${email.trim()}@datasage.ai`,
      isGuest: false,
      totalHours: 3.5
    };
    
    onLogin(authenticatedUser);
  };

  const handleGuestLogin = () => {
    const guestUser = {
      name: 'Guest Analyst',
      initials: 'GA',
      role: 'Guest Explorer',
      pipelinesCount: 0,
      email: 'guest@datasage.ai',
      isGuest: true,
      totalHours: 0.5
    };
    onLogin(guestUser);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 animate-slide-up">
      {/* Login Card Bento Box */}
      <div className="bg-white rounded-[36px] border border-[#e8dfd2] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Col: Brand & Highlights */}
        <div className="md:col-span-5 bg-[#f6eee3] p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#e8dfd2] space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1c1917] text-white flex items-center justify-center font-black text-xl shadow-md">
              <span className="text-lime-300">⚡</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1c1917] tracking-tight">
                ML DataSage AI
              </h2>
              <p className="text-xs font-bold text-[#57534e] mt-1">
                Autonomous Predictive Intelligence Studio
              </p>
            </div>

            {/* Feature Mini Cards */}
            <div className="space-y-2.5 pt-2">
              <div className="card-coral p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#1c1917]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>15+ AutoML Algorithms</span>
                </div>
                <p className="text-[11px] font-bold text-[#44403c]">
                  LightGBM, XGBoost, CatBoost, Random Forest & Neural Nets
                </p>
              </div>

              <div className="card-peach p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#1c1917]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Multi-Dataset Ingestion</span>
                </div>
                <p className="text-[11px] font-bold text-[#44403c]">
                  Upload multiple CSVs, concatenate schemas & auto-profile
                </p>
              </div>

              <div className="card-mint p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#1c1917]">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-Time Hours Tracking</span>
                </div>
                <p className="text-[11px] font-bold text-[#44403c]">
                  Track pipeline hours, training runs & data health scores
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e8dfd2] text-[11px] font-bold text-[#78716c] flex items-center justify-between">
            <span>Production v2.4 • Render Cloud</span>
            <span className="text-emerald-700 font-black">● Systems Online</span>
          </div>
        </div>

        {/* Right Col: Two Options (Sign In & Guest Login) */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#1c1917]">
                  Sign In to Studio
                </h3>
                <p className="text-xs font-bold text-[#78716c] mt-1">
                  Access your machine learning models, datasets & pipeline history
                </p>
              </div>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-black text-[#78716c] hover:text-black cursor-pointer bg-[#f6eee3] px-3.5 py-1.5 rounded-full hover:bg-[#ece4d8] transition-all"
                >
                  ✕ Close
                </button>
              )}
            </div>

            {/* Toggle Switcher: Sign In vs Guest Login */}
            <div className="flex p-1 bg-[#f6eee3] rounded-2xl border border-[#e8dfd2] gap-1">
              <button
                type="button"
                onClick={() => { setActiveTab('user'); setError(''); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'user'
                    ? 'bg-[#1c1917] text-white shadow-sm'
                    : 'text-[#78716c] hover:text-black'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveTab('guest'); setError(''); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'guest'
                    ? 'bg-[#1c1917] text-white shadow-sm'
                    : 'text-[#78716c] hover:text-black'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Guest Login</span>
              </button>
            </div>

            {/* OPTION 1: SIGN IN / USER LOGIN */}
            {activeTab === 'user' && (
              <form onSubmit={handleUserLoginSubmit} className="space-y-4 animate-slide-up">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#1c1917] block">
                    Work Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. hari@datasage.ai"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="input-field pl-10 py-3 text-xs font-bold bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917] rounded-xl w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#1c1917] block">
                    Password / Access Key
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 py-3 text-xs font-bold bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917] rounded-xl w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#1c1917]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 accent-black rounded cursor-pointer"
                    />
                    <span>Remember session on this device</span>
                  </label>
                  <span className="text-[11px] font-bold text-[#78716c] hover:text-black cursor-pointer">
                    Privacy policy
                  </span>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-[#fee2e2] text-[#991b1b] text-xs font-black text-center">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full btn-primary text-xs py-3.5 px-6 font-black justify-center flex items-center gap-2 shadow-md cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Studio</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('guest'); setError(''); }}
                    className="text-xs font-black text-[#78716c] hover:text-black underline cursor-pointer"
                  >
                    Or continue with Guest Analyst sandbox session →
                  </button>
                </div>
              </form>
            )}

            {/* OPTION 2: GUEST LOGIN */}
            {activeTab === 'guest' && (
              <div className="space-y-4 animate-slide-up">
                <div className="bg-[#fbf8f3] p-5 rounded-2xl border border-[#e8dfd2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#c8f2da] text-emerald-950 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      Instant Sandbox Access
                    </span>
                    <span className="text-xs font-bold text-[#78716c]">Zero Setup Required</span>
                  </div>

                  <h4 className="text-lg font-black text-[#1c1917]">
                    Continue as Guest Analyst
                  </h4>
                  <p className="text-xs font-semibold text-[#57534e] leading-relaxed">
                    Explore the full AutoML suite immediately: upload datasets, run automated feature cleaning, detect problem objectives, train ML algorithms, and query the AI Analyst without needing credentials.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#44403c]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Full access to 15+ AutoML algorithms & datasets</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#44403c]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Live data cleaning, evaluation & inference engine</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#44403c]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Autonomous AI Chat Analyst reasoning</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full btn-primary text-xs py-4 px-6 font-black justify-center flex items-center gap-2.5 shadow-md cursor-pointer bg-[#1c1917] hover:bg-black text-white"
                >
                  <Zap className="w-4 h-4 text-lime-300" />
                  <span>Launch Guest Studio Session</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('user'); setError(''); }}
                    className="text-xs font-black text-[#78716c] hover:text-black underline cursor-pointer"
                  >
                    Already have credentials? Sign In here →
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="pt-2 text-center text-[11px] font-bold text-[#78716c]">
            Secure session with local persistent browser storage
          </div>

        </div>

      </div>
    </div>
  );
}
