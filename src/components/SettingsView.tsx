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
  ChevronRight,
  Info,
  Sliders,
  Terminal,
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
      settings,
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
    <div className="flex-1 flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF] overflow-y-auto px-4 py-5 select-none space-y-6">
      {/* 1. Large Title */}
      <div className="pt-1 px-1">
        <h1 className="text-[34px] font-bold leading-[41px] tracking-tight text-[#000000] dark:text-[#FFFFFF]">
          Settings
        </h1>
        <p className="text-[15px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] mt-0.5">
          Mitu Premium Preferences
        </p>
      </div>

      {/* 2. Group 1: AI Provider & Engine */}
      <div className="space-y-1.5">
        <span className="text-[13px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider px-3">
          AI Engine & Providers
        </span>
        <div className="inset-group rounded-[20px] bg-white dark:bg-[#1C1C1E] divide-y divide-[rgba(60,60,67,0.12)] dark:divide-[rgba(84,84,88,0.3)] shadow-sm">
          {providers.map((p) => {
            const isSelected = settings.activeProviderId === p.id;
            const testRes = testResults[p.id];
            return (
              <div key={p.id} className="p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-[29px] h-[29px] rounded-lg bg-[#7B61FF]/15 dark:bg-[#8E7BFF]/20 flex items-center justify-center text-[#7B61FF] dark:text-[#8E7BFF]">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <div className="text-[16px] font-semibold tracking-tight">{p.name}</div>
                      <div className="text-[12px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] font-mono">{p.model}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdateSettings({ activeProviderId: p.id, activeModel: p.model })}
                    className={`px-3 py-1 rounded-full text-[13px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#7B61FF] dark:bg-[#8E7BFF] text-white shadow-sm'
                        : 'bg-[rgba(120,120,128,0.12)] text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Select'}
                  </button>
                </div>

                {/* API Key Input */}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="password"
                    value={p.apiKey}
                    onChange={(e) => {
                      const updated = providers.map((pr) => (pr.id === p.id ? { ...pr, apiKey: e.target.value } : pr));
                      onUpdateProviders(updated);
                    }}
                    placeholder={p.type === 'gemini' ? 'Uses Server/Local Secret' : 'Enter API Key'}
                    className="flex-1 text-[13px] px-3 py-1.5 rounded-xl bg-[rgba(120,120,128,0.08)] dark:bg-[rgba(120,120,128,0.16)] outline-none border border-transparent focus:border-[#7B61FF]/40"
                  />
                  <button
                    onClick={() => handleTestKey(p)}
                    disabled={testingId === p.id}
                    className="px-3 py-1.5 rounded-xl bg-[rgba(120,120,128,0.12)] hover:bg-[rgba(120,120,128,0.2)] text-[12px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    {testingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                    <span>Test</span>
                  </button>
                </div>

                {testRes && (
                  <div className="text-[12px] flex items-center gap-1.5 pt-0.5">
                    {testRes.valid ? (
                      <span className="text-[#34C759] flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={13} /> Key verified successfully
                      </span>
                    ) : (
                      <span className="text-[#FF3B30] flex items-center gap-1 font-semibold">
                        <XCircle size={13} /> {testRes.message}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] leading-[16px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] px-3 pt-1">
          All API keys are encrypted at rest using Android Keystore AES-256-GCM.
        </p>
      </div>

      {/* 3. Group 2: Voice & Calling Preferences */}
      <div className="space-y-1.5">
        <span className="text-[13px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider px-3">
          Voice & Interaction
        </span>
        <div className="inset-group rounded-[20px] bg-white dark:bg-[#1C1C1E] divide-y divide-[rgba(60,60,67,0.12)] dark:divide-[rgba(84,84,88,0.3)] shadow-sm">
          {/* Voice Selector */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#34C759]/15 flex items-center justify-center text-[#34C759]">
                <Volume2 size={16} />
              </div>
              <span className="text-[16px] font-medium">Assistant Voice</span>
            </div>
            <select
              value={settings.voice}
              onChange={(e) => onUpdateSettings({ voice: e.target.value as any })}
              className="text-[15px] font-semibold bg-transparent text-[#7B61FF] dark:text-[#8E7BFF] outline-none cursor-pointer"
            >
              {['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'].map((v) => (
                <option key={v} value={v} className="bg-white dark:bg-[#1C1C1E] text-black dark:text-white">
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#FF9F0A]/15 flex items-center justify-center text-[#FF9F0A]">
                <Smile size={16} />
              </div>
              <span className="text-[16px] font-medium">Primary Language</span>
            </div>
            <select
              value={settings.language}
              onChange={(e) => onUpdateSettings({ language: e.target.value as any })}
              className="text-[15px] font-semibold bg-transparent text-[#7B61FF] dark:text-[#8E7BFF] outline-none cursor-pointer"
            >
              <option value="hinglish" className="bg-white dark:bg-[#1C1C1E] text-black dark:text-white">Hinglish (Natural)</option>
              <option value="hindi" className="bg-white dark:bg-[#1C1C1E] text-black dark:text-white">Hindi (हिंदी)</option>
              <option value="english" className="bg-white dark:bg-[#1C1C1E] text-black dark:text-white">English</option>
            </select>
          </div>

          {/* Barge-in Sensitivity Slider */}
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[15px]">
              <span className="font-medium">Barge-in Interruption</span>
              <span className="text-[#7B61FF] dark:text-[#8E7BFF] font-semibold">{settings.bargeInSensitivity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={settings.bargeInSensitivity}
              onChange={(e) => onUpdateSettings({ bargeInSensitivity: parseInt(e.target.value) })}
              className="w-full accent-[#7B61FF] dark:accent-[#8E7BFF]"
            />
          </div>
        </div>
        <p className="text-[12px] leading-[16px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] px-3 pt-1">
          Saying "stop" or speaking cuts assistant audio playback within 300ms.
        </p>
      </div>

      {/* 4. Group 3: Wake Word & Floating Overlay */}
      <div className="space-y-1.5">
        <span className="text-[13px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider px-3">
          Standby & Companion
        </span>
        <div className="inset-group rounded-[20px] bg-white dark:bg-[#1C1C1E] divide-y divide-[rgba(60,60,67,0.12)] dark:divide-[rgba(84,84,88,0.3)] shadow-sm">
          {/* Wake Word iOS Switch */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF]">
                <Mic size={16} />
              </div>
              <div>
                <span className="text-[16px] font-medium block">Wake Word Activation</span>
                <span className="text-[12px] text-[#606067] dark:text-[rgba(235,235,245,0.60)]">"{settings.wakeWordPhrase}"</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.wakeWordEnabled}
                onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-[rgba(120,120,128,0.28)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#34C759]" />
            </label>
          </div>

          {/* Floating Mascot Overlay iOS Switch */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#34C759]/15 flex items-center justify-center text-[#34C759]">
                <Layers size={16} />
              </div>
              <div>
                <span className="text-[16px] font-medium block">Floating Mascot Overlay</span>
                <span className="text-[12px] text-[#606067] dark:text-[rgba(235,235,245,0.60)]">Floats over third-party apps</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.floatingOverlayEnabled}
                onChange={(e) => onUpdateSettings({ floatingOverlayEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-[rgba(120,120,128,0.28)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#34C759]" />
            </label>
          </div>
        </div>
      </div>

      {/* 5. Group 4: Data, Notes & Backup */}
      <div className="space-y-1.5">
        <span className="text-[13px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider px-3">
          Data & Privacy
        </span>
        <div className="inset-group rounded-[20px] bg-white dark:bg-[#1C1C1E] divide-y divide-[rgba(60,60,67,0.12)] dark:divide-[rgba(84,84,88,0.3)] shadow-sm">
          <button
            onClick={handleExportData}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[rgba(120,120,128,0.06)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF]">
                <Download size={16} />
              </div>
              <span className="text-[16px] font-medium">Export Notes & Memory JSON</span>
            </div>
            <ChevronRight size={18} className="text-[#606067] dark:text-[rgba(235,235,245,0.40)]" />
          </button>

          <button
            onClick={onClearAllData}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FF3B30]/10 transition-colors text-[#FF3B30]"
          >
            <div className="flex items-center gap-3">
              <div className="w-[29px] h-[29px] rounded-lg bg-[#FF3B30]/15 flex items-center justify-center text-[#FF3B30]">
                <Trash2 size={16} />
              </div>
              <span className="text-[16px] font-semibold">Delete All My Data</span>
            </div>
            <span className="text-[13px] font-medium opacity-80">Wipe DB & Keys</span>
          </button>
        </div>
        <p className="text-[12px] leading-[16px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] px-3 pt-1">
          Mitu does not collect telemetry or log conversation transcripts to external analytics.
        </p>
      </div>
    </div>
  );
};
