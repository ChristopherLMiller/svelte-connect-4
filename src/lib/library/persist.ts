const KEY = 'ai-arcade-cabinet';

let memory: string | null = null;

export function recallCabinet() {
	return memory;
}

export function loadCabinet() {
	if (memory) return memory;
	if (typeof localStorage === 'undefined') return null;
	try {
		memory = localStorage.getItem(KEY);
	} catch {
		memory = null;
	}
	return memory;
}

export function rememberCabinet(id: string) {
	if (!id) return;
	memory = id;
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, id);
	} catch {
		/* quota / private mode */
	}
}
