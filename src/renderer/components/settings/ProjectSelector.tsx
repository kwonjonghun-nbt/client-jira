import { useState } from 'react';
import Button from '../common/Button';
import type { JiraProject } from '../../types/jira.types';

interface ProjectSelectorProps {
  selectedProjects: string[];
  onChange: (projects: string[]) => void;
  onFetchProjects: () => Promise<JiraProject[]>;
}

export default function ProjectSelector({
  selectedProjects,
  onChange,
  onFetchProjects,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const result = await onFetchProjects();
      setProjects(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (key: string) => {
    if (selectedProjects.includes(key)) {
      onChange(selectedProjects.filter((p) => p !== key));
    } else {
      onChange([...selectedProjects, key]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={handleFetch} isLoading={loading}>
          프로젝트 목록 불러오기
        </Button>
        {selectedProjects.length > 0 && (
          <span className="text-sm text-gray-500">{selectedProjects.length}개 선택됨</span>
        )}
      </div>

      {projects.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
          {projects.map((project) => (
            <label
              key={project.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedProjects.includes(project.key)}
                onChange={() => toggleProject(project.key)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">{project.key}</span>
              <span className="text-sm text-gray-400">{project.name}</span>
            </label>
          ))}
        </div>
      )}

      {selectedProjects.length > 0 && projects.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProjects.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {key}
              <button
                onClick={() => toggleProject(key)}
                className="hover:text-blue-900 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
