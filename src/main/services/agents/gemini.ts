import type { AIAgent } from './types';

export const geminiAgent: AIAgent = {
  buildCommand({ model }) {
    const modelFlag = model ? ` --model ${model}` : '';
    return {
      shellCmd: `gemini -p "" -o text${modelFlag}`,
    };
  },
};
