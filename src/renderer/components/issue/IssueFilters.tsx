import Select from '../common/Select';

interface FilterOptions {
  projects: string[];
  statuses: string[];
  assignees: string[];
}

interface IssueFiltersProps {
  filters: { project: string; status: string; assignee: string };
  filterOptions: FilterOptions;
  onChangeFilter: (key: 'project' | 'status' | 'assignee', value: string) => void;
}

export default function IssueFilters({ filters, filterOptions, onChangeFilter }: IssueFiltersProps) {
  return (
    <div className="flex gap-3">
      <Select
        placeholder="전체 프로젝트"
        value={filters.project}
        onChange={(e) => onChangeFilter('project', e.target.value)}
        options={filterOptions.projects.map((p) => ({ value: p, label: p }))}
      />
      <Select
        placeholder="전체 상태"
        value={filters.status}
        onChange={(e) => onChangeFilter('status', e.target.value)}
        options={filterOptions.statuses.map((s) => ({ value: s, label: s }))}
      />
      <Select
        placeholder="전체 담당자"
        value={filters.assignee}
        onChange={(e) => onChangeFilter('assignee', e.target.value)}
        options={filterOptions.assignees.map((a) => ({ value: a, label: a }))}
      />
    </div>
  );
}
