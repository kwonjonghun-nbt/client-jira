import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}
