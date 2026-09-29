/**
 * Runs a game's AI in a module worker, answering each request by id. If the worker can't
 * start, errors out, or takes longer than `timeoutMs`, the search runs inline instead.
 *
 * Workers must reply with `{ id, result }`.
 */
export function createAiClient<Req, Res>(
	makeWorker: () => Worker,
	inline: (request: Req) => Res,
	timeoutMs = 4000
) {
	let worker: Worker | null = null;
	let failed = false;
	let nextId = 1;
	const pending = new Map<number, (result: Res) => void>();

	function getWorker(): Worker | null {
		if (worker || failed || typeof Worker === 'undefined') return worker;
		try {
			worker = makeWorker();
			worker.onmessage = (event: MessageEvent<{ id: number; result: Res }>) => {
				pending.get(event.data.id)?.(event.data.result);
				pending.delete(event.data.id);
			};
			worker.onerror = () => {
				failed = true;
				worker?.terminate();
				worker = null;
			};
		} catch {
			failed = true;
		}
		return worker;
	}

	return function ask(request: Req): Promise<Res> {
		const target = getWorker();
		if (!target) return Promise.resolve(inline(request));
		const id = nextId++;
		return new Promise((resolve) => {
			const fallback = window.setTimeout(() => {
				if (!pending.delete(id)) return;
				resolve(inline(request));
			}, timeoutMs);
			pending.set(id, (result) => {
				window.clearTimeout(fallback);
				resolve(result);
			});
			target.postMessage({ id, request });
		});
	};
}

/** Worker side of `createAiClient`: wire `self.onmessage` to a search function. */
export function serveAi<Req, Res>(scope: { onmessage: unknown; postMessage: (message: unknown) => void }, run: (request: Req) => Res) {
	scope.onmessage = (event: MessageEvent<{ id: number; request: Req }>) => {
		const { id, request } = event.data;
		scope.postMessage({ id, result: run(request) });
	};
}
