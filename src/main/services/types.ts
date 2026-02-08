import type { BrowserWindow } from 'electron';

// 모든 서비스 인스턴스를 담는 컨테이너 타입
// 서비스가 구현되면 import 추가

export interface AppServices {
  mainWindow: BrowserWindow | null;
  // Step 4~8에서 추가될 서비스 참조
  storage: any;
  credentials: any;
  jiraClient: any;
  sync: any;
  scheduler: any;
  terminal: any;
}
