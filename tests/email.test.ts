import { describe, it, expect } from 'vitest';
import {
  buildReportEmailSubject,
  buildReportEmailHtml,
  buildRawEmail,
} from '../src/main/utils/email';

describe('buildReportEmailSubject', () => {
  it('담당자와 기간이 포함된 제목을 생성한다', () => {
    const subject = buildReportEmailSubject('홍길동', '2026-02-01', '2026-02-14');
    expect(subject).toBe('[업무 리포트] 홍길동 (2026-02-01 ~ 2026-02-14)');
  });

  it('전체 담당자인 경우에도 정상 생성한다', () => {
    const subject = buildReportEmailSubject('전체', '2026-01-01', '2026-01-31');
    expect(subject).toBe('[업무 리포트] 전체 (2026-01-01 ~ 2026-01-31)');
  });
});

describe('buildReportEmailHtml', () => {
  it('빈 문자열은 빈 래퍼 div를 반환한다', () => {
    const html = buildReportEmailHtml('');
    expect(html).toContain('<div style="');
    expect(html).toContain('</div>');
  });

  it('h1 헤딩을 변환한다', () => {
    const html = buildReportEmailHtml('# 업무 리포트');
    expect(html).toContain('<h1');
    expect(html).toContain('업무 리포트');
    expect(html).toContain('font-size:20px');
  });

  it('h2 헤딩을 변환한다', () => {
    const html = buildReportEmailHtml('## 수치 요약');
    expect(html).toContain('<h2');
    expect(html).toContain('수치 요약');
    expect(html).toContain('font-size:18px');
  });

  it('h3 헤딩을 변환한다', () => {
    const html = buildReportEmailHtml('### 세부 항목');
    expect(html).toContain('<h3');
    expect(html).toContain('font-size:16px');
  });

  it('bold 텍스트를 strong으로 변환한다', () => {
    const html = buildReportEmailHtml('**중요한 내용**입니다');
    expect(html).toContain('<strong>중요한 내용</strong>');
  });

  it('인라인 코드를 code 태그로 변환한다', () => {
    const html = buildReportEmailHtml('`코드` 입니다');
    expect(html).toContain('<code style="');
    expect(html).toContain('코드');
  });

  it('리스트 항목을 변환한다', () => {
    const html = buildReportEmailHtml('- 항목1\n- 항목2');
    expect(html).toContain('항목1');
    expect(html).toContain('항목2');
    // bullet point 포함
    const bulletCount = (html.match(/•/g) || []).length;
    expect(bulletCount).toBe(2);
  });

  it('테이블을 변환한다', () => {
    const md = '| 항목 | 수치 |\n|------|------|\n| 총 이슈 | 10건 |';
    const html = buildReportEmailHtml(md);
    expect(html).toContain('<table');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th');
    expect(html).toContain('항목');
    expect(html).toContain('총 이슈');
    expect(html).toContain('10건');
  });

  it('blockquote를 변환한다', () => {
    const html = buildReportEmailHtml('> 인용문입니다');
    expect(html).toContain('border-left:4px solid');
    expect(html).toContain('인용문입니다');
  });

  it('수평선을 변환한다', () => {
    const html = buildReportEmailHtml('텍스트\n---');
    expect(html).toContain('<hr');
  });

  it('frontmatter를 스킵한다', () => {
    const md = '---\ntitle: test\n---\n# 제목';
    const html = buildReportEmailHtml(md);
    expect(html).not.toContain('title: test');
    expect(html).toContain('제목');
  });

  it('인라인 스타일을 사용한다 (CSS 클래스 없음)', () => {
    const md = '# 제목\n\n- 항목\n\n| 헤더 |\n|------|\n| 내용 |';
    const html = buildReportEmailHtml(md);
    // CSS 클래스가 포함되지 않아야 함
    expect(html).not.toMatch(/class="/);
  });

  it('복합 마크다운을 올바르게 변환한다', () => {
    const md = [
      '# 홍길동 업무 리포트',
      '',
      '> 기간: 2026-02-01 ~ 2026-02-14',
      '',
      '## 1. 수치 요약',
      '',
      '| 항목 | 수치 |',
      '|------|------|',
      '| 총 이슈 | 10건 |',
      '| 완료 | 8건 |',
      '',
      '## 2. 주요 작업',
      '',
      '- **신규 기능**: 이메일 전송 구현 (`PROJ-123`)',
      '- **버그 수정**: 로그인 오류 해결',
    ].join('\n');

    const html = buildReportEmailHtml(md);
    expect(html).toContain('<h1');
    expect(html).toContain('홍길동 업무 리포트');
    expect(html).toContain('<table');
    expect(html).toContain('<strong>신규 기능</strong>');
    expect(html).toContain('PROJ-123');
  });
});

describe('buildRawEmail', () => {
  const baseParams = {
    from: 'sender@gmail.com',
    to: ['recipient@example.com'],
    subject: '테스트 제목',
    html: '<p>Hello</p>',
  };

  it('base64url 인코딩된 문자열을 반환한다 (+, /, = 없음)', () => {
    const raw = buildRawEmail(baseParams);
    expect(raw).not.toMatch(/[+/=]/);
  });

  it('디코딩하면 RFC 2822 헤더를 포함한다', () => {
    const raw = buildRawEmail(baseParams);
    // base64url → base64 → decode
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    expect(decoded).toContain('From: sender@gmail.com');
    expect(decoded).toContain('To: recipient@example.com');
    expect(decoded).toContain('MIME-Version: 1.0');
    expect(decoded).toContain('Content-Type: multipart/alternative');
  });

  it('Subject를 UTF-8 Base64 인코딩한다', () => {
    const raw = buildRawEmail(baseParams);
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    expect(decoded).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/);
    // 인코딩된 subject를 디코딩하면 원본과 일치
    const match = decoded.match(/Subject: =\?UTF-8\?B\?(.+?)\?=/);
    expect(match).not.toBeNull();
    const decodedSubject = Buffer.from(match![1], 'base64').toString('utf-8');
    expect(decodedSubject).toBe('테스트 제목');
  });

  it('HTML 본문이 base64 인코딩되어 포함된다', () => {
    const raw = buildRawEmail(baseParams);
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const htmlBase64 = Buffer.from('<p>Hello</p>').toString('base64');
    expect(decoded).toContain(htmlBase64);
  });

  it('다수 수신자를 쉼표로 결합한다', () => {
    const raw = buildRawEmail({
      ...baseParams,
      to: ['a@test.com', 'b@test.com'],
    });
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    expect(decoded).toContain('To: a@test.com, b@test.com');
  });
});
