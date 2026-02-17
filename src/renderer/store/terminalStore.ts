import { create } from 'zustand';

export type AIType = 'claude' | 'gemini';

interface TerminalState {
  aiType: AIType;
  setAIType: (type: AIType) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  aiType: 'claude',
  setAIType: (type) => set({ aiType: type }),
}));
