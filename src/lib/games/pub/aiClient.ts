import { createAiClient } from '../kit/aiClient';
import { chooseAction, type AiRequest, type PubAction } from './ai';

const ask = createAiClient<AiRequest, PubAction>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	(request) => chooseAction(request),
	6000
);

/** The regulars think off the main thread, falling back to an inline decision. */
export function chooseActionAsync(request: AiRequest): Promise<PubAction> {
	return ask(request);
}
