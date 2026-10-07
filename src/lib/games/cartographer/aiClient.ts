import { createAiClient } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { Difficulty } from './types';

export type AiRequest = { n: number; edges: number[]; difficulty: Difficulty };

const ask = createAiClient<AiRequest, number>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	({ n, edges, difficulty }) => chooseAiMove(n, edges, difficulty)
);

/** Mercator thinks off the main thread, falling back to an inline search. */
export function chooseAiMoveAsync(n: number, edges: Int8Array, difficulty: Difficulty): Promise<number> {
	return ask({ n, edges: Array.from(edges), difficulty });
}
