import type { StageName } from './pipeline.ts';

export class InvalidAIOutput extends Error {
  readonly reason: string;
  readonly stage?: StageName | 'single' | 'final';

  constructor(reason: string, stage?: StageName | 'single' | 'final') {
    super('INVALID_AI_OUTPUT');
    this.reason = reason;
    this.stage = stage;
  }
}
