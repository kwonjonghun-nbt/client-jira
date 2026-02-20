import { Notification } from 'electron';
import { buildTaskNotificationBody } from '../utils/notification';

interface TaskNotificationParams {
  title: string;
  status: 'done' | 'error';
}

export function showTaskNotification({ title, status }: TaskNotificationParams): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title,
    body: buildTaskNotificationBody(status),
    silent: false,
  });

  notification.show();
}
