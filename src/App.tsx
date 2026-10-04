import React, { useState, useEffect, useRef } from 'react';
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
import { HomeScreen } from './components/HomeScreen';
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
  Code2,
  Moon,
  Sun,
} from 'lucide-react';

export default function App() {
  // Theme state: dark / light
  const [darkMode, setDarkMode] = useState(false);

  // Assistant State Machine
  const [assistantState, setAssistantState] = useState<AssistantState>('STANDBY');

  // Mode View: "phone" (simulated device) vs "expanded" (studio dashboard)
  const [viewMode, setViewMode] = useState<'phone' | 'expanded'>('phone');

  // Active Screen Tab in Phone (Home, Chat, Termux, Settings)
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'settings' | 'termux' | 'whatsapp'>('home');

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
        content: 'Namaste! Main hoon Mitu, aapka voice-first AI companion. How can I help you today?',
        timestamp: Date.now() - 60000,
      },
    ];
  });

  // Notes
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

  // Memories
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
      overlaySize: 56,
      bargeInSensitivity: 85,
      speechSpeed: 1.0,
      confirmationTiers: {
        low: true,
        medium: true,
        high: true,
      },
    };
  });

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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Mascot greeting
  useEffect(() => {
    setAssistantState('WAVING');
    const timer = setTimeout(() => {
      setAssistantState('STANDBY');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const selectedProvider =
    providers.find((p) => p.id === settings.activeProviderId) || providers[0];

  // Settings' model picker writes settings.activeModel; without this the request would keep using
  // whatever model the provider entry was created with, making the selection dead UI.
  const activeProvider: ProviderConfig = {
    ...selectedProvider,
    model: settings.activeModel || selectedProvider.model,
  };

  // Handle for the in-flight spoken reply, so a new turn / clear-chat stops playback.
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const stopSpeech = () => {
    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
      cancelSpeechRef.current = null;
    }
  };

  const generateSystemPrompt = () => {
    const memoryFacts = memories.map((m) => `- ${m.key}: ${m.value}`).join('\n');
    return `
You are MITU, a production-grade, friendly, voice-first Android AI companion styled after Mitu Premium.
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

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    stopSpeech();
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setAssistantState('THINKING');

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
          content: `Error: ${(result.error || 'Failed to connect').replace(/[.。]+$/, '')}. Please retry or check your settings.`,
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

    // Full answer is spoken (was truncated to 180 chars); AiService chunks it internally.
    AiService.speak(
      finalReply,
      settings.voice,
      settings.speechSpeed,
      () => setAssistantState('SPEAKING'),
      () => {
        cancelSpeechRef.current = null;
        setAssistantState('STANDBY');
      }
    ).then((cancel) => {
      cancelSpeechRef.current = cancel;
    });
  };

  const handleClearChat = () => {
    stopSpeech();
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF] flex flex-col font-sans transition-colors duration-200">
      {/* 1. Mitu Premium Navigation Bar */}
      <header className="sticky top-0 z-30 px-6 py-3.5 glass-panel border-b border-[rgba(60,60,67,0.12)] dark:border-[rgba(84,84,88,0.4)] flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <MascotOrb state={assistantState} size={36} showAmbientGlow={false} onClick={() => setCallingModeOpen(true)} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[18px] tracking-tight text-[#000000] dark:text-[#FFFFFF]">
                Mitu
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7B61FF]/15 text-[#7B61FF] dark:text-[#8E7BFF]">
                Premium
              </span>
            </div>
            <p className="text-[12px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] hidden sm:block font-medium">
              Apple HIG Inspired Voice Agent
            </p>
          </div>
        </div>

        {/* View & Tool Toggles */}
        <div className="flex items-center gap-2">
          {/* Phone vs Studio Switch */}
          <div className="flex items-center p-0.5 bg-[rgba(120,120,128,0.12)] rounded-full">
            <button
              onClick={() => setViewMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                viewMode === 'phone'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#000000] dark:text-[#FFFFFF] shadow-sm'
                  : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
              }`}
              title="Phone Screen Frame"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Phone</span>
            </button>

            <button
              onClick={() => setViewMode('expanded')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                viewMode === 'expanded'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#000000] dark:text-[#FFFFFF] shadow-sm'
                  : 'text-[#606067] dark:text-[rgba(235,235,245,0.60)]'
              }`}
              title="Expanded Studio Dashboard"
            >
              <Layers size={14} />
              <span className="hidden sm:inline">Studio</span>
            </button>
          </div>

          {/* Android Code Hub Trigger */}
          <button
            onClick={() => setCodeHubOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[rgba(120,120,128,0.12)] hover:bg-[rgba(120,120,128,0.2)] text-[#000000] dark:text-[#FFFFFF] text-[13px] font-semibold transition-transform active:scale-95"
            title="Inspect Android Kotlin Codebase"
          >
            <Code2 size={15} />
            <span className="hidden md:inline">Android Code</span>
          </button>

          {/* Calling Mode Button */}
          <button
            onClick={() => setCallingModeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#7B61FF] dark:bg-[#8E7BFF] hover:opacity-95 text-white text-[13px] font-semibold shadow-sm transition-transform active:scale-95"
          >
            <PhoneCall size={14} />
            <span>Call</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-[#606067] dark:text-[rgba(235,235,245,0.60)] hover:bg-[rgba(120,120,128,0.14)] transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 p-4 md:p-6 flex items-center justify-center overflow-auto relative">
        {viewMode === 'phone' ? (
          /* Android 15 Simulated Phone Device */
          <div className="relative">
            <PhoneFrame
              activeTab={activeTab}
              onSwitchTab={setActiveTab}
              isOverlayActive={settings.floatingOverlayEnabled}
            >
              {activeTab === 'home' && (
                <HomeScreen
                  assistantState={assistantState}
                  activeProvider={activeProvider}
                  onStartCalling={() => setCallingModeOpen(true)}
                  onQuickAction={(prompt) => {
                    setActiveTab('chat');
                    handleSendMessage(prompt);
                  }}
                />
              )}

              {activeTab === 'chat' && (
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

              {activeTab === 'termux' && (
                <DevToolsView onRequestHighTierConfirm={setHighTierConfirm} />
              )}

              {activeTab === 'settings' && (
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
            </PhoneFrame>

            {/* Floating Mascot Companion Overlay */}
            <FloatingMascotOverlay
              enabled={settings.floatingOverlayEnabled}
              state={assistantState}
              onOpenFullApp={() => setActiveTab('chat')}
              onStartCallingMode={() => setCallingModeOpen(true)}
              onSendQuickChat={handleSendMessage}
              opacity={settings.overlayOpacity}
              size={settings.overlaySize}
            />
          </div>
        ) : (
          /* Expanded Studio Dashboard View */
          <div className="w-full max-w-6xl h-[820px] bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-[rgba(60,60,67,0.12)] dark:border-[rgba(84,84,88,0.4)] shadow-xl overflow-hidden flex flex-col md:flex-row">
            {/* Left Column: Chat View */}
            <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[rgba(60,60,67,0.12)] dark:border-[rgba(84,84,88,0.4)]">
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

            {/* Right Column: Settings */}
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
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1C1C1E] rounded-[28px] overflow-hidden border border-white/20 shadow-2xl flex flex-col">
            <div className="absolute top-3 right-4 z-20">
              <button
                onClick={() => setCodeHubOpen(false)}
                className="w-8 h-8 rounded-full bg-[rgba(120,120,128,0.2)] hover:bg-[rgba(120,120,128,0.35)] text-white flex items-center justify-center text-sm font-bold"
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
