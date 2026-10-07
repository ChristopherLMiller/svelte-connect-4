import { serveAi } from '../kit/aiClient';
import { chooseAction } from './ai';

serveAi(self, chooseAction);
