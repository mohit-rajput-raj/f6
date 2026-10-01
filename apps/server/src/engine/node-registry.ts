// ═══════════════════════════════════════════════════════════
// Node Registry — maps node types to their executors
// Replaces the giant switch-case from nodeExecutions.ts
// ═══════════════════════════════════════════════════════════

import type { INodeExecutor } from "@repo/workflow-engine/types";

export class NodeRegistry {
  private executors = new Map<string, INodeExecutor>();

  register(executor: INodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  registerMany(executors: INodeExecutor[]): void {
    for (const executor of executors) {
      this.register(executor);
    }
  }

  get(type: string): INodeExecutor | undefined {
    return this.executors.get(type);
  }

  has(type: string): boolean {
    return this.executors.has(type);
  }

  listTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

export const nodeRegistry = new NodeRegistry();
