import React, { useState } from 'react';
import { Terminal, ShieldAlert, GitBranch, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { HighTierConfirmation } from '../types';

interface DevToolsViewProps {
  onRequestHighTierConfirm: (confirmData: HighTierConfirmation) => void;
}

export const DevToolsView: React.FC<DevToolsViewProps> = ({
  onRequestHighTierConfirm,
}) => {
  const [termuxStatus, setTermuxStatus] = useState<'READY' | 'PERMISSION_MISSING' | 'NOT_INSTALLED'>('READY');
  const [commandInput, setCommandInput] = useState('git status');
  const [commandHistory, setCommandHistory] = useState<Array<{ cmd: string; output: string; exitCode: number }>>([
    {
      cmd: 'pwd',
      output: '/data/data/com.termux/files/home/mitu-assistant',
      exitCode: 0,
    },
    {
      cmd: 'git status',
      output: 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n\tmodified:   app/build.gradle.kts\n\tnew file:   app/src/main/java/com/mitu/assistant/live/GeminiLiveClient.kt',
      exitCode: 0,
    },
  ]);

  const [githubPat, setGithubPat] = useState('');
  const [githubStatus, setGithubStatus] = useState<string | null>(null);

  // Safety blocklist for destructive shell patterns
  const BLOCKED_PATTERNS = [
    /rm\s+-rf\s+\//,
    /rm\s+-rf\s+~/,
    /mkfs/,
    /dd\s+if=/,
    /:\(\)\{.*:\|:&\};:/, // fork bomb
    />\s*\/dev\/sd/,
  ];

  const handleRunCommand = () => {
    const rawCmd = commandInput.trim();
    if (!rawCmd) return;

    // 1. Check blocked destructive commands
    const isHardBlocked = BLOCKED_PATTERNS.some((pattern) => pattern.test(rawCmd));
    if (isHardBlocked) {
      setCommandHistory((prev) => [
        ...prev,
        {
          cmd: rawCmd,
          output: 'SECURITY BLOCK: This command contains a destructive or prohibited pattern.',
          exitCode: 126,
        },
      ]);
      return;
    }

    // 2. Check if HIGH-tier confirmation is needed (e.g. rm, git push, kill)
    const isDangerous = rawCmd.startsWith('rm ') || rawCmd.startsWith('git push') || rawCmd.startsWith('kill');
    if (isDangerous) {
      onRequestHighTierConfirm({
        isOpen: true,
        actionType: 'TERMUX_DESTRUCTIVE',
        title: 'Confirm Dangerous Shell Command',
        command: rawCmd,
        details: `This command will execute in Termux environment: "${rawCmd}". Untrusted scripts cannot run automatically without explicit confirmation.`,
        onConfirm: () => executeCommand(rawCmd),
        onCancel: () => {},
      });
      return;
    }

    executeCommand(rawCmd);
  };

  const executeCommand = (cmd: string) => {
    let mockOutput = '';
    let exit = 0;

    if (cmd === 'pwd') {
      mockOutput = '/data/data/com.termux/files/home/mitu-assistant';
    } else if (cmd.startsWith('git status')) {
      mockOutput = 'On branch main\nnothing to commit, working tree clean';
    } else if (cmd.startsWith('ls')) {
      mockOutput = 'app/\ngradle/\nbuild.gradle.kts\ngradle.properties\nsettings.gradle.kts';
    } else if (cmd.startsWith('cat')) {
      mockOutput = '// MITU Android Assistant Root Configuration\ncompileSdk = 35\nminSdk = 26';
    } else if (cmd.startsWith('pkg')) {
      mockOutput = 'git/stable 2.44.0 aarch64\nopenjdk-17/stable 17.0.10 aarch64\nnodejs/stable 20.11.1 aarch64';
    } else {
      mockOutput = `[termux execution]: completed command '${cmd}' with code 0.`;
    }

    setCommandHistory((prev) => [...prev, { cmd, output: mockOutput, exitCode: exit }]);
    setCommandInput('');
  };

  const testGithubToken = async () => {
    if (!githubPat) {
      setGithubStatus('Please enter a GitHub Personal Access Token');
      return;
    }
    setGithubStatus('Testing PAT with api.github.com/user...');
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubPat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        const user = await res.json();
        setGithubStatus(`Connected as @${user.login} (${user.public_repos} public repos)`);
      } else {
        setGithubStatus(`Authentication failed: HTTP ${res.status}`);
      }
    } catch (e: any) {
      setGithubStatus(`Network error: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1E1A2B] text-slate-200 overflow-hidden font-mono text-xs">
      {/* Top Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-emerald-400" />
          <span className="font-bold text-slate-100 text-xs">Termux & Dev Console</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">{termuxStatus}</span>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
        <div className="text-[11px] text-slate-400 border-b border-slate-800 pb-2">
          MITU Termux Bridge v1.0.0 (API 35 · aarch64)<br />
          External app intents enabled: <span className="text-emerald-400">true</span> (~/.termux/termux.properties)
        </div>

        {commandHistory.map((h, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <span>$</span>
              <span className="text-slate-100">{h.cmd}</span>
            </div>
            <pre className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded-lg whitespace-pre-wrap overflow-x-auto border border-slate-800/60">
              {h.output}
            </pre>
            <div className="text-[10px] text-slate-500">
              Exit code: {h.exitCode}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Input */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRunCommand();
          }}
          placeholder="e.g. git status, ls, pwd, pkg list"
          className="flex-1 bg-transparent text-xs text-slate-100 outline-none font-mono"
        />
        <button
          onClick={handleRunCommand}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold flex items-center gap-1 text-[11px]"
        >
          <Play size={11} />
          <span>Run</span>
        </button>
      </div>

      {/* GitHub Integration Drawer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-200 font-bold">
            <GitBranch size={13} className="text-[#9B8CFF]" />
            <span>GitHub REST API Integration</span>
          </div>
          {githubStatus && (
            <span className="text-[10px] text-slate-400">{githubStatus}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={githubPat}
            onChange={(e) => setGithubPat(e.target.value)}
            placeholder="GitHub Personal Access Token (repo, workflow)"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-[10px] outline-none"
          />
          <button
            onClick={testGithubToken}
            className="px-2.5 py-1.5 rounded-lg bg-[#9B8CFF] hover:bg-[#8875FF] text-white font-semibold text-[10px]"
          >
            Verify PAT
          </button>
        </div>
      </div>
    </div>
  );
};
