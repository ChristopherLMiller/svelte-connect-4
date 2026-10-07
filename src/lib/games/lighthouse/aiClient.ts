import { createAiClient } from '../kit/aiClient';
import { chooseShot, type AiView } from './ai';

const ask = createAiClient<AiView, number>(
	() => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
	(view) => chooseShot(view)
);

/** The Wrecker reads the chart off the main thread, falling back to an inline search. */
export function chooseShotAsync(view: AiView): Promise<number> {
	return ask({ ...view, shots: [...view.shots], afloat: [...view.afloat] });
}
