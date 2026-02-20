/** 마크다운 → HTML 변환을 위한 공유 파서 + 스타일 전략 패턴 */

export interface MarkdownStyleStrategy {
  /** 전체 래퍼 (이메일용 div 등; 불필요하면 빈 문자열) */
  wrapper: { open: string; close: string };
  /** 인라인 포맷 변환 (bold, code 등) */
  inlineFormat: (text: string) => string;
  /** 빈 줄 출력 */
  emptyLine: () => string;
  /** 수평선 출력 */
  horizontalRule: () => string;
  /** 헤딩 (level: 1~4) */
  heading: (level: number, text: string) => string;
  /** blockquote 컨테이너 열기/닫기, 내부 라인 */
  blockquote: {
    open: () => string;
    close: () => string;
    line: (text: string) => string;
  };
  /** 테이블 */
  table: {
    open: () => string;
    close: () => string;
    headerRow: (cells: string[]) => string;
    bodyRow: (cells: string[]) => string;
  };
  /** 리스트 아이템 (indent: 들여쓰기 레벨 0·1·2…) */
  list: (text: string, indent: number) => string;
  /** 일반 단락 */
  paragraph: (text: string) => string;
}

/** 파서 내부 상태 */
interface ParserState {
  inTable: boolean;
  inBlockquote: boolean;
}

/**
 * 마크다운 문자열을 style 전략에 따라 HTML로 변환한다.
 *
 * 두 파서(email.ts / reports.ts)의 공통 파싱 알고리즘을 하나로 통합한 구현이다.
 * 출력 형식(인라인 스타일 vs Tailwind 클래스)은 style 객체가 결정한다.
 */
export function parseMarkdown(markdown: string, style: MarkdownStyleStrategy): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let state: ParserState = { inTable: false, inBlockquote: false };

  if (style.wrapper.open) html.push(style.wrapper.open);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // frontmatter 스킵
    if (i === 0 && line.trim() === '---') {
      while (++i < lines.length && lines[i].trim() !== '---') {
        // skip
      }
      continue;
    }

    // blockquote 종료 감지
    if (state.inBlockquote && !line.startsWith('>')) {
      html.push(style.blockquote.close());
      state = { ...state, inBlockquote: false };
    }

    // 테이블 종료 감지
    if (state.inTable && !line.startsWith('|')) {
      html.push('</tbody></table>');
      state = { ...state, inTable: false };
    }

    // 빈 줄
    if (line.trim() === '') {
      html.push(style.emptyLine());
      continue;
    }

    // 수평선
    if (/^---+$/.test(line.trim())) {
      html.push(style.horizontalRule());
      continue;
    }

    // 헤딩
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = style.inlineFormat(headingMatch[2]);
      html.push(style.heading(level, text));
      continue;
    }

    // blockquote
    if (line.startsWith('>')) {
      if (!state.inBlockquote) {
        html.push(style.blockquote.open());
        state = { ...state, inBlockquote: true };
      }
      html.push(style.blockquote.line(style.inlineFormat(line.slice(1).trim())));
      continue;
    }

    // 테이블
    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      // 구분선 행 스킵
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;

      if (!state.inTable) {
        state = { ...state, inTable: true };
        html.push(style.table.open());
        html.push(style.table.headerRow(cells.map((c) => style.inlineFormat(c))));
      } else {
        html.push(style.table.bodyRow(cells.map((c) => style.inlineFormat(c))));
      }
      continue;
    }

    // 리스트
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2);
      html.push(style.list(style.inlineFormat(listMatch[2]), indent));
      continue;
    }

    // 일반 단락
    html.push(style.paragraph(style.inlineFormat(line)));
  }

  // 블록 닫기
  if (state.inTable) html.push('</tbody></table>');
  if (state.inBlockquote) html.push(style.blockquote.close());

  if (style.wrapper.close) html.push(style.wrapper.close);

  return html.join('\n');
}
