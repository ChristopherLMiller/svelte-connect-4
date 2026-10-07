import { serveAi } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { AiRequest } from './aiClient';

serveAi<AiRequest, number>(self, ({ board, size, player, difficulty }) => chooseAiMove(board, size, player, difficulty));
