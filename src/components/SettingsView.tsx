import React, { useState } from 'react';
import { ProviderConfig, AssistantSettings, NoteItem, MemoryItem } from '../types';
import { AiService } from '../services/aiService';
import {
  Cpu,
  Volume2,
  Mic,
  Smile,
  Database,
  Shield,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Trash2,
  Key,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: Partial<AssistantSettings>) => void;
  providers: ProviderConfig[];
  onUpdateProviders: (providers: ProviderConfig[]) => void;
  notes: NoteItem[];
  memories: MemoryItem[];
  onDeleteNote: (id: string) => void;
  onForgetMemory: (id: string) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  providers,
  onUpdateProviders,
  notes,
  memories,
  onDeleteNote,
  onForgetMemory,
  onClearAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'voice' | 'wake' | 'personality' | 'memory' | 'security' | 'overlay'>('providers');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; message: string }>>({});

  const handleTestKey = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    const result = await AiService.testApiKey(provider);
    setTestResults((prev) => ({ ...prev, [provider.id]: result }));
    setTestingId(null);
  };

  const handleExportData = () => {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      notes,
      memories,
      settings: {
        language: settings.language,
        personality: settings.personality,
        voice: settings.voice,
        wakeWordEnabled: settings.wakeWordEnabled,
      },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitu_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FFF8F0] dark:bg-[#1E1A2B] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#9B8CFF]/15 bg-white/60 dark:bg-[#272238]/60 backdrop-blur-md">
        <h2 className="text-base font-bold font-display text-[#2B2540] dark:text-[#F5F0FF]">
          MITU Settings
        </h2>
        <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
          Configure AI brain, live voice, memory & security policies
        </p>
      </div>

      {/* Tabs Horizontal Scroller */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#9B8CFF]/15 overflow-x-auto no-scrollbar bg-white/40 dark:bg-[#272238]/40">
        {[
          { id: 'providers', label: 'AI Providers', icon: Cpu },
          { id: 'voice', label: 'Voice & Call', icon: Volume2 },
          { id: 'wake', label: 'Wake Word', icon: Mic },
          { id: 'personality', label: 'Persona', icon: Smile },
          { id: 'overlay', label: 'Overlay', icon: Layers },
          { id: 'memory', label: 'Memory & Notes', icon: Database },
          { id: 'security', label: 'Security Tiers', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#9B8CFF] text-white shadow-sm'
                  : 'bg-white/70 dark:bg-[#272238]/70 text-[#6B6380] dark:text-[#A39BB8] hover:text-[#2B2540] dark:hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#2B2540] dark:text-[#F5F0FF]">
        {/* 1. AI PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="p-3 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl">
              <span className="font-bold text-[#9B8CFF] uppercase text-[10px] tracking-wider block mb-1">
                Active Provider Selection
              </span>
              <p className="text-[#6B6380] dark:text-[#A39BB8] text-[11px] mb-2.5">
                Choose which model powers MITU's conversation and tool execution:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onUpdateSettings({ activeProviderId: p.id, activeModel: p.model });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      settings.activeProviderId === p.id
                        ? 'border-[#9B8CFF] bg-[#9B8CFF]/15 text-[#2B2540] dark:text-white ring-1 ring-[#9B8CFF]'
                        : 'border-[#9B8CFF]/15 bg-white/50 dark:bg-black/20 text-[#6B6380] dark:text-[#A39BB8]'
                    }`}
                  >
                    <span className="font-bold text-xs">{p.name}</span>
                    <span className="text-[10px] opacity-75 font-mono truncate">{p.model}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Configuration List */}
            <div className="space-y-3">
              <span className="font-bold text-[#9B8CFF] uppercase text-[10px] tracking-wider block">
                Configured Providers & Keys
              </span>

              {providers.map((provider) => {
                const testRes = testResults[provider.id];
                return (
                  <div
                    key={provider.id}
                    className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Key size={14} className="text-[#9B8CFF]" />
                        <span className="font-bold text-xs">{provider.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9B8CFF]/20 text-[#9B8CFF] font-semibold uppercase">
                        {provider.type}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] block mb-1">
                        API Key (Stored Encrypted via Android Keystore)
                      </label>
                      <input
                        type="password"
                        value={provider.apiKey}
                        onChange={(e) => {
                          const updated = providers.map((pr) =>
                            pr.id === provider.id ? { ...pr, apiKey: e.target.value } : pr
                          );
                          onUpdateProviders(updated);
                        }}
                        placeholder={provider.type === 'gemini' ? 'Uses Server/Local Key' : 'Enter API Key'}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 dark:bg-[#1E1A2B] border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] block mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={provider.model}
                        onChange={(e) => {
                          const updated = providers.map((pr) =>
                            pr.id === provider.id ? { ...pr, model: e.target.value } : pr
                          );
                          onUpdateProviders(updated);
                        }}
                        className="w-full text-xs p-2 rounded-xl bg-slate-50 dark:bg-[#1E1A2B] border border-slate-200 dark:border-slate-700 font-mono outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleTestKey(provider)}
                        disabled={testingId === provider.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#9B8CFF]/20 hover:bg-[#9B8CFF]/30 text-[#9B8CFF] text-[11px] font-semibold transition-colors"
                      >
                        {testingId === provider.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Cpu size={12} />
                        )}
                        <span>Test Provider Key</span>
                      </button>

                      {testRes && (
                        <div className="flex items-center gap-1 text-[11px]">
                          {testRes.valid ? (
                            <span className="text-[#A8E6CF] flex items-center gap-1 font-semibold">
                              <CheckCircle2 size={13} /> Valid
                            </span>
                          ) : (
                            <span className="text-[#FF7A7A] flex items-center gap-1 font-semibold">
                              <XCircle size={13} /> {testRes.message.slice(0, 20)}...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. VOICE & CALLING MODE TAB */}
        {activeTab === 'voice' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2">
              <label className="font-bold block text-xs">Assistant Voice Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'].map((v) => (
                  <button
                    key={v}
                    onClick={() => onUpdateSettings({ voice: v as any })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      settings.voice === v
                        ? 'border-[#9B8CFF] bg-[#9B8CFF]/20 text-[#2B2540] dark:text-white'
                        : 'border-[#9B8CFF]/15 text-[#6B6380] dark:text-[#A39BB8]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-bold text-xs">Barge-in Interruption</label>
                <span className="text-[#9B8CFF] font-semibold">{settings.bargeInSensitivity}%</span>
              </div>
              <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
                Allows interrupting Mitu instantly (&lt;300ms) when you start speaking or say "Stop".
              </p>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.bargeInSensitivity}
                onChange={(e) => onUpdateSettings({ bargeInSensitivity: parseInt(e.target.value) })}
                className="w-full accent-[#9B8CFF]"
              />
            </div>

            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-bold text-xs">Speaking Speed</label>
                <span className="text-[#9B8CFF] font-semibold">{settings.speechSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={settings.speechSpeed}
                onChange={(e) => onUpdateSettings({ speechSpeed: parseFloat(e.target.value) })}
                className="w-full accent-[#9B8CFF]"
              />
            </div>
          </div>
        )}

        {/* 3. WAKE WORD TAB */}
        {activeTab === 'wake' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs">Wake Word Engine</h4>
                  <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
                    Activates Mitu from background or standby
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wakeWordEnabled}
                  onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#9B8CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] block mb-1">
                  Trigger Phrase
                </label>
                <select
                  value={settings.wakeWordPhrase}
                  onChange={(e) => onUpdateSettings({ wakeWordPhrase: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1E1A2B] border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="Hey Mitu">"Hey Mitu"</option>
                  <option value="Mitu">"Mitu"</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Sensitivity</span>
                  <span className="font-semibold text-[#9B8CFF]">{settings.wakeWordSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={settings.wakeWordSensitivity}
                  onChange={(e) => onUpdateSettings({ wakeWordSensitivity: parseInt(e.target.value) })}
                  className="w-full accent-[#9B8CFF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. PERSONALITY & LANGUAGE TAB */}
        {activeTab === 'personality' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2">
              <label className="font-bold block text-xs">Primary Language Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'hinglish', label: 'Hinglish (Natural)' },
                  { id: 'hindi', label: 'Hindi (हिंदी)' },
                  { id: 'english', label: 'English' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onUpdateSettings({ language: l.id as any })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                      settings.language === l.id
                        ? 'border-[#9B8CFF] bg-[#9B8CFF]/20 text-[#2B2540] dark:text-white'
                        : 'border-[#9B8CFF]/15 text-[#6B6380] dark:text-[#A39BB8]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2">
              <label className="font-bold block text-xs">Companion Persona</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'companion', label: 'Companion (Warm)' },
                  { id: 'normal', label: 'Normal (Helpful)' },
                  { id: 'serious', label: 'Serious (Concise)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onUpdateSettings({ personality: p.id as any })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                      settings.personality === p.id
                        ? 'border-[#9B8CFF] bg-[#9B8CFF]/20 text-[#2B2540] dark:text-white'
                        : 'border-[#9B8CFF]/15 text-[#6B6380] dark:text-[#A39BB8]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. OVERLAY TAB */}
        {activeTab === 'overlay' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs">Floating Companion Overlay</h4>
                  <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
                    Floats Mitu on top of all Android apps
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.floatingOverlayEnabled}
                  onChange={(e) => onUpdateSettings({ floatingOverlayEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#9B8CFF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Overlay Size</span>
                  <span className="font-semibold text-[#9B8CFF]">{settings.overlaySize}px</span>
                </div>
                <input
                  type="range"
                  min="48"
                  max="96"
                  value={settings.overlaySize}
                  onChange={(e) => onUpdateSettings({ overlaySize: parseInt(e.target.value) })}
                  className="w-full accent-[#9B8CFF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Overlay Opacity</span>
                  <span className="font-semibold text-[#9B8CFF]">{Math.round(settings.overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={settings.overlayOpacity}
                  onChange={(e) => onUpdateSettings({ overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-[#9B8CFF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. MEMORY & NOTES TAB */}
        {activeTab === 'memory' && (
          <div className="space-y-3.5">
            {/* Notes List */}
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2.5">
              <span className="font-bold text-xs block">Room Database Notes ({notes.length})</span>
              {notes.length === 0 ? (
                <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8] italic">No notes created yet. Say "Mitu, note bana do..."</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E1A2B] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="font-bold text-xs">{n.title}</h5>
                        <p className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] line-clamp-1">{n.content}</p>
                      </div>
                      <button
                        onClick={() => onDeleteNote(n.id)}
                        className="text-[#FF7A7A] hover:bg-[#FF7A7A]/15 p-1 rounded-lg transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Memory Items */}
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2.5">
              <span className="font-bold text-xs block">Assistant Memories ({memories.length})</span>
              {memories.length === 0 ? (
                <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8] italic">No memories recorded.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E1A2B] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#9B8CFF]">{m.category}</span>
                        <p className="text-xs font-semibold">{m.key}: <span className="font-normal">{m.value}</span></p>
                      </div>
                      <button
                        onClick={() => onForgetMemory(m.id)}
                        className="text-[#FF7A7A] hover:bg-[#FF7A7A]/15 p-1 rounded-lg text-[10px] font-semibold"
                      >
                        Forget
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Backup & Wipe Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#9B8CFF] text-white font-semibold text-xs transition-transform active:scale-95"
              >
                <Download size={13} />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={onClearAllData}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#FF7A7A]/15 text-[#FF7A7A] hover:bg-[#FF7A7A]/25 font-semibold text-xs transition-colors"
              >
                <Trash2 size={13} />
                <span>Wipe All Data</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. SECURITY TIERS TAB */}
        {activeTab === 'security' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white dark:bg-[#272238] border border-[#9B8CFF]/20 rounded-2xl space-y-2.5">
              <h4 className="font-bold text-xs text-[#9B8CFF]">Action Confirmation Tiers</h4>
              <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
                MITU enforces strict security tiers to prevent unauthorized execution.
              </p>

              <div className="space-y-2 mt-2">
                <div className="p-2.5 rounded-xl bg-[#A8E6CF]/15 border border-[#A8E6CF]/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#2B2540] dark:text-[#A8E6CF] text-xs">LOW TIER (Auto-run)</span>
                    <p className="text-[10px] text-[#6B6380] dark:text-[#A39BB8]">Open apps, read screen, flashlight, volume</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#A8E6CF]">AUTO</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FFD966]/15 border border-[#FFD966]/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#2B2540] dark:text-[#FFD966] text-xs">MEDIUM TIER (Voice Confirm)</span>
                    <p className="text-[10px] text-[#6B6380] dark:text-[#A39BB8]">Delete note, forget memory, modify setting</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#FFD966]">SPOKEN</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FF7A7A]/15 border border-[#FF7A7A]/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#2B2540] dark:text-[#FF7A7A] text-xs">HIGH TIER (Double Confirm)</span>
                    <p className="text-[10px] text-[#6B6380] dark:text-[#A39BB8]">Phone call, SMS, WhatsApp send, destructive bash commands</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#FF7A7A]">TAP + VOICE</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
