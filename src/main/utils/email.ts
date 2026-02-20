/** 이메일 리포트 전송을 위한 유틸 함수 */

import { parseMarkdown, type MarkdownStyleStrategy } from '@shared/utils/markdown-parser';

/** 리포트 제목 생성 */
export function buildReportEmailSubject(
  assignee: string,
  startDate: string,
  endDate: string,
): string {
  return `[업무 리포트] ${assignee} (${startDate} ~ ${endDate})`;
}

/** 이메일용 인라인 스타일 전략 */
const emailStyle: MarkdownStyleStrategy = {
  wrapper: {
    open: '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#1f2937;line-height:1.6;max-width:800px;margin:0 auto;">',
    close: '</div>',
  },
  inlineFormat: (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(
        /`(.+?)`/g,
        '<code style="padding:1px 4px;background:#f3f4f6;color:#dc2626;border-radius:3px;font-size:13px;">$1</code>',
      ),
  emptyLine: () => '<br/>',
  horizontalRule: () =>
    '<hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb;"/>',
  heading: (level, text) => {
    const styles: Record<number, string> = {
      1: 'font-size:20px;font-weight:bold;color:#111827;margin:24px 0 12px;',
      2: 'font-size:18px;font-weight:bold;color:#1f2937;margin:20px 0 8px;',
      3: 'font-size:16px;font-weight:600;color:#374151;margin:16px 0 8px;',
      4: 'font-size:14px;font-weight:600;color:#4b5563;margin:12px 0 4px;',
    };
    return `<h${level} style="${styles[level] ?? ''}">${text}</h${level}>`;
  },
  blockquote: {
    open: () =>
      '<div style="border-left:4px solid #93c5fd;padding:4px 16px;margin:8px 0;font-size:14px;color:#4b5563;background:#eff6ff;border-radius:0 4px 4px 0;">',
    close: () => '</div>',
    line: (text) => `<p style="margin:2px 0;">${text}</p>`,
  },
  table: {
    open: () =>
      '<table style="width:100%;font-size:14px;margin:8px 0;border-collapse:collapse;">',
    close: () => '</tbody></table>',
    headerRow: (cells) =>
      `<thead><tr style="border-bottom:2px solid #e5e7eb;background:#f9fafb;">${cells.map((c) => `<th style="text-align:left;padding:6px 12px;font-size:12px;font-weight:500;color:#6b7280;">${c}</th>`).join('')}</tr></thead><tbody>`,
    bodyRow: (cells) =>
      `<tr style="border-bottom:1px solid #f3f4f6;">${cells.map((c) => `<td style="padding:6px 12px;color:#374151;">${c}</td>`).join('')}</tr>`,
  },
  list: (text, indent) => {
    const px = Math.min(indent * 16, 48);
    return `<div style="display:flex;gap:8px;font-size:14px;color:#374151;margin-left:${px}px;"><span style="color:#9ca3af;">•</span><span>${text}</span></div>`;
  },
  paragraph: (text) =>
    `<p style="font-size:14px;color:#374151;line-height:1.6;margin:4px 0;">${text}</p>`,
};

/** 마크다운 → 이메일 HTML 변환 (인라인 스타일 사용) */
export function buildReportEmailHtml(markdown: string): string {
  return parseMarkdown(markdown, emailStyle);
}

/** RFC 2822 이메일 → base64url 인코딩 (Gmail API용) */
export function buildRawEmail(params: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to.join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.html).toString('base64'),
    '',
    `--${boundary}--`,
  ];
  const raw = lines.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
