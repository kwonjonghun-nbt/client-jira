import { useState, useMemo } from 'react';
import type { NormalizedIssue } from '../types/jira.types';
import {
  getDefaultPeriod,
  extractAssignees,
  filterReportIssues,
} from '../utils/reports';

export function useReportFilter(issues: NormalizedIssue[] | undefined) {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [assignee, setAssignee] = useState('전체');
  const [startDate, setStartDate] = useState(defaultPeriod.start);
  const [endDate, setEndDate] = useState(defaultPeriod.end);

  const assignees = useMemo(
    () => extractAssignees(issues ?? []),
    [issues],
  );

  const filteredIssues = useMemo(
    () => filterReportIssues(issues ?? [], assignee, startDate, endDate),
    [issues, assignee, startDate, endDate],
  );

  return {
    assignee,
    setAssignee,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    assignees,
    filteredIssues,
  };
}
