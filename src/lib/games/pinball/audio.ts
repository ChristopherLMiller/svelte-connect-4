import { createScore, type ScorePlayer } from './sound/score';
import { peekPinball } from './persist';
import { tableOf } from './tables';
import type { TableId } from './types';

const players = new Map<TableId, ScorePlayer>();
let current: TableId = peekPinball().table;
let wanted = false;

function player(id: TableId) {
	let p = players.get(id);
	if (!p) {
		p = createScore(tableOf(id).score);
		players.set(id, p);
	}
	return p;
}

export function startMusic() {
	wanted = true;
	player(current).start();
}

export function stopMusic() {
	wanted = false;
	for (const p of players.values()) if (p.running) p.stop();
}

/** Switch the score to another table's, crossfading if music is playing. */
export function setTableMusic(id: TableId) {
	if (id === current) return;
	players.get(current)?.stop();
	current = id;
	if (wanted) player(id).start();
}

export function setMusicHot(on: boolean) {
	players.get(current)?.setHot(on);
}
