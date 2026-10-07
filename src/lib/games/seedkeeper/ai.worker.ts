import { serveAi } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { AiRequest } from './aiClient';

serveAi<AiRequest, number>(self, ({ board, player, difficulty }) => chooseAiMove(board, player, difficulty));
