import Select from '../common/Select';
import MultiSelect from '../common/MultiSelect';

interface FilterOptions {
  projects: string[];
  statuses: string[];
  assignees: string[];
}

interface IssueFiltersProps {
  filters: { project: string; statuses: string[]; assignee: string };
  filterOptions: FilterOptions;
  onChangeFilter: (key: 'project' | 'assignee', value: string) => void;
  onToggleStatus: (status: string) => void;
}

export default function IssueFilters({ filters, filterOptions, onChangeFilter, onToggleStatus }: IssueFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select
        placeholder="전체 프로젝트"
        value={filters.project}
        onChange={(e) => onChangeFilter('project', e.target.value)}
        options={filterOptions.projects.map((p) => ({ value: p, label: p }))}
      />
      <MultiSelect
        placeholder="전체 상태"
        options={filterOptions.statuses.map((s) => ({ value: s, label: s }))}
        selected={filters.statuses}
        onToggle={onToggleStatus}
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
