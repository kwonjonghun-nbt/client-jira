import type { AIAgent } from './types';

export const claudeAgent: AIAgent = {
  buildCommand({ model }) {
    const modelFlag = model ? ` --model ${model}` : '';
    return {
      shellCmd: `DISABLE_OMC=1 claude -p --output-format text --no-session-persistence --disallowedTools 'Edit,Write,Bash,NotebookEdit' --setting-sources ''${modelFlag}`,
    };
  },
};
