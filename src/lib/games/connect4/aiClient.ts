import { createAiClient } from '../kit/aiClient';
import { chooseAiColumn } from './ai';
import type { Board, Difficulty, Player } from './types';

export type AiRequest = { board: Board; player: Player; difficulty: Difficulty };

const ask = createAiClient<AiRequest, number>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	({ board, player, difficulty }) => chooseAiColumn(board, player, difficulty)
);

/** Runs the minimax search off the main thread, falling back to an inline search. */
export function chooseAiColumnAsync(board: Board, player: Player, difficulty: Difficulty): Promise<number> {
	return ask({ board: board.map((row) => [...row]), player, difficulty });
}
