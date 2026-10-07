import { serveAi } from '../kit/aiClient';
import { think, type AiRequest, type AiResult } from './ai';

serveAi<AiRequest, AiResult>(self, (request) => think(request));
