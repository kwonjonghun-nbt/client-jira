import { memo } from 'react';
import type { NormalizedIssue } from '../../types/jira.types';
import IssueRow from './IssueRow';

interface IssueTableProps {
  issues: NormalizedIssue[];
  baseUrl?: string;
}

export default memo(function IssueTable({ issues, baseUrl }: IssueTableProps) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-1">이슈가 없습니다</p>
        <p className="text-sm">필터를 변경하거나 데이터를 싱크해주세요</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-28">키</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-20">타입</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600">제목</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">상태</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">담당자</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-20">우선순위</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-16">SP</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">마감일</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.key} issue={issue} baseUrl={baseUrl} />
          ))}
        </tbody>
      </table>
    </div>
  );
});
