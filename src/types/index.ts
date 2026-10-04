export type AssistantState =
  | 'STANDBY'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR'
  | 'SLEEPY'
  | 'DIZZY'
  | 'WAVING';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
    result?: string;
    verified?: boolean;
  };
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'summary' | 'custom_command';
  key: string;
  value: string;
  createdAt: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'gemini' | 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'ollama';
  apiKey: string;
  baseUrl: string;
  model: string;
  tested: boolean;
  valid?: boolean;
}

export interface AssistantSettings {
  activeProviderId: string;
  activeModel: string;
  language: 'hinglish' | 'hindi' | 'english';
  personality: 'companion' | 'normal' | 'serious';
  voice: 'Zephyr' | 'Kore' | 'Puck' | 'Fenrir' | 'Charon';
  wakeWordEnabled: boolean;
  wakeWordPhrase: string;
  wakeWordSensitivity: number;
  floatingOverlayEnabled: boolean;
  overlayOpacity: number;
  overlaySize: number;
  bargeInSensitivity: number; // 0 - 100
  speechSpeed: number; // 0.8 - 1.5
  confirmationTiers: {
    low: boolean;
    medium: boolean;
    high: boolean;
  };
}

export interface HighTierConfirmation {
  isOpen: boolean;
  actionType: 'CALL' | 'SMS' | 'WHATSAPP' | 'DELETE_NOTE' | 'TERMUX_DESTRUCTIVE' | 'GITHUB_PUSH';
  title: string;
  recipient?: string;
  details: string;
  command?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
