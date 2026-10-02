const STORAGE_KEY = 'arcade:fps-meter';

/** Starts hidden so phones never flash it; hydrate decides the real default. */
export const fpsMeter = $state({ visible: false });

export function hydrateFpsMeter() {
	let saved: string | null = null;
	try {
		saved = localStorage.getItem(STORAGE_KEY);
	} catch {
		// Storage blocked: fall through to the device default.
	}
	// Touch devices have no backtick key to dismiss it, so it is opt-in there.
	fpsMeter.visible = saved ? saved !== 'off' : !matchMedia('(pointer: coarse)').matches;
}

export function setFpsMeter(on: boolean) {
	fpsMeter.visible = on;
	try {
		localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
	} catch {
		// Storage blocked: the toggle still applies for this visit.
	}
}
