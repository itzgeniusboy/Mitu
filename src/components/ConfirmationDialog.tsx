import React from 'react';
import { HighTierConfirmation } from '../types';
import { ShieldAlert, AlertTriangle, Phone, MessageSquare, Terminal, Trash2, GitCommit, X, Check } from 'lucide-react';

interface ConfirmationDialogProps {
  confirmation: HighTierConfirmation | null;
  onClose: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  confirmation,
  onClose,
}) => {
  if (!confirmation || !confirmation.isOpen) return null;

  const getIcon = () => {
    switch (confirmation.actionType) {
      case 'CALL':
        return <Phone className="text-[#FF7A7A]" size={24} />;
      case 'SMS':
      case 'WHATSAPP':
        return <MessageSquare className="text-[#FF7A7A]" size={24} />;
      case 'TERMUX_DESTRUCTIVE':
        return <Terminal className="text-[#FF7A7A]" size={24} />;
      case 'DELETE_NOTE':
        return <Trash2 className="text-[#FF7A7A]" size={24} />;
      case 'GITHUB_PUSH':
        return <GitCommit className="text-[#FF7A7A]" size={24} />;
      default:
        return <ShieldAlert className="text-[#FF7A7A]" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#FFF8F0] dark:bg-[#1E1A2B] border-2 border-[#FF7A7A]/40 rounded-[28px] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF7A7A]/15 flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#FF7A7A] uppercase tracking-wider block">
              HIGH-TIER SECURITY CHECK
            </span>
            <h3 className="text-base font-bold font-display text-[#2B2540] dark:text-[#F5F0FF]">
              {confirmation.title}
            </h3>
          </div>
        </div>

        {/* Action Details */}
        <div className="p-3 bg-white dark:bg-[#272238] border border-[#FF7A7A]/25 rounded-2xl space-y-2 text-xs text-[#2B2540] dark:text-[#F5F0FF]">
          {confirmation.recipient && (
            <div>
              <span className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] block">Recipient:</span>
              <span className="font-bold text-xs">{confirmation.recipient}</span>
            </div>
          )}

          {confirmation.command && (
            <div>
              <span className="text-[10px] text-[#6B6380] dark:text-[#A39BB8] block">Command to execute:</span>
              <pre className="p-2 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto mt-1">
                {confirmation.command}
              </pre>
            </div>
          )}

          <p className="text-[11px] text-[#6B6380] dark:text-[#A39BB8] leading-relaxed">
            {confirmation.details}
          </p>
        </div>

        {/* Voice & Tap double confirmation notice */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#FF7A7A] font-semibold bg-[#FF7A7A]/10 p-2.5 rounded-xl">
          <AlertTriangle size={15} />
          <span>Double Confirmation required: tap Confirm or say "Mitu Confirm".</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              confirmation.onCancel();
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-[#6B6380] dark:text-[#A39BB8] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>

          <button
            onClick={() => {
              confirmation.onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#FF7A7A] hover:bg-[#e65555] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-transform active:scale-95"
          >
            <Check size={14} />
            <span>Confirm & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
