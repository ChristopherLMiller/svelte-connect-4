<script lang="ts">
	import { untrack } from 'svelte';
	import { fpsMeter, hydrateFpsMeter, setFpsMeter } from '$lib/fps.svelte';

	const HISTORY = 120;

	$effect(() => {
		hydrateFpsMeter();
	});

	function toggle(event: KeyboardEvent) {
		if (event.key !== '`' || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, [contenteditable="true"]')) return;
		setFpsMeter(!fpsMeter.visible);
	}

	function meter(node: HTMLDivElement) {
		return untrack(() => {
			const fpsEl = node.querySelector<HTMLElement>('[data-fps]')!;
			const msEl = node.querySelector<HTMLElement>('[data-ms]')!;
			const worstEl = node.querySelector<HTMLElement>('[data-worst]')!;
			const hzEl = node.querySelector<HTMLElement>('[data-hz]')!;
			const graph = node.querySelector<HTMLCanvasElement>('canvas')!;
			const ctx = graph.getContext('2d');
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const gw = 120;
			const gh = 28;
			graph.width = gw * dpr;
			graph.height = gh * dpr;
			ctx?.scale(dpr, dpr);

			const times = new Float32Array(HISTORY);
			let head = 0;
			let filled = 0;
			let last = performance.now();
			let windowStart = last;
			let windowFrames = 0;
			let windowWorst = 0;
			let raf = 0;

			const refreshMs = () => {
				if (filled < 10) return 1000 / 60;
				const sorted = Array.from(times.subarray(0, filled)).sort((a, b) => a - b);
				return Math.max(2, sorted[Math.floor(filled * 0.2)]);
			};

			const paintGraph = (budget: number) => {
				if (!ctx) return;
				ctx.clearRect(0, 0, gw, gh);
				const scale = gh / Math.max(budget * 3, 1000 / 20);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
				ctx.fillRect(0, gh - budget * scale, gw, 1);
				const bar = gw / HISTORY;
				for (let i = 0; i < filled; i += 1) {
					const t = times[(head - filled + i + HISTORY) % HISTORY];
					const hgt = Math.min(gh, Math.max(1, t * scale));
					ctx.fillStyle = t > budget * 2 ? '#ff335c' : t > budget * 1.4 ? '#f5c24b' : '#5ce1e6';
					ctx.fillRect(i * bar, gh - hgt, Math.max(1, bar - 0.2), hgt);
				}
			};

			const tick = (now: number) => {
				const dt = now - last;
				last = now;
				times[head] = dt;
				head = (head + 1) % HISTORY;
				filled = Math.min(HISTORY, filled + 1);
				windowFrames += 1;
				windowWorst = Math.max(windowWorst, dt);

				const span = now - windowStart;
				if (span >= 500) {
					const fps = (windowFrames * 1000) / span;
					const avg = span / windowFrames;
					const budget = refreshMs();
					const hz = 1000 / budget;
					fpsEl.textContent = fps.toFixed(0);
					msEl.textContent = avg.toFixed(1);
					worstEl.textContent = windowWorst.toFixed(1);
					hzEl.textContent = String(Math.round(hz));
					node.dataset.grade = fps >= hz * 0.9 ? 'good' : fps >= hz * 0.65 ? 'fair' : 'poor';
					paintGraph(budget);
					windowStart = now;
					windowFrames = 0;
					windowWorst = 0;
				}
				raf = requestAnimationFrame(tick);
			};

			const onVisibility = () => {
				if (document.hidden) {
					cancelAnimationFrame(raf);
					raf = 0;
				} else if (!raf) {
					last = windowStart = performance.now();
					windowFrames = 0;
					windowWorst = 0;
					raf = requestAnimationFrame(tick);
				}
			};

			document.addEventListener('visibilitychange', onVisibility);
			raf = requestAnimationFrame(tick);
			return () => {
				cancelAnimationFrame(raf);
				document.removeEventListener('visibilitychange', onVisibility);
			};
		});
	}
</script>

<svelte:window onkeydown={toggle} />

{#if fpsMeter.visible}
	<div class="fps" data-grade="good" aria-hidden="true" {@attach meter}>
		<div class="row">
			<span class="big" data-fps>--</span><span class="unit">FPS</span>
			<span class="stat"><b data-ms>--</b> ms</span>
			<span class="stat worst">max <b data-worst>--</b></span>
			<span class="stat worst"><b data-hz>--</b>Hz</span>
		</div>
		<canvas></canvas>
	</div>
{/if}

<style>
	.fps {
		position: fixed;
		left: max(8px, env(safe-area-inset-left));
		bottom: max(8px, env(safe-area-inset-bottom));
		z-index: 2147483000;
		pointer-events: none;
		padding: 5px 7px 4px;
		border-radius: 6px;
		background: rgba(6, 4, 12, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.1);
		font: 600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
		color: rgba(235, 240, 255, 0.78);
		font-variant-numeric: tabular-nums;
		contain: layout paint;
	}

	.row {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin-bottom: 3px;
	}

	.big {
		font-size: 15px;
		color: #5ce1e6;
		min-width: 2ch;
		text-align: right;
	}

	.unit {
		margin-left: -3px;
		opacity: 0.6;
	}

	.stat b {
		color: #fff;
		font-weight: 600;
	}

	.worst {
		opacity: 0.7;
	}

	.fps:global([data-grade='fair']) .big {
		color: #f5c24b;
	}

	.fps:global([data-grade='poor']) .big {
		color: #ff335c;
	}

	canvas {
		display: block;
		width: 120px;
		height: 28px;
	}
</style>
