import { createAiClient } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { Board, Difficulty, Player } from './types';

export type AiRequest = { board: Board; player: Player; difficulty: Difficulty };

const ask = createAiClient<AiRequest, number>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	({ board, player, difficulty }) => chooseAiMove(board, player, difficulty)
);

/** Runs the orrery's search off the main thread, falling back to an inline search. */
export function chooseAiMoveAsync(board: Board, player: Player, difficulty: Difficulty): Promise<number> {
	return ask({ board: new Int8Array(board), player, difficulty });
}
