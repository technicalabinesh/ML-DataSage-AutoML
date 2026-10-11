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
  Users, 
  Star,
  Layers,
  Activity
} from 'lucide-react';

export default function LoginPage({ presetUsers, currentUser, onLogin, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(currentUser?.name || presetUsers[0].name);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('preset'); // 'preset' or 'custom'

  const handlePresetSelect = (user) => {
    setSelectedPreset(user.name);
    setEmail(user.email);
    setPassword('••••••••');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'preset') {
      const found = presetUsers.find(u => u.name === selectedPreset);
      if (found) {
        onLogin(found);
      }
    } else {
      if (!email.trim()) {
        setError('Please enter your email or username');
        return;
      }
      const namePart = email.split('@')[0];
      const initials = namePart.slice(0, 2).toUpperCase() || 'US';
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const customUser = {
        name: formattedName,
        initials,
        role: 'Data Scientist',
        pipelinesCount: Math.floor(Math.random() * 20) + 1,
        email: email.includes('@') ? email : `${email}@datasage.ai`,
        totalHours: 1.5
      };
      onLogin(customUser);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-slide-up">
      {/* Login Card Bento Grid */}
      <div className="bg-white rounded-[36px] border border-[#e8dfd2] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Col: Brand & Feature Highlights (Pastel Bento) */}
        <div className="md:col-span-5 bg-[#f6eee3] p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#e8dfd2] space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xl shadow-md">
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
                  <span>Usage & History Tracking</span>
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

        {/* Right Col: Sign In Form & Team Switcher */}
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
                  onClick={onCancel}
                  className="text-xs font-black text-[#78716c] hover:text-black cursor-pointer bg-[#f6eee3] px-3 py-1.5 rounded-full"
                >
                  ✕ Close
                </button>
              )}
            </div>

            {/* Mode Tabs */}
            <div className="flex p-1 bg-[#f6eee3] rounded-2xl border border-[#e8dfd2] gap-1">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  mode === 'preset'
                    ? 'bg-[#1c1917] text-white shadow-xs'
                    : 'text-[#78716c] hover:text-black'
                }`}
              >
                Team Workspace Profiles
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  mode === 'custom'
                    ? 'bg-[#1c1917] text-white shadow-xs'
                    : 'text-[#78716c] hover:text-black'
                }`}
              >
                Custom Analyst Login
              </button>
            </div>

            {/* Mode 1: Team Preset Accounts */}
            {mode === 'preset' && (
              <div className="space-y-3">
                <div className="text-[11px] font-black text-[#78716c] uppercase tracking-wider">
                  Select Team Account (One-Click Sign In)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {presetUsers.map((u) => {
                    const isSelected = selectedPreset === u.name;
                    return (
                      <div
                        key={u.name}
                        onClick={() => handlePresetSelect(u)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#1c1917] text-white border-black shadow-md scale-[1.01]'
                            : 'bg-[#fbf8f3] text-[#1c1917] border-[#e8dfd2] hover:border-black'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          isSelected ? 'bg-white text-black' : 'bg-[#1c1917] text-white'
                        }`}>
                          {u.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">{u.name}</div>
                          <div className={`text-[10px] font-bold truncate ${
                            isSelected ? 'text-gray-300' : 'text-[#78716c]'
                          }`}>
                            {u.role}
                          </div>
                          <div className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                            isSelected ? 'text-amber-300' : 'text-gray-500'
                          }`}>
                            {u.pipelinesCount} Pipelines
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Custom Credentials Form */}
            {mode === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#1c1917] block">Work Email or Username</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. abinesh@datasage.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10 py-2.5 text-xs font-bold bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#1c1917] block">Password / Security Key</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 py-2.5 text-xs font-bold bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox Options */}
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

              <span className="text-[11px] font-bold text-gray-500 hover:text-black cursor-pointer">
                Privacy policy
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#fee2e2] text-[#991b1b] text-xs font-black text-center">
                ⚠️ {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              onClick={handleSubmit}
              className="w-full btn-primary text-xs py-3.5 px-6 font-black justify-center flex items-center gap-2 shadow-md cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {mode === 'preset' ? `Sign In as ${selectedPreset}` : 'Sign In to Workspace'}
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

          </div>

          {/* Quick Guest Access */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onLogin(presetUsers[3])}
              className="text-xs font-black text-[#78716c] hover:text-black underline cursor-pointer"
            >
              Or continue with Guest Analyst sandbox session →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
