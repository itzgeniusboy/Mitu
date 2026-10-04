import React, { useState, useRef, useEffect } from 'react';
import { AssistantState, ChatMessage, ProviderConfig, AssistantSettings } from '../types';
import { MascotOrb } from './MascotOrb';
import { ArrowUp, Mic, Copy, Check, Trash2, Phone, Share2, Sparkles } from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF]">
      {/* 1. Header with subtle collapsing appearance */}
      <div className="px-5 pt-3 pb-3 border-b border-[rgba(60,60,67,0.14)] dark:border-[rgba(84,84,88,0.4)] glass-panel flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <MascotOrb state={assistantState} size={42} showAmbientGlow={false} onClick={onLaunchCallingMode} />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[17px] font-semibold leading-[22px] tracking-tight text-[#000000] dark:text-[#FFFFFF]">
                Mitu
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            </div>
            <p className="text-[12px] leading-[16px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] font-medium">
              {activeProvider.name.split(' ')[0]} · {activeProvider.model.split('/').pop()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Calling Trigger */}
          <button
            onClick={onLaunchCallingMode}
            className="w-9 h-9 rounded-full bg-[#7B61FF]/15 hover:bg-[#7B61FF]/25 text-[#7B61FF] dark:text-[#8E7BFF] flex items-center justify-center transition-transform active:scale-95"
            title="Start Voice Calling"
          >
            <Phone size={17} />
          </button>

          {/* Clear Messages */}
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="w-9 h-9 rounded-full hover:bg-[rgba(120,120,128,0.16)] text-[#606067] dark:text-[rgba(235,235,245,0.60)] flex items-center justify-center transition-colors"
              title="Clear Conversation"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Messages List (iMessage style) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 my-auto">
            <MascotOrb state="STANDBY" size={130} onClick={onLaunchCallingMode} />
            <h3 className="text-[20px] font-semibold tracking-tight text-[#000000] dark:text-[#FFFFFF] mt-3">
              Namaste! Main hoon Mitu
            </h3>
            <p className="text-[14px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] mt-1 max-w-[280px]">
              Aapka voice-first AI companion. Speak or type in Hindi, English, or Hinglish.
            </p>

            {/* Suggestions */}
            <div className="mt-6 w-full flex flex-col gap-2 text-left">
              <span className="text-[12px] font-semibold text-[#606067] dark:text-[rgba(235,235,245,0.60)] uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#7B61FF]" /> Suggestions
              </span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="text-[14px] text-left px-4 py-2.5 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.12)] dark:border-[rgba(255,255,255,0.12)] text-[#000000] dark:text-[#FFFFFF] hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-[0.98] shadow-sm"
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
                  className={`max-w-[82%] rounded-[20px] px-4 py-2.5 text-[15px] leading-[21px] transition-all shadow-sm ${
                    isUser
                      ? 'bg-[#7B61FF] dark:bg-[#8E7BFF] text-white rounded-br-sm'
                      : 'bg-[rgba(120,120,128,0.14)] dark:bg-[rgba(120,120,128,0.24)] text-[#000000] dark:text-[#FFFFFF] rounded-bl-sm'
                  }`}
                >
                  {/* Bubble Content */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool Call Tag if applicable */}
                  {msg.toolCall && (
                    <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[12px]">
                      <span className="font-semibold text-[#7B61FF] dark:text-[#8E7BFF]">Verified: {msg.toolCall.name}</span>
                    </div>
                  )}

                  {/* Timestamp & Copy affordance */}
                  <div
                    className={`mt-1 flex items-center justify-between text-[11px] ${
                      isUser ? 'text-white/70' : 'text-[#606067] dark:text-[rgba(235,235,245,0.50)]'
                    }`}
                  >
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
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check size={11} className="text-[#34C759]" />
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

        {/* Streaming text soft caret thinking state */}
        {isSending && (
          <div className="flex items-center gap-2 text-[14px] text-[#606067] dark:text-[rgba(235,235,245,0.60)] py-1">
            <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-pulse" />
            <span className="font-medium">Mitu is typing</span>
            <span className="inline-block w-1.5 h-3.5 bg-[#7B61FF] animate-pulse" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Glass Compose Bar with morphing mic/send button */}
      <div className="p-3 border-t border-[rgba(60,60,67,0.12)] dark:border-[rgba(84,84,88,0.4)] glass-panel z-20">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.14)] dark:border-[rgba(255,255,255,0.14)] rounded-full px-3.5 py-1.5 shadow-sm">
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
            placeholder="iMessage in Hindi, English, Hinglish..."
            className="flex-1 bg-transparent text-[15px] text-[#000000] dark:text-[#FFFFFF] outline-none placeholder:text-[#606067]/60 dark:placeholder:text-[rgba(235,235,245,0.40)] py-1"
          />

          {/* Morphing Mic vs Send button */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-8 h-8 rounded-full bg-[#7B61FF] dark:bg-[#8E7BFF] text-white flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm"
              title="Send Message"
            >
              <ArrowUp size={16} strokeWidth={2.6} />
            </button>
          ) : (
            <button
              onClick={onLaunchCallingMode}
              className="w-8 h-8 rounded-full bg-[rgba(120,120,128,0.14)] text-[#7B61FF] dark:text-[#8E7BFF] flex items-center justify-center transition-transform active:scale-90"
              title="Voice Input"
            >
              <Mic size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
