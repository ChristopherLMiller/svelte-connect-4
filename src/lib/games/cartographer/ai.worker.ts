import { serveAi } from '../kit/aiClient';
import { chooseAiMove } from './ai';
import type { AiRequest } from './aiClient';

serveAi<AiRequest, number>(self, ({ n, edges, difficulty }) => chooseAiMove(n, edges, difficulty));
