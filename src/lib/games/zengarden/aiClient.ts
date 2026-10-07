import { createAiClient } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { Board } from './engine';
import type { Difficulty, Player } from './types';

export type AiRequest = { board: number[]; size: number; player: Player; difficulty: Difficulty };

const ask = createAiClient<AiRequest, number>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	({ board, size, player, difficulty }) => chooseAiMove(board, size, player, difficulty)
);

/** The Monk reads the gravel off the main thread, falling back to an inline search. */
export function chooseAiMoveAsync(board: Board, size: number, player: Player, difficulty: Difficulty): Promise<number> {
	return ask({ board: [...board], size, player, difficulty });
}
