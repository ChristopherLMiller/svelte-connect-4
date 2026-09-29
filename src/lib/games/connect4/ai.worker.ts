import { serveAi } from '../kit/aiClient';
import { chooseAiColumn } from './ai';
import type { AiRequest } from './aiClient';

serveAi<AiRequest, number>(self, ({ board, player, difficulty }) => chooseAiColumn(board, player, difficulty));
