import { createAiClient } from '../kit/aiClient';
import { think, type AiRequest, type AiResult } from './ai';

const makeWorker = () => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

/** The opponent and the analyst each get their own worker so the eval bar never delays a reply. */
export const askOpponent = createAiClient<AiRequest, AiResult>(makeWorker, think, 20_000);
export const askAnalyst = createAiClient<AiRequest, AiResult>(makeWorker, think, 20_000);
