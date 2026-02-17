import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'es-toolkit';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTerminalStore } from '../store/terminalStore';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { isOpen, aiType, setTerminalId } = useTerminalStore();

  const initTerminal = useCallback(() => {
    if (!containerRef.current || !isOpen) return;

    // 이전 세션 정리
    cleanupRef.current?.();

    const terminal = new Terminal({
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: '#585b70',
      },
      fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const { cols, rows } = terminal;

    window.electronAPI.terminal.create(aiType, undefined, cols, rows).then((id) => {
      setTerminalId(id);

      // PTY 출력 → xterm
      const unsubData = window.electronAPI.terminal.onData((termId, data) => {
        if (termId === id) {
          terminal.write(data);
        }
      });

      // PTY 종료
      const unsubExit = window.electronAPI.terminal.onExit((termId) => {
        if (termId === id) {
          terminal.write('\r\n\x1b[90m[세션 종료]\x1b[0m\r\n');
        }
      });

      // xterm 입력 → PTY
      const onDataDisposable = terminal.onData((data) => {
        window.electronAPI.terminal.write(id, data);
      });

      cleanupRef.current = () => {
        unsubData();
        unsubExit();
        onDataDisposable.dispose();
        window.electronAPI.terminal.close(id);
      };
    });

    // 리사이즈 감시
    const handleResize = debounce(() => {
      fitAddon.fit();
      const termId = useTerminalStore.getState().terminalId;
      if (termId) {
        window.electronAPI.terminal.resize(termId, terminal.cols, terminal.rows);
      }
    }, 100);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      handleResize.cancel();
      resizeObserver.disconnect();
      cleanupRef.current?.();
      cleanupRef.current = null;
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isOpen, aiType, containerRef, setTerminalId]);

  useEffect(() => {
    const cleanup = initTerminal();
    return cleanup;
  }, [initTerminal]);

  return { terminalRef, fitAddonRef };
}
