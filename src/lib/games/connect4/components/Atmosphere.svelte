<script lang="ts">
	import { untrack } from 'svelte';
	import {
		createSighting,
		createStarfield,
		createVoyage,
		generateSector,
		SECTOR_SPAN,
		VOYAGE_DRIFT_PX_PER_S,
		VOYAGE_TRAVEL_PX_PER_S,
		type EasterEgg,
		type Sector,
		type Sighting
	} from '../space';
	import { createSpaceRenderer, type SectorFrame } from '../spaceGpu';

	type EggHost = { slot: number; eggs: EasterEgg[] };

	let failed = $state(false);
	let eggHosts = $state<EggHost[]>([]);
	let sightings = $state<Sighting[]>([]);
	const hosts = new Map<number, HTMLElement>();
	const DRIFT_PER_TRAVEL = VOYAGE_DRIFT_PX_PER_S / VOYAGE_TRAVEL_PX_PER_S;

	function host(slot: number) {
		return (node: HTMLElement) => {
			hosts.set(slot, node);
			return () => {
				if (hosts.get(slot) === node) hosts.delete(slot);
			};
		};
	}

	function space(canvas: HTMLCanvasElement) {
		return untrack(() => {
			const renderer = createSpaceRenderer(canvas);
			if (!renderer) {
				failed = true;
				return;
			}

			const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			let w = Math.max(1, canvas.clientWidth || window.innerWidth);
			let h = Math.max(1, canvas.clientHeight || window.innerHeight);
			let field = { w, h };
			let starSize = { w, h };
			const voyage = createVoyage(Date.now(), field);
			const seed = voyage.seed;
			let nextIndex = voyage.nextIndex;
			const slots: Array<{ sector: Sector; born: number }> = voyage.sectors.map((sector) => ({
				sector,
				born: 0
			}));

			const publishEggs = () => {
				eggHosts = slots
					.map((entry, slot) => ({ slot, eggs: entry.sector.eggs }))
					.filter((entry) => entry.eggs.length > 0);
			};

			/** Resolution steps applied when the GPU can't keep up with the display. */
			const SCALES = [1, 0.75, 0.5];
			let level = 0;
			const pixelRatio = () =>
				Math.max(0.5, Math.min(1.5, window.devicePixelRatio || 1) * SCALES[level]);

			renderer.resize(w, h, pixelRatio());
			renderer.setStars(createStarfield(2026, starSize));
			slots.forEach((entry, slot) => renderer.setSector(slot, entry.sector));
			publishEggs();

			let start = performance.now();
			let raf = 0;
			let lastSweep = 0;

			let windowStart = 0;
			let windowFrames = 0;
			let bestInterval = Number.POSITIVE_INFINITY;
			let slowWindows = 0;
			let fastWindows = 0;
			let holdUntil = 0;

			const adapt = (now: number) => {
				if (!windowStart) {
					windowStart = now;
					windowFrames = 0;
					return;
				}
				windowFrames += 1;
				const span = now - windowStart;
				if (span < 1000) return;
				const avg = span / windowFrames;
				windowStart = now;
				windowFrames = 0;
				bestInterval = Math.min(bestInterval, avg);
				if (avg > bestInterval * 1.3) {
					slowWindows += 1;
					fastWindows = 0;
				} else if (avg < bestInterval * 1.1) {
					fastWindows += 1;
					slowWindows = 0;
				}
				if (slowWindows >= 2 && level < SCALES.length - 1) {
					level += 1;
					slowWindows = 0;
					holdUntil = now + 30_000;
					renderer.resize(w, h, pixelRatio());
				} else if (fastWindows >= 5 && level > 0 && now > holdUntil) {
					level -= 1;
					fastWindows = 0;
					renderer.resize(w, h, pixelRatio());
				}
			};

			const recycle = (t: number, travel: number) => {
				const period = field.h * SECTOR_SPAN * slots.length;
				const recycleAt = field.h * 2.35;
				let changed = false;
				for (let i = 0; i < slots.length; i += 1) {
					if (slots[i].sector.origin + travel <= recycleAt) continue;
					let origin = slots[i].sector.origin;
					while (origin + travel > recycleAt) origin -= period;
					const sector = generateSector(seed, nextIndex, Date.now() + nextIndex * 7919, origin, field);
					nextIndex += 1;
					slots[i] = { sector, born: t };
					renderer.setSector(i, sector);
					changed = true;
					if (Math.random() < 0.09 && sightings.length < 2) {
						sightings = [...sightings, createSighting(Date.now())];
					}
				}
				if (changed) publishEggs();
			};

			const frame = (now: number) => {
				raf = 0;
				const t = calm ? 0 : (now - start) / 1000;
				const travel = VOYAGE_TRAVEL_PX_PER_S * t;
				if (!calm) recycle(t, travel);

				const frames: SectorFrame[] = slots.map((entry) => {
					const y = -0.2 * h + entry.sector.origin + travel;
					return { x: -DRIFT_PER_TRAVEL * (y + 0.2 * h), y, age: t - entry.born };
				});
				renderer.render(t, frames, calm);
				if (!calm) adapt(now);

				for (const [slot, node] of hosts) {
					const f = frames[slot];
					if (f) node.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`;
				}

				if (sightings.length && now - lastSweep > 1000) {
					lastSweep = now;
					const alive = performance.now();
					const keep = sightings.filter((egg) => alive - egg.born < egg.life);
					if (keep.length !== sightings.length) sightings = keep;
				}

				if (!calm && !document.hidden) raf = requestAnimationFrame(frame);
			};

			const kick = () => {
				windowStart = 0;
				if (!raf) raf = requestAnimationFrame(frame);
			};

			const resize = () => {
				w = Math.max(1, canvas.clientWidth || window.innerWidth);
				h = Math.max(1, canvas.clientHeight || window.innerHeight);
				renderer.resize(w, h, pixelRatio());
				if (Math.abs(w - field.w) >= 160 || Math.abs(h - field.h) >= 160) field = { w, h };
				if (Math.abs(w - starSize.w) >= 160 || Math.abs(h - starSize.h) >= 160) {
					starSize = { w, h };
					renderer.setStars(createStarfield(2026, starSize));
				}
				kick();
			};

			const onVisibility = () => {
				if (!document.hidden) kick();
			};

			const onLost = (event: Event) => {
				event.preventDefault();
				if (raf) cancelAnimationFrame(raf);
				raf = 0;
				failed = true;
			};

			const observer = new ResizeObserver(resize);
			observer.observe(canvas);
			document.addEventListener('visibilitychange', onVisibility);
			canvas.addEventListener('webglcontextlost', onLost);
			start = performance.now();
			kick();

			return () => {
				if (raf) cancelAnimationFrame(raf);
				observer.disconnect();
				document.removeEventListener('visibilitychange', onVisibility);
				canvas.removeEventListener('webglcontextlost', onLost);
				renderer.dispose();
			};
		});
	}
</script>

<div class="atmosphere" aria-hidden="true">
	{#if failed}
		<div class="wash"></div>
	{:else}
		<canvas class="space" {@attach space}></canvas>
	{/if}
	{#each eggHosts as entry (entry.slot)}
		<div class="eggs" {@attach host(entry.slot)}>
			{#each entry.eggs as egg (egg.id)}
				<i
					class={['egg', egg.kind]}
					style:left="{egg.x}%"
					style:top="{egg.y}%"
					style:--scale={egg.scale}
					style:--dur="{egg.dur}s"
					style:--delay="{egg.delay}s"
					style:--tilt="{egg.tilt}deg"
				></i>
			{/each}
		</div>
	{/each}
	{#each sightings as egg (egg.id)}
		<i
			class={['sighting', 'egg', egg.kind]}
			style:--y="{egg.y}%"
			style:--scale={egg.scale}
			style:--dur="{egg.dur}s"
			style:--delay="{egg.delay}s"
			style:--tilt="{egg.tilt}deg"
		></i>
	{/each}
</div>

<style>
	.atmosphere {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 0;
		contain: strict;
		isolation: isolate;
		background: #07060d;
	}

	.space,
	.wash {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	.wash {
		background:
			radial-gradient(1100px 700px at 8% 4%, rgba(139, 124, 255, 0.22), transparent 58%),
			radial-gradient(900px 560px at 94% 10%, rgba(255, 51, 92, 0.14), transparent 52%),
			linear-gradient(180deg, #12081c 0%, #07060d 52%, #0c0714 100%);
	}

	.eggs {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 140%;
		will-change: transform;
	}

	.egg,
	.sighting {
		position: absolute;
	}

	.egg {
		width: 42px;
		height: 42px;
		transform: rotate(var(--tilt)) scale(var(--scale, 1));
		opacity: 0.92;
		z-index: 4;
		box-shadow: 0 0 10px rgba(92, 225, 230, 0.22);
	}

	.egg.whale {
		width: 108px;
		height: 28px;
		border-radius: 60% 40% 50% 50%;
		background: linear-gradient(180deg, #8aa0c8, #2c3348 70%);
		animation: swim var(--dur, 22s) ease-in-out var(--delay, 0s) infinite;
	}

	.egg.whale::before,
	.egg.whale::after {
		content: '';
		position: absolute;
		background: #3a445c;
	}

	.egg.whale::before {
		right: 10%;
		top: -10px;
		width: 18px;
		height: 14px;
		clip-path: polygon(0 100%, 50% 0, 100% 100%);
	}

	.egg.whale::after {
		left: -8px;
		top: 8px;
		width: 16px;
		height: 12px;
		border-radius: 50%;
		background: #5ce1e6;
		box-shadow: 8px 4px 0 -4px #1c2230;
	}

	.egg.station {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: 2px solid rgba(220, 230, 255, 0.7);
		box-shadow:
			0 0 0 7px rgba(92, 225, 230, 0.12),
			0 0 0 12px rgba(255, 255, 255, 0.08);
		animation: twirl var(--dur, 28s) linear infinite;
	}

	.egg.station::before {
		content: '';
		position: absolute;
		inset: 28% 8%;
		border-top: 1px solid rgba(255, 227, 138, 0.7);
		border-bottom: 1px solid rgba(92, 225, 230, 0.5);
	}

	.egg.monolith {
		width: 11px;
		height: 38px;
		border-radius: 1px;
		background: linear-gradient(180deg, #2a2a32, #050508);
		box-shadow: 0 0 12px rgba(139, 124, 255, 0.45);
		animation: monolith var(--dur, 18s) ease-in-out infinite;
	}

	.egg.ufo {
		width: 46px;
		height: 14px;
		border-radius: 50%;
		background: linear-gradient(180deg, #e8eefc, #6d7898);
		animation: hover var(--dur, 16s) ease-in-out var(--delay, 0s) infinite;
	}

	.egg.ufo::before {
		content: '';
		position: absolute;
		left: 28%;
		top: -8px;
		width: 44%;
		height: 12px;
		border-radius: 50% 50% 20% 20%;
		background: radial-gradient(circle at 50% 60%, #5ce1e6, #1b4c58);
	}

	.egg.ufo::after {
		content: '';
		position: absolute;
		left: 30%;
		top: 12px;
		width: 40%;
		height: 34px;
		background: linear-gradient(180deg, rgba(92, 225, 230, 0.35), transparent);
		clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
		opacity: 0.7;
		animation: beam 2.4s ease-in-out infinite;
	}

	.egg.pulsar {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 10px 3px rgba(255, 227, 138, 0.8);
		animation: pulsar 1.6s ease-in-out infinite;
	}

	.egg.pulsar::before,
	.egg.pulsar::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 64px;
		height: 2px;
		background: linear-gradient(90deg, transparent, rgba(255, 227, 138, 0.7), transparent);
		translate: -50% -50%;
	}

	.egg.pulsar::after {
		transform: rotate(90deg);
	}

	.egg.wormhole {
		width: 58px;
		height: 34px;
		border-radius: 50%;
		background:
			radial-gradient(circle at 50% 50%, #05040a 28%, transparent 32%),
			conic-gradient(from 40deg, #5ce1e6, #8b7cff, #ff335c, #5ce1e6);
		animation: twirl var(--dur, 12s) linear infinite;
		box-shadow: 0 0 18px rgba(139, 124, 255, 0.45);
	}

	.egg.four {
		width: 8px;
		height: 8px;
		background: #5ce1e6;
		box-shadow:
			16px 0 0 #ff335c,
			32px 0 0 #5ce1e6,
			48px 0 0 #ffe38a,
			0 0 8px rgba(92, 225, 230, 0.45);
		animation: four-glow 3s ease-in-out infinite;
	}

	.egg.probe {
		width: 28px;
		height: 10px;
		border-radius: 2px;
		background: linear-gradient(90deg, #9aa6c4, #f4f7ff);
		animation: hover var(--dur, 20s) linear infinite;
	}

	.egg.probe::before {
		content: '';
		position: absolute;
		right: -6px;
		top: -8px;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(220, 230, 255, 0.7);
		border-radius: 50%;
		border-left-color: transparent;
	}

	.egg.probe::after {
		content: '';
		position: absolute;
		left: -10px;
		top: 3px;
		width: 12px;
		height: 3px;
		background: #5ce1e6;
		box-shadow: 0 0 8px #5ce1e6;
	}

	.egg.beacon {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ff335c;
		box-shadow: 0 0 8px #ff335c;
		animation: beacon 2.8s ease-out infinite;
	}

	.egg.starman {
		width: 10px;
		height: 16px;
		border-radius: 3px;
		background: linear-gradient(180deg, #f2f6ff 30%, #7d889e 32% 100%);
		animation: tumble var(--dur, 18s) linear infinite;
	}

	.egg.starman::before {
		content: '';
		position: absolute;
		left: 1px;
		top: -6px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 40%, #fff, #5ce1e6 55%, #234);
		box-shadow: 0 0 6px rgba(92, 225, 230, 0.6);
	}

	.egg.ark {
		width: 92px;
		height: 16px;
		border-radius: 40% 60% 50% 50%;
		background: linear-gradient(90deg, #2a3148, #cfd6ea 46%, #44506c);
		box-shadow: 0 0 12px rgba(139, 124, 255, 0.3);
		animation: swim var(--dur, 30s) linear infinite;
	}

	.egg.ark::before {
		content: '';
		position: absolute;
		inset: 4px 18%;
		border-radius: 40%;
		background: rgba(92, 225, 230, 0.25);
		box-shadow: 0 0 10px rgba(92, 225, 230, 0.35);
	}

	i.sighting.egg {
		left: -8%;
		top: var(--y, 30%);
		animation: flyby var(--dur, 16s) linear var(--delay, 0s) forwards;
	}


	@keyframes twirl {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes tumble {
		from {
			transform: rotate(var(--spin));
		}
		to {
			transform: rotate(calc(var(--spin) + 220deg));
		}
	}

	@keyframes swim {
		0%,
		100% {
			transform: rotate(var(--tilt)) scale(var(--scale, 1)) translate(0, 0);
		}
		50% {
			transform: rotate(var(--tilt)) scale(var(--scale, 1)) translate(28px, -10px);
		}
	}

	@keyframes hover {
		0%,
		100% {
			transform: rotate(var(--tilt)) scale(var(--scale, 1)) translate(0, 0);
		}
		50% {
			transform: rotate(var(--tilt)) scale(var(--scale, 1)) translate(18px, -14px);
		}
	}

	@keyframes monolith {
		0%,
		100% {
			opacity: 0.55;
			transform: rotate(var(--tilt)) scale(var(--scale, 1));
		}
		50% {
			opacity: 1;
			transform: rotate(var(--tilt)) scale(var(--scale, 1)) translateY(-8px);
		}
	}

	@keyframes beam {
		50% {
			opacity: 0.25;
		}
	}

	@keyframes pulsar {
		50% {
			transform: scale(1.5);
			opacity: 1;
			box-shadow: 0 0 14px 4px rgba(255, 227, 138, 0.85);
		}
	}

	@keyframes four-glow {
		50% {
			box-shadow:
				16px 0 0 #ff335c,
				32px 0 0 #5ce1e6,
				48px 0 0 #ffe38a,
				0 0 12px rgba(255, 227, 138, 0.7);
			transform: rotate(var(--tilt)) scale(calc(var(--scale, 1) * 1.08));
		}
	}

	@keyframes beacon {
		0% {
			box-shadow: 0 0 0 0 rgba(255, 51, 92, 0.6);
		}
		100% {
			box-shadow: 0 0 0 16px rgba(255, 51, 92, 0);
		}
	}

	@keyframes flyby {
		0% {
			transform: translate3d(0, 0, 0) rotate(var(--tilt)) scale(var(--scale, 1));
			opacity: 0;
		}
		8% {
			opacity: 1;
		}
		100% {
			transform: translate3d(118vw, 8vh, 0) rotate(calc(var(--tilt) + 12deg))
				scale(var(--scale, 1));
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.egg,
		.sighting {
			animation: none;
		}

		.sighting {
			opacity: 0;
		}
	}
</style>
