import React, { useState, useRef, useEffect } from 'react';
import { AssistantState, ChatMessage, ProviderConfig, AssistantSettings } from '../types';
import { MascotOrb } from './MascotOrb';
import { Send, Mic, Copy, Check, Trash2, PhoneCall, Sparkles } from 'lucide-react';

interface ChatViewProps {
  messages: ChatMessage[];
  assistantState: AssistantState;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onLaunchCallingMode: () => void;
  activeProvider: ProviderConfig;
  settings: AssistantSettings;
  isSending: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  assistantState,
  onSendMessage,
  onClearChat,
  onLaunchCallingMode,
  activeProvider,
  settings,
  isSending,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = () => {
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const suggestions = [
    'Mitu, note bana do: Grocery list milk, bread, butter',
    'Explain how neural networks learn in natural Hinglish',
    'Termux: Check git status and repo commits',
    'Draft WhatsApp message to Rahul: Meeting at 5pm?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141220] text-white">
      {/* Top Header Card with Mascot & Status */}
      <div className="px-5 pt-3 pb-3 border-b border-white/10 bg-[#171526]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MascotOrb state={assistantState} size={48} onClick={onLaunchCallingMode} />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold font-display text-white">
                MITU
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                READY
              </span>
            </div>
            <p className="text-[11px] text-[#A39BB8]">
              {activeProvider.type.toUpperCase()} · {activeProvider.model.split('/').pop()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Calling Mode Trigger */}
          <button
            onClick={onLaunchCallingMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-sm transition-transform active:scale-95"
            title="Start Voice Calling Mode"
          >
            <PhoneCall size={13} />
            <span>Call</span>
          </button>

          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-xl text-[#A39BB8] hover:text-white hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 my-auto">
            <MascotOrb state="STANDBY" size={130} onClick={onLaunchCallingMode} />
            <h3 className="font-display font-bold text-lg text-white mt-3">
              Namaste! Main hoon MITU
            </h3>
            <p className="text-xs text-[#A39BB8] mt-1 max-w-[280px]">
              Aapka friendly voice-first Android AI companion. Speak or type in Hindi, English, or Hinglish!
            </p>

            {/* Suggestion Chips */}
            <div className="mt-5 w-full flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-white" /> Try asking:
              </span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="text-xs text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl px-3 py-2 transition-colors text-left"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
              >
                <div
                  className={`max-w-[85%] rounded-[22px] px-4 py-2.5 text-xs leading-relaxed shadow-sm transition-all ${
                    isUser
                      ? 'bg-[#252236] text-white border border-white/20 rounded-tr-xs'
                      : 'bg-white text-[#12101B] rounded-tl-xs shadow-md font-medium'
                  }`}
                >
                  {/* Message Content */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool Call / Action Badge if applicable */}
                  {msg.toolCall && (
                    <div className="mt-2 pt-2 border-t border-black/10 text-[11px] text-slate-800">
                      <span className="font-bold text-black">Action: {msg.toolCall.name}</span>
                      <pre className="mt-1 font-mono text-[10px] bg-black/5 p-1.5 rounded-lg overflow-x-auto">
                        {JSON.stringify(msg.toolCall.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Footer Timestamp & Copy */}
                  <div className={`mt-1 flex items-center justify-between text-[10px] ${isUser ? 'text-white/60' : 'text-slate-500'}`}>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="ml-2 hover:opacity-100 flex items-center gap-0.5"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Thinking Indicator */}
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-[#A39BB8]">
            <MascotOrb state="THINKING" size={28} />
            <span className="italic">Mitu is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#171526]/90 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center gap-2 bg-[#1E1B2E] border border-white/15 rounded-3xl px-3 py-1.5 shadow-sm">
          <button
            onClick={onLaunchCallingMode}
            className="p-2 rounded-full text-white hover:bg-white/15 transition-transform active:scale-95"
            title="Start Voice Calling Mode"
          >
            <Mic size={18} />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type in Hindi, English, Hinglish..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`p-2 rounded-full transition-all active:scale-95 ${
              inputText.trim() && !isSending
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/30 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
