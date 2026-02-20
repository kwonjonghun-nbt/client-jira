export type AIType = 'claude' | 'gemini';

export interface AgentCommand {
  shellCmd: string;
}

export interface AIAgent {
  buildCommand(options: { model?: string }): AgentCommand;
}
