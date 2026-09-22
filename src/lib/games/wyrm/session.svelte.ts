import { lerpSnake, opposite, spawnSnake, steerQueue, step, tickMs } from './engine';
import { freshRun, peekSaved, peekWyrm, writeSaved, type SavedRun } from './persist';
import { persistWyrmPlay, recordWyrmScore, wyrmBest, wyrmPlay } from './settings.svelte';
import { playCrash, playEat, playPause, playStart, playTurn } from './audio';
import type { Difficulty, Dir, GameStatus, Point, Screen } from './types';

export class WyrmSession {
	screen = $state<Screen>('menu');
	difficulty = $state<Difficulty>(peekWyrm().difficulty);
	snake = $state<Point[]>(spawnSnake().snake);
	prevSnake = $state<Point[]>(spawnSnake().snake);
	dir = $state<Dir>('right');
	queue = $state<Dir[]>([]);
	food = $state<Point>({ x: 12, y: 7 });
	score = $state(0);
	startedBest = $state(0);
	waiting = $state(false);
	eatPulse = $state(0);
	meal = $state<Point | null>(null);
	status = $state<GameStatus>({ type: 'playing' });
	blend = $state(1);
	private raf = 0;
	private last = 0;

	best = $derived(Math.max(this.startedBest, this.score));
	drawn = $derived(lerpSnake(this.prevSnake, this.snake, this.blend));
	high = $derived(this.score > this.startedBest);

	start(difficulty: Difficulty = this.difficulty) {
		this.stopLoop();
		this.difficulty = difficulty;
		wyrmPlay.difficulty = difficulty;
		persistWyrmPlay();
		this.startedBest = wyrmBest[difficulty];
		const run = freshRun(difficulty);
		this.applyRun(run, false);
		this.waiting = true;
		this.status = { type: 'playing' };
		this.screen = 'play';
		writeSaved(null);
		playStart();
		this.kick();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		this.stopLoop();
		this.difficulty = saved.difficulty;
		wyrmPlay.difficulty = saved.difficulty;
		persistWyrmPlay();
		this.startedBest = wyrmBest[saved.difficulty];
		this.applyRun(saved, saved.paused);
		this.waiting = false;
		this.status = saved.paused ? { type: 'paused' } : { type: 'playing' };
		this.screen = 'play';
		if (!saved.paused) this.kick();
		return true;
	}

	backToMenu() {
		this.stopLoop();
		this.stash();
		this.screen = 'menu';
	}

	restart() {
		if (this.screen !== 'play') return;
		this.start(this.difficulty);
	}

	togglePause() {
		if (this.screen !== 'play') return;
		if (this.status.type === 'dead' || this.status.type === 'won') return;
		if (this.status.type === 'paused') {
			this.status = { type: 'playing' };
			this.last = 0;
			this.stash();
			this.kick();
			return;
		}
		this.status = { type: 'paused' };
		this.stopLoop();
		this.stash();
		playPause();
	}

	steer(next: Dir) {
		if (this.screen !== 'play') return;
		if (this.status.type === 'dead' || this.status.type === 'won') return;
		if (this.waiting) {
			if (opposite(this.dir, next)) return;
			this.dir = next;
			this.queue = [];
			this.waiting = false;
			this.last = 0;
			playTurn();
			return;
		}
		const queued = steerQueue(this.queue, this.dir, next);
		if (queued === this.queue) return;
		this.queue = queued;
		playTurn();
	}

	private applyRun(run: SavedRun, paused: boolean) {
		this.snake = run.snake.map((cell) => ({ ...cell }));
		this.prevSnake = run.snake.map((cell) => ({ ...cell }));
		this.dir = run.dir;
		this.queue = [...run.queue];
		this.food = { ...run.food };
		this.score = run.score;
		this.blend = 1;
		this.last = 0;
		this.waiting = !paused;
		this.status = paused ? { type: 'paused' } : { type: 'playing' };
		this.eatPulse = 0;
		this.meal = null;
	}

	private kick() {
		if (typeof requestAnimationFrame === 'undefined') return;
		this.stopLoop();
		this.raf = requestAnimationFrame((time) => this.frame(time));
	}

	private stopLoop() {
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	private reduced() {
		return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	private frame(now: number) {
		if (this.screen !== 'play' || this.status.type !== 'playing') return;
		if (this.waiting) {
			this.blend = 1;
			this.last = 0;
			this.raf = requestAnimationFrame((time) => this.frame(time));
			return;
		}
		if (!this.last) {
			this.last = now;
			this.blend = 1;
			this.raf = requestAnimationFrame((time) => this.frame(time));
			return;
		}
		const interval = tickMs(this.difficulty, this.score);
		const elapsed = now - this.last;
		if (elapsed >= interval) {
			this.advance();
			this.last = now;
			this.blend = this.reduced() || this.status.type !== 'playing' ? 1 : 0;
		} else {
			this.blend = this.reduced() ? 1 : Math.min(1, elapsed / interval);
		}
		if (this.status.type === 'playing') {
			this.raf = requestAnimationFrame((time) => this.frame(time));
		}
	}

	private advance() {
		const nextDir = this.queue[0] ?? this.dir;
		this.queue = this.queue.slice(1);
		this.dir = nextDir;
		this.prevSnake = this.snake.map((cell) => ({ ...cell }));
		const bitten = this.food;
		const result = step(this.snake, nextDir, this.food, this.score);
		this.snake = result.snake;
		this.food = result.food;
		this.score = result.score;
		if (!result.ok) {
			this.status = { type: 'dead', cause: result.cause };
			this.blend = 1;
			this.stopLoop();
			recordWyrmScore(this.difficulty, this.score);
			writeSaved(null);
			playCrash();
			return;
		}
		if (result.ate) {
			this.meal = { ...bitten };
			this.eatPulse += 1;
			playEat();
		}
		if (result.won) {
			this.status = { type: 'won' };
			this.blend = 1;
			this.stopLoop();
			recordWyrmScore(this.difficulty, this.score);
			writeSaved(null);
			if (!result.ate) playEat();
			return;
		}
	}

	stash() {
		if (this.screen !== 'play') return;
		if (this.status.type === 'dead' || this.status.type === 'won') {
			writeSaved(null);
			return;
		}
		writeSaved({
			difficulty: this.difficulty,
			snake: this.snake.map((cell) => ({ ...cell })),
			dir: this.dir,
			queue: [...this.queue],
			food: { ...this.food },
			score: this.score,
			paused: this.status.type === 'paused'
		});
	}
}
