import { create } from 'zustand';

export type AIType = 'claude' | 'gemini';

interface TerminalState {
  isOpen: boolean;
  terminalId: string | null;
  aiType: AIType;

  toggleTerminal: () => void;
  closeTerminal: () => void;
  setTerminalId: (id: string | null) => void;
  setAIType: (type: AIType) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  isOpen: false,
  terminalId: null,
  aiType: 'claude',

  toggleTerminal: () => set((s) => {
    if (s.isOpen && s.terminalId) {
      window.electronAPI.terminal.close(s.terminalId);
      return { isOpen: false, terminalId: null };
    }
    return { isOpen: !s.isOpen };
  }),
  closeTerminal: () => {
    const { terminalId } = useTerminalStore.getState();
    if (terminalId) {
      window.electronAPI.terminal.close(terminalId);
    }
    set({ isOpen: false, terminalId: null });
  },
  setTerminalId: (id) => set({ terminalId: id }),
  setAIType: (type) => {
    // PTY 정리는 useTerminal cleanup에 위임
    set({ aiType: type, terminalId: null });
  },
}));
