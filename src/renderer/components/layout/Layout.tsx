import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import ClaudeTerminalPanel from '../terminal/ClaudeTerminalPanel';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-auto">{children}</main>
          <ClaudeTerminalPanel />
        </div>
        <StatusBar />
      </div>
    </div>
  );
}
