import { create } from 'zustand';

export type AIType = 'claude' | 'gemini';

export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250115';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';

export const CLAUDE_MODELS: { value: ClaudeModel; label: string }[] = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250115', label: 'Claude Opus 4' },
];

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

interface TerminalState {
  aiType: AIType;
  claudeModel: ClaudeModel;
  geminiModel: GeminiModel;
  setAIType: (type: AIType) => void;
  setClaudeModel: (model: ClaudeModel) => void;
  setGeminiModel: (model: GeminiModel) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  aiType: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-2.5-flash',
  setAIType: (type) => set({ aiType: type }),
  setClaudeModel: (model) => set({ claudeModel: model }),
  setGeminiModel: (model) => set({ geminiModel: model }),
}));
