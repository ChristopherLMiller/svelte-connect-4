import { serveAi } from '../kit/aiClient';
import { chooseShot, type AiView } from './ai';

serveAi<AiView, number>(self, (view) => chooseShot(view));
