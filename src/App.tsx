import React, { useState, useEffect } from 'react';
import {
  AssistantState,
  ChatMessage,
  ProviderConfig,
  AssistantSettings,
  NoteItem,
  MemoryItem,
  HighTierConfirmation,
} from './types';
import { MascotOrb } from './components/MascotOrb';
import { PhoneFrame } from './components/PhoneFrame';
import { ChatView } from './components/ChatView';
import { CallingModeModal } from './components/CallingModeModal';
import { FloatingMascotOverlay } from './components/FloatingMascotOverlay';
import { SettingsView } from './components/SettingsView';
import { DevToolsView } from './components/DevToolsView';
import { AndroidCodeHub } from './components/AndroidCodeHub';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { AiService } from './services/aiService';
import {
  PhoneCall,
  Smartphone,
  Layers,
  Settings,
  Code2,
  Moon,
  Sun,
  Sparkles,
  MessageSquare,
  Globe,
  Youtube,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  // Theme state: Cute Dark and White UI by default
  const [darkMode, setDarkMode] = useState(true);

  // Assistant State Machine
  const [assistantState, setAssistantState] = useState<AssistantState>('STANDBY');

  // Mode View: "phone" (simulated Android frame) vs "expanded" (desktop studio)
  const [viewMode, setViewMode] = useState<'phone' | 'expanded'>('phone');

  // Active Simulated Android App
  const [activeApp, setActiveApp] = useState<'mitu' | 'termux' | 'whatsapp' | 'youtube' | 'browser' | 'settings'>('mitu');

  // Calling Mode Modal Open
  const [callingModeOpen, setCallingModeOpen] = useState(false);

  // Android Codebase Hub Modal Open
  const [codeHubOpen, setCodeHubOpen] = useState(false);

  // HIGH-tier confirmation dialog
  const [highTierConfirm, setHighTierConfirm] = useState<HighTierConfirmation | null>(null);

  // Chat sending status
  const [isSending, setIsSending] = useState(false);

  // Chat Messages (persisted in localStorage)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('mitu_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return [
      {
        id: '1',
        role: 'assistant',
        content: 'Namaste! Main hoon MITU, aapka voice-first Android AI companion. Kaise help karoon aaj?',
        timestamp: Date.now() - 60000,
      },
    ];
  });

  // Notes (persisted in localStorage / Room replica)
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('mitu_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return [
      {
        id: '101',
        title: 'Android Project Build',
        content: 'Verify minSdk 26, compileSdk 35, Jetpack Compose Material 3 & Gemini Live OkHttp WebSocket client.',
        category: 'work',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
    ];
  });

  // Memories (persisted in localStorage)
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    const saved = localStorage.getItem('mitu_memories');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return [
      {
        id: 'm1',
        category: 'preference',
        key: 'Language Preference',
        value: 'Speaks Hindi, English, and natural Hinglish',
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'm2',
        category: 'preference',
        key: 'Companion Tone',
        value: 'Warm, respectful, concise and helpful',
        createdAt: Date.now() - 86400000,
      },
    ];
  });

  // Providers Configuration
  const [providers, setProviders] = useState<ProviderConfig[]>(() => {
    const saved = localStorage.getItem('mitu_providers');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return [
      {
        id: 'gemini',
        name: 'Google Gemini (Native)',
        type: 'gemini',
        apiKey: '',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-3.8-flash',
        tested: true,
        valid: true,
      },
      {
        id: 'groq',
        name: 'Groq (Ultra-Fast)',
        type: 'groq',
        apiKey: '',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        tested: false,
      },
      {
        id: 'openrouter',
        name: 'OpenRouter (Free Models)',
        type: 'openrouter',
        apiKey: '',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        tested: false,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        type: 'anthropic',
        apiKey: '',
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-haiku-latest',
        tested: false,
      },
    ];
  });

  // Settings
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    const saved = localStorage.getItem('mitu_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return {
      activeProviderId: 'gemini',
      activeModel: 'gemini-3.8-flash',
      language: 'hinglish',
      personality: 'companion',
      voice: 'Zephyr',
      wakeWordEnabled: true,
      wakeWordPhrase: 'Hey Mitu',
      wakeWordSensitivity: 80,
      floatingOverlayEnabled: true,
      overlayOpacity: 0.95,
      overlaySize: 64,
      bargeInSensitivity: 85,
      speechSpeed: 1.0,
      confirmationTiers: {
        low: true,
        medium: true,
        high: true,
      },
    };
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('mitu_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('mitu_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('mitu_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem('mitu_providers', JSON.stringify(providers));
  }, [providers]);

  useEffect(() => {
    localStorage.setItem('mitu_settings', JSON.stringify(settings));
  }, [settings]);

  // Synchronize dark mode class on HTML root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Mascot greeting on launch
  useEffect(() => {
    setAssistantState('WAVING');
    const timer = setTimeout(() => {
      setAssistantState('STANDBY');
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  const activeProvider =
    providers.find((p) => p.id === settings.activeProviderId) || providers[0];

  // Dynamic System Prompt incorporating language, persona & memory facts
  const generateSystemPrompt = () => {
    const memoryFacts = memories.map((m) => `- ${m.key}: ${m.value}`).join('\n');
    return `
You are MITU, a production-grade, friendly, voice-first Android AI companion.
Personality: ${settings.personality.toUpperCase()}.
Preferred Language: ${settings.language.toUpperCase()}.
- You speak naturally in Hindi, English, or conversational Hinglish based on what the user speaks.
- Keep spoken answers concise, engaging, warm, and helpful.
- If asked to take high-risk actions (phone calls, sending WhatsApp/SMS, deleting files, running destructive commands), tell the user you will request confirmation.
- If the user says "note bana do [content]" or "create a note", confirm that a note has been created.
User Memory Facts:
${memoryFacts || 'No specific user memory yet.'}
`.trim();
  };

  // Send message handler
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setAssistantState('THINKING');

    // Check voice command for notes: "note bana do ..."
    const noteMatch = text.match(/(?:note bana do|create note|add note)\s*:?\s*(.+)/i);
    let createdNoteTitle: string | null = null;
    if (noteMatch && noteMatch[1]) {
      const noteContent = noteMatch[1].trim();
      const newNote: NoteItem = {
        id: Math.random().toString(),
        title: noteContent.slice(0, 30) + (noteContent.length > 30 ? '...' : ''),
        content: noteContent,
        category: 'voice_notes',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      createdNoteTitle = newNote.title;
    }

    // Call AI Backend
    const systemPrompt = generateSystemPrompt();
    const result = await AiService.sendChatMessage(
      [...messages, userMsg],
      systemPrompt,
      activeProvider
    );

    setIsSending(false);

    if (result.error || !result.text) {
      setAssistantState('ERROR');
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `Error: ${result.error || 'Failed to connect'}. Please retry or check your settings.`,
          timestamp: Date.now(),
        },
      ]);
      setTimeout(() => setAssistantState('STANDBY'), 3500);
      return;
    }

    let finalReply = result.text;
    if (createdNoteTitle && !finalReply.toLowerCase().includes('note')) {
      finalReply = `Bilkul! Mainne note save kar diya: "${createdNoteTitle}".\n\n${finalReply}`;
    }

    const assistantMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'assistant',
      content: finalReply,
      timestamp: Date.now(),
      model: activeProvider.model,
      provider: activeProvider.type,
      toolCall: createdNoteTitle
        ? {
            name: 'NotesTool.createNote',
            args: { title: createdNoteTitle },
            result: 'Success (Verified in Room Database)',
            verified: true,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setAssistantState('SPEAKING');

    // Optionally speak preview
    AiService.speak(
      finalReply.slice(0, 180),
      settings.voice,
      settings.speechSpeed,
      () => setAssistantState('SPEAKING'),
      () => setAssistantState('STANDBY')
    );
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-[#0E0C16] text-[#F5F0FF] flex flex-col font-sans transition-colors duration-200">
      {/* 1. Universal Top Bar in Cute Dark & White */}
      <header className="sticky top-0 z-30 px-6 py-3.5 bg-[#14121F]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <MascotOrb state={assistantState} size={36} onClick={() => setCallingModeOpen(true)} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-white tracking-tight">
                MITU
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                Android Voice AI
              </span>
            </div>
            <p className="text-[11px] text-[#A39BB8] hidden sm:block">
              Voice-first, cute companion assistant
            </p>
          </div>
        </div>

        {/* View & Tool Toggles */}
        <div className="flex items-center gap-2">
          {/* Phone vs Studio Switch */}
          <div className="flex items-center p-1 bg-[#1E1B2E] rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'phone'
                  ? 'bg-white text-[#14121F] shadow-sm font-bold'
                  : 'text-[#A39BB8] hover:text-white'
              }`}
              title="Android Phone Mockup"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Phone View</span>
            </button>

            <button
              onClick={() => setViewMode('expanded')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'expanded'
                  ? 'bg-white text-[#14121F] shadow-sm font-bold'
                  : 'text-[#A39BB8] hover:text-white'
              }`}
              title="Expanded Studio Dashboard"
            >
              <Layers size={14} />
              <span className="hidden sm:inline">Studio View</span>
            </button>
          </div>

          {/* Android Code Hub Trigger */}
          <button
            onClick={() => setCodeHubOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-transform active:scale-95"
            title="Inspect & Export Kotlin Android Project"
          >
            <Code2 size={15} />
            <span className="hidden md:inline">Android Codebase</span>
          </button>

          {/* Calling Mode Button */}
          <button
            onClick={() => setCallingModeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-[#14121F] text-xs font-extrabold shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-transform active:scale-95"
          >
            <PhoneCall size={14} />
            <span>Voice Call</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-2xl text-[#A39BB8] hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* 2. Main Content Body (Target Selector 1: Cute Dark and White Canvas) */}
      <main className="flex-1 p-4 md:p-6 flex items-center justify-center overflow-auto relative bg-[#0E0C16] text-[#F5F0FF] selection:bg-white selection:text-black">
        {/* Cute ambient star sparkles in background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40">
          <div className="absolute top-12 left-16 text-white text-xs animate-pulse">✦</div>
          <div className="absolute top-32 right-24 text-white text-[10px] animate-pulse delay-200">✧</div>
          <div className="absolute bottom-20 left-28 text-white text-sm animate-pulse delay-500">✦</div>
          <div className="absolute bottom-28 right-20 text-white text-[11px] animate-pulse delay-300">✧</div>
          <div className="absolute top-1/2 left-10 text-white/40 text-xs animate-pulse delay-700">✦</div>
          <div className="absolute top-2/3 right-12 text-white/40 text-xs animate-pulse delay-1000">✧</div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.05)_0%,transparent_65%)]" />
        </div>
        {viewMode === 'phone' ? (
          /* Android 15 Simulated Phone Device */
          <div className="relative">
            <PhoneFrame
              activeApp={activeApp}
              onSwitchApp={setActiveApp}
              isOverlayActive={settings.floatingOverlayEnabled}
            >
              {/* App Content inside Phone */}
              {activeApp === 'mitu' && (
                <ChatView
                  messages={messages}
                  assistantState={assistantState}
                  onSendMessage={handleSendMessage}
                  onClearChat={handleClearChat}
                  onLaunchCallingMode={() => setCallingModeOpen(true)}
                  activeProvider={activeProvider}
                  settings={settings}
                  isSending={isSending}
                />
              )}

              {activeApp === 'termux' && (
                <DevToolsView onRequestHighTierConfirm={setHighTierConfirm} />
              )}

              {activeApp === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={(newS) => setSettings((prev) => ({ ...prev, ...newS }))}
                  providers={providers}
                  onUpdateProviders={setProviders}
                  notes={notes}
                  memories={memories}
                  onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                  onForgetMemory={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
                  onClearAllData={() => {
                    setNotes([]);
                    setMemories([]);
                    setMessages([]);
                    localStorage.clear();
                  }}
                />
              )}

              {/* Simulated Third-Party Apps for Operator & Overlay testing */}
              {activeApp === 'whatsapp' && (
                <div className="flex-1 flex flex-col bg-[#ECE5DD] dark:bg-[#121B22] text-xs">
                  <div className="px-4 py-3 bg-[#075E54] text-white flex items-center justify-between font-bold">
                    <span>WhatsApp</span>
                    <span className="text-[10px] font-normal opacity-80">MITU Driving Flow</span>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="p-3 bg-white dark:bg-[#1F2C34] rounded-2xl shadow-sm">
                      <span className="font-bold text-[#075E54] dark:text-[#25D366] block">Rahul Sharma</span>
                      <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8] mt-1">
                        "Mitu, Rahul ko message bhejo: Kal morning session mein milte hain."
                      </p>
                      <button
                        onClick={() => {
                          setHighTierConfirm({
                            isOpen: true,
                            actionType: 'WHATSAPP',
                            title: 'Confirm WhatsApp Message Send',
                            recipient: 'Rahul Sharma (+91 98765 43210)',
                            details: 'Message content: "Kal morning session mein milte hain." Note: Automated WhatsApp sending requires double confirmation per security policy.',
                            onConfirm: () => {
                              alert('WhatsApp Intent executed with verified accessibility tap!');
                            },
                            onCancel: () => {},
                          });
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-[11px] transition-transform active:scale-95"
                      >
                        Simulate Send with Confirmation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeApp === 'youtube' && (
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0F0F0F] text-xs">
                  <div className="px-4 py-3 bg-red-600 text-white font-bold flex items-center justify-between">
                    <span>YouTube Screen Operator</span>
                    <span className="text-[10px] font-normal">Accessibility Service</span>
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-[#1F1F1F] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-bold block">Screen Tree Node Reader:</span>
                      <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                        {`[Node 1: android.widget.EditText (id="search_edit_text", text="Android AI tutorials")]
[Node 2: android.widget.Button (text="Search", clickable=true)]
[Node 3: android.view.ViewGroup (title="Mitu Voice Assistant Tutorial #1", clickable=true)]`}
                      </pre>
                      <button
                        onClick={() => {
                          alert('AccessibilityService operator simulated: Step 1 (Search) -> Step 2 (Read node tree) -> Step 3 (Click first result) completed successfully!');
                        }}
                        className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px]"
                      >
                        Run Multi-step YouTube Flow
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeApp === 'browser' && (
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#121212] text-xs">
                  <div className="px-4 py-2.5 bg-slate-200 dark:bg-[#202020] flex items-center gap-2 text-[11px]">
                    <Globe size={14} className="text-[#4285F4]" />
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                      https://ai.google.dev/gemini-api/docs/live
                    </span>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="p-3 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-[#4285F4]">Controlled Agent Browser</span>
                      <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8]">
                        All DOM text read by the assistant is wrapped inside untrusted data blocks to prevent prompt injection.
                      </p>
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                        {`<UNTRUSTED_CONTENT>\nOfficial Gemini Live WebSocket audio input format: 16kHz PCM16 mono.\nOutput format: 24kHz PCM16 mono.\n</UNTRUSTED_CONTENT>`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </PhoneFrame>

            {/* Floating Mascot Companion Overlay hovering over Phone */}
            <FloatingMascotOverlay
              enabled={settings.floatingOverlayEnabled}
              state={assistantState}
              onOpenFullApp={() => setActiveApp('mitu')}
              onStartCallingMode={() => setCallingModeOpen(true)}
              onSendQuickChat={handleSendMessage}
              opacity={settings.overlayOpacity}
              size={settings.overlaySize}
            />
          </div>
        ) : (
          /* Expanded Studio Dashboard View */
          <div className="w-full max-w-6xl h-[820px] bg-white dark:bg-[#272238] rounded-3xl border border-[#9B8CFF]/20 shadow-xl overflow-hidden flex flex-col md:flex-row">
            {/* Left Column: Chat View */}
            <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#9B8CFF]/15">
              <ChatView
                messages={messages}
                assistantState={assistantState}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                onLaunchCallingMode={() => setCallingModeOpen(true)}
                activeProvider={activeProvider}
                settings={settings}
                isSending={isSending}
              />
            </div>

            {/* Right Column: Settings & Termux Tabs */}
            <div className="w-full md:w-[460px] flex flex-col">
              <SettingsView
                settings={settings}
                onUpdateSettings={(newS) => setSettings((prev) => ({ ...prev, ...newS }))}
                providers={providers}
                onUpdateProviders={setProviders}
                notes={notes}
                memories={memories}
                onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                onForgetMemory={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
                onClearAllData={() => {
                  setNotes([]);
                  setMemories([]);
                  setMessages([]);
                  localStorage.clear();
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Calling Mode Full-screen Voice Overlay */}
      <CallingModeModal
        isOpen={callingModeOpen}
        onClose={() => setCallingModeOpen(false)}
        activeProvider={activeProvider}
        settings={settings}
        systemPrompt={generateSystemPrompt()}
        onNewUserTurn={(txt) => {
          setMessages((prev) => [
            ...prev,
            { id: Math.random().toString(), role: 'user', content: txt, timestamp: Date.now() },
          ]);
        }}
        onNewAssistantTurn={(txt) => {
          setMessages((prev) => [
            ...prev,
            { id: Math.random().toString(), role: 'assistant', content: txt, timestamp: Date.now() },
          ]);
        }}
      />

      {/* 4. Android Project Codebase Hub Modal */}
      {codeHubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1E1A2B] rounded-3xl overflow-hidden border border-[#9B8CFF]/30 shadow-2xl flex flex-col">
            <div className="absolute top-3 right-4 z-20">
              <button
                onClick={() => setCodeHubOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <AndroidCodeHub />
          </div>
        </div>
      )}

      {/* 5. HIGH-Tier Double Confirmation Dialog */}
      <ConfirmationDialog
        confirmation={highTierConfirm}
        onClose={() => setHighTierConfirm(null)}
      />
    </div>
  );
}
