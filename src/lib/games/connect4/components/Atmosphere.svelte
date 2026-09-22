<script lang="ts">
	import Starfield from './Starfield.svelte';
	import {
		createSighting,
		createVoyage,
		generateSector,
		SECTOR_SPAN,
		type Planet,
		type Sector,
		type Sighting
	} from '../space';

	let root = $state<HTMLDivElement | null>(null);
	let sectors = $state<Sector[]>([]);
	let sightings = $state<Sighting[]>([]);

	function glide(node: HTMLElement, planet: Planet) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {};

		let current = planet;
		let anim: Animation | null = null;

		const play = (next: Planet) => {
			anim?.cancel();
			anim = node.animate(
				[
					{ transform: 'translate3d(0px, 0px, 0px)' },
					{ transform: `translate3d(${next.dx}, ${next.dy}, 0px)` }
				],
				{
					duration: Math.max(8, next.cruise) * 1000,
					delay: Math.max(0, next.phase) * 1000,
					easing: 'linear',
					fill: 'forwards',
					iterations: 1
				}
			);
		};

		play(current);
		return {
			update(next: Planet) {
				if (
					next.dx === current.dx &&
					next.dy === current.dy &&
					next.cruise === current.cruise &&
					next.phase === current.phase
				) {
					current = next;
					return;
				}
				current = next;
				play(next);
			},
			destroy() {
				anim?.cancel();
			}
		};
	}

	$effect(() => {
		const node = root;
		if (!node) return;

		const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const measure = () => ({
			w: Math.max(node.clientWidth || 0, window.innerWidth),
			h: Math.max(node.clientHeight || 0, window.innerHeight)
		});
		const boot = measure();
		const voyage = createVoyage(Date.now(), boot);
		const voyageSeed = voyage.seed;
		let nextIndex = voyage.nextIndex;
		let field = boot;
		sectors = voyage.sectors;

		const onResize = () => {
			const next = measure();
			if (Math.abs(next.w - field.w) < 160 && Math.abs(next.h - field.h) < 160) return;
			field = next;
			node.style.setProperty('--star-period', `${next.h * 1.5}px`);
		};

		node.style.setProperty('--voyage', '0px');
		node.style.setProperty('--drift', '0px');
		node.style.setProperty('--star-y', '0px');
		node.style.setProperty('--star-period', `${boot.h * 1.5}px`);
		window.addEventListener('resize', onResize);

		if (prefersReduce) {
			return () => window.removeEventListener('resize', onResize);
		}

		let travel = 0;
		let drift = 0;
		let last = performance.now();
		let frame = 0;
		let lastCull = 0;

		const tick = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			travel += 16 * dt;
			drift += 4.5 * dt;

			const height = field.h;
			const span = height * SECTOR_SPAN;
			const bands = sectors;
			const period = span * bands.length;
			const recycleAt = height * 2.35;

			for (let i = 0; i < bands.length; i += 1) {
				while (bands[i] && bands[i].origin + travel > recycleAt) {
					const origin = bands[i].origin - period;
					bands[i] = generateSector(
						voyageSeed,
						nextIndex,
						Date.now() + nextIndex * 7919,
						origin,
						field
					);
					nextIndex += 1;
					if (Math.random() < 0.09 && sightings.length < 2) {
						sightings = [...sightings, createSighting(Date.now())];
					}
				}
			}

			node.style.setProperty('--voyage', `${travel}px`);
			node.style.setProperty('--drift', `${drift}px`);
			const starPeriod = height * 1.5;
			const starY = ((travel * 0.32) % starPeriod + starPeriod) % starPeriod;
			node.style.setProperty('--star-y', `${starY}px`);
			node.style.setProperty('--star-period', `${starPeriod}px`);

			if (sightings.length && now - lastCull > 900) {
				lastCull = now;
				const keep = sightings.filter((egg) => now - egg.born < egg.life);
				if (keep.length !== sightings.length) sightings = keep;
			}
			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<div class="atmosphere" bind:this={root} aria-hidden="true">
	<div class="wash"></div>
	<Starfield />
	{#each sectors as sector (sector.id)}
		<div
			class="sector"
			style:--origin="{sector.origin}px"
			style:--tint="rgba({sector.tint}, 0.16)"
		>
			<div class="tint"></div>
			<i
				class="lane"
				style:left="{sector.lane.x}%"
				style:top="{sector.lane.y}%"
				style:opacity={sector.lane.opacity}
				style:--tilt="{sector.lane.tilt}deg"
			></i>
			{#each sector.nebulae as cloud (cloud.id)}
				<i
					class="nebula"
					style:left="{cloud.x}%"
					style:top="{cloud.y}%"
					style:width="{cloud.w}vw"
					style:height="{cloud.h}vw"
					style:opacity={cloud.opacity}
					style:--a={cloud.a}
					style:--b={cloud.b}
					style:--tilt="{cloud.tilt}deg"
				></i>
			{/each}
			{#each sector.wisps as wisp (wisp.id)}
				<i
					class="wisp"
					style:left="{wisp.x}%"
					style:top="{wisp.y}%"
					style:width="{wisp.w}vw"
					style:height="{wisp.h}vw"
					style:opacity={wisp.opacity}
					style:--a={wisp.a}
					style:--tilt="{wisp.tilt}deg"
				></i>
			{/each}
			{#if sector.galaxy}
				<i
					class="galaxy"
					style:left="{sector.galaxy.x}%"
					style:top="{sector.galaxy.y}%"
					style:width="{sector.galaxy.size}px"
					style:height="{sector.galaxy.size}px"
					style:--spin="{sector.galaxy.spin}s"
				></i>
			{/if}
			{#if sector.galaxyB}
				<i
					class="galaxy dim"
					style:left="{sector.galaxyB.x}%"
					style:top="{sector.galaxyB.y}%"
					style:width="{sector.galaxyB.size}px"
					style:height="{sector.galaxyB.size}px"
					style:--spin="{sector.galaxyB.spin}s"
				></i>
			{/if}
			<div class="motes far" style:box-shadow={sector.dust}></div>
			<div class="motes glow" style:box-shadow={sector.glow}></div>
			<div class="motes worlds" style:box-shadow={sector.distant}></div>
			{#each sector.planets as planet (planet.id)}
				<div
					class={planet.className}
					style:left="{planet.x}%"
					style:top="{planet.y}%"
					style:width="{planet.size}px"
					style:height="{planet.size}px"
					style:--spin="{planet.spin}s"
					style:--phase="{planet.phase}s"
					style:--axial="{planet.axial}deg"
					style:--orbit="{planet.orbit}s"
					style:--hi={planet.hi}
					style:--mid={planet.mid}
					style:--lo={planet.lo}
					style:--halo={planet.halo}
					style:--ring={planet.ring}
					style:--haze={planet.haze}
					style:--moon={planet.moonTint}
					use:glide={planet}
				>
					<i class="halo"></i>
					{#if planet.atmo !== 'none'}
						<i class="atmo"></i>
					{/if}
					{#if planet.ringed}
						<i class="rings back"></i>
					{/if}
					<span class="spin">
						<i class="body"></i>
						{#if planet.storm}<i class="storm"></i>{/if}
						{#if planet.cities}<i class="cities"></i>{/if}
					</span>
					<i class="glint"></i>
					{#if planet.atmo === 'aurora'}
						<i class="aurora"></i>
					{/if}
					{#if planet.ringed}
						<i class="rings front"></i>
					{/if}
					{#if planet.moon}
						<i class="moon"></i>
					{/if}
				</div>
			{/each}
			{#each sector.eggs as egg (egg.id)}
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
			{#each sector.comets as comet (comet.id)}
				<i
					class="comet"
					style:--x="{comet.x}%"
					style:--y="{comet.y}%"
					style:--angle="{comet.angle}deg"
					style:--streak="{comet.travel}vw"
					style:--dur="{comet.dur}s"
					style:--delay="{comet.delay}s"
					style:--len="{comet.len}px"
					style:--thick="{comet.thick}px"
					style:--color={comet.color}
				></i>
			{/each}
			{#each sector.rocks as rock (rock.id)}
				<i
					class="pebble"
					style:left="{rock.x}%"
					style:top="{rock.y}%"
					style:width="{rock.w}px"
					style:height="{rock.h}px"
					style:--spin="{rock.rot}deg"
				></i>
			{/each}
			{#if sector.craft}
				<div class="craft" style:left="{sector.craft.x}%" style:top="{sector.craft.y}%"></div>
			{/if}
		</div>
	{/each}
	<div class="ring r1"></div>
	<div class="ring r2"></div>
	<div class="ring r3"></div>
	<div class="grid"></div>
	<div class="vignette"></div>
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
		transform: translateZ(0);
		contain: layout style;
		--voyage: 0px;
		--drift: 0px;
		--star-y: 0px;
		--star-period: 140vh;
	}

	.wash,
	.sector,
	.ring,
	.grid,
	.vignette {
		position: absolute;
	}

	.wash {
		inset: 0;
		background:
			radial-gradient(1100px 700px at 8% 4%, rgba(139, 124, 255, 0.22), transparent 58%),
			radial-gradient(900px 560px at 94% 10%, rgba(255, 51, 92, 0.14), transparent 52%),
			linear-gradient(180deg, #12081c 0%, #07060d 52%, #0c0714 100%);
	}

	.sector {
		inset: -20% 0 0 0;
		height: 140%;
		transform: translate3d(calc(var(--drift) * -1), calc(var(--voyage) + var(--origin)), 0);
		contain: layout style;
	}

	.tint {
		position: absolute;
		inset: 10% 8%;
		border-radius: 50%;
		background: radial-gradient(ellipse at 50% 40%, var(--tint), transparent 70%);
		opacity: 0.85;
	}

	.nebula,
	.wisp,
	.galaxy,
	.motes,
	.world,
	.comet,
	.pebble,
	.craft,
	.lane,
	.egg,
	.sighting {
		position: absolute;
	}

	.lane {
		width: 160%;
		height: 18%;
		border-radius: 50%;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(180, 200, 255, 0.08) 18%,
			rgba(255, 255, 255, 0.16) 50%,
			rgba(160, 140, 255, 0.1) 74%,
			transparent 100%
		);
		filter: blur(10px);
		transform: rotate(var(--tilt));
	}

	.nebula {
		border-radius: 50%;
		background:
			radial-gradient(ellipse 70% 55% at 38% 42%, var(--a), transparent 62%),
			radial-gradient(ellipse 40% 50% at 62% 58%, var(--b), transparent 60%);
		transform: rotate(var(--tilt));
	}

	.wisp {
		border-radius: 50%;
		background: radial-gradient(ellipse at 50% 50%, var(--a), transparent 70%);
		transform: rotate(var(--tilt));
	}

	.galaxy {
		border-radius: 50%;
		background:
			radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18), transparent 18%),
			conic-gradient(
				from 30deg,
				transparent 0 12%,
				rgba(139, 124, 255, 0.22) 18%,
				transparent 32%,
				rgba(92, 225, 230, 0.16) 44%,
				transparent 58%,
				rgba(255, 180, 220, 0.12) 70%,
				transparent 84%
			);
		opacity: 0.55;
		animation: twirl var(--spin, 90s) linear infinite;
	}

	.galaxy.dim {
		opacity: 0.32;
	}

	.motes {
		width: 2px;
		height: 2px;
		left: 0;
		top: 0;
		background: transparent;
	}

	.motes.worlds {
		opacity: 0.9;
	}

	.world {
		overflow: visible;
	}

	.world .halo,
	.world .body,
	.world .rings,
	.world .moon,
	.world .spin,
	.world .glint,
	.world .aurora,
	.world .storm,
	.world .cities,
	.world .atmo {
		position: absolute;
		border-radius: 50%;
	}

	.world .spin {
		inset: 0;
		overflow: hidden;
		z-index: 1;
		animation: planet-spin var(--spin, 48s) linear infinite;
	}

	.world.retro .spin {
		animation-direction: reverse;
	}

	.world .halo {
		inset: -22%;
		background: radial-gradient(circle, var(--halo, rgba(139, 124, 255, 0.28)), transparent 68%);
		animation: halo-breathe 7s ease-in-out var(--phase, 0s) infinite;
	}

	.world .atmo {
		inset: -34%;
		background: radial-gradient(circle, var(--haze, rgba(160, 200, 255, 0.16)), transparent 72%);
		z-index: 0;
		pointer-events: none;
	}

	.world.atmo-ion .atmo {
		mix-blend-mode: screen;
		opacity: 0.85;
	}

	.world.atmo-burn .halo {
		animation-duration: 3.4s;
	}

	.world .body {
		inset: 0;
		box-shadow: inset -14px -10px 22px rgba(0, 0, 0, 0.48);
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.34), transparent 26%),
			radial-gradient(circle at 70% 68%, var(--lo), var(--mid) 46%, var(--hi));
	}

	.world .glint {
		left: 18%;
		top: 16%;
		width: 28%;
		height: 20%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.45), transparent 70%);
		filter: blur(1px);
		z-index: 3;
		animation: glint 5.5s ease-in-out var(--phase, 0s) infinite;
	}

	.world .aurora {
		inset: -18%;
		background: conic-gradient(
			from 200deg,
			transparent 0 18%,
			var(--haze, rgba(80, 255, 210, 0.28)) 24%,
			transparent 38%,
			var(--halo, rgba(140, 180, 255, 0.22)) 48%,
			transparent 62%
		);
		mix-blend-mode: screen;
		opacity: 0.55;
		z-index: 2;
		animation: aurora 9s ease-in-out infinite;
	}

	.world .storm {
		width: 22%;
		height: 14%;
		left: 58%;
		top: 46%;
		background: radial-gradient(ellipse, var(--lo), color-mix(in srgb, var(--mid) 20%, transparent) 70%);
		filter: blur(1px);
		opacity: 0.85;
	}

	.world .cities {
		inset: 0;
		background:
			radial-gradient(1.2px 1.2px at 62% 38%, #ffe38a, transparent),
			radial-gradient(1px 1px at 70% 52%, #5ce1e6, transparent),
			radial-gradient(1.4px 1.4px at 78% 44%, #ffb0d0, transparent),
			radial-gradient(1px 1px at 66% 61%, #fff, transparent),
			radial-gradient(1.1px 1.1px at 74% 70%, #ffe38a, transparent),
			radial-gradient(0.9px 0.9px at 84% 56%, #8b7cff, transparent);
		clip-path: inset(0 0 0 52%);
		opacity: 0.8;
	}

	.gas .body {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.32), transparent 26%),
			repeating-linear-gradient(
				104deg,
				var(--mid) 0 10px,
				var(--hi) 10px 16px,
				var(--lo) 16px 22px,
				var(--mid) 22px 30px
			);
	}

	.ocean .body {
		background:
			radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.4), transparent 26%),
			radial-gradient(circle at 28% 62%, color-mix(in srgb, var(--hi) 70%, #0a2030) 0 18%, transparent 42%),
			radial-gradient(circle at 70% 68%, var(--lo), var(--mid) 42%, var(--hi));
	}

	.toxic .body {
		background:
			radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.28), transparent 24%),
			radial-gradient(circle at 62% 58%, var(--hi), transparent 36%),
			radial-gradient(circle at 70% 68%, var(--lo), var(--mid) 48%, var(--hi));
	}

	.dust .body {
		background:
			radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.22), transparent 24%),
			radial-gradient(circle at 58% 40%, color-mix(in srgb, var(--lo) 55%, transparent) 0 12%, transparent 28%),
			radial-gradient(circle at 70% 68%, var(--lo), var(--mid) 46%, var(--hi));
	}

	.ringed .rings {
		left: -72%;
		top: -72%;
		width: 244%;
		height: 244%;
		border: 8px solid var(--ring, rgba(255, 214, 140, 0.38));
		border-left-color: transparent;
		border-right-color: color-mix(in srgb, var(--ring, rgba(255, 214, 140, 0.38)) 28%, transparent);
		border-radius: 50%;
		transform: rotateX(76deg);
		transform-origin: 50% 50%;
		animation: ring-spin 48s linear infinite;
	}

	.ringed .rings.back {
		z-index: 0;
	}

	.ringed .rings.front {
		z-index: 2;
		clip-path: inset(50% 0 0 0);
		border-color: var(--ring, rgba(255, 228, 170, 0.55));
	}

	.ringed:not(.gas) .rings {
		border-width: 5px;
		animation-duration: 36s;
	}

	.world .moon {
		width: 18%;
		height: 18%;
		left: 50%;
		top: 50%;
		background: radial-gradient(circle at 30% 30%, #f6f2ea, var(--moon, #9b9488) 58%, #6c655c);
		box-shadow: inset -4px -3px 6px rgba(0, 0, 0, 0.4);
		animation: moon var(--orbit, 14s) linear infinite;
		z-index: 4;
	}

	.ember .halo {
		animation-duration: 3.4s;
	}

	.egg {
		width: 42px;
		height: 42px;
		transform: rotate(var(--tilt)) scale(var(--scale, 1));
		opacity: 0.92;
		z-index: 4;
		filter: drop-shadow(0 0 8px rgba(92, 225, 230, 0.25));
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
			48px 0 0 #ffe38a;
		animation: four-glow 3s ease-in-out infinite;
		filter: drop-shadow(0 0 6px rgba(92, 225, 230, 0.55));
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

	.ring {
		left: 50%;
		top: 42%;
		border: 1px solid rgba(92, 225, 230, 0.12);
		border-radius: 50%;
	}

	.r1 {
		width: min(92vw, 820px);
		height: min(92vw, 820px);
		animation: spin 48s linear infinite;
	}

	.r2 {
		width: min(68vw, 560px);
		height: min(68vw, 560px);
		border-color: rgba(255, 51, 92, 0.12);
		animation: spin 32s linear infinite reverse;
	}

	.r3 {
		width: min(110vw, 1040px);
		height: min(110vw, 1040px);
		border-color: rgba(139, 124, 255, 0.1);
		border-style: dashed;
		animation: spin 72s linear infinite;
	}

	.comet {
		left: var(--x);
		top: var(--y);
		width: var(--len);
		height: var(--thick);
		border-radius: 999px;
		background: linear-gradient(90deg, transparent 0%, var(--color) 58%, #fff 100%);
		box-shadow: 6px 0 10px 1px color-mix(in srgb, var(--color) 55%, transparent);
		opacity: 0;
		animation: streak var(--dur) linear var(--delay) infinite;
	}

	.comet::after {
		content: '';
		position: absolute;
		right: -2px;
		top: 50%;
		width: 5px;
		height: 5px;
		translate: 0 -50%;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 8px 2px var(--color);
	}

	.pebble {
		border-radius: 40% 60% 55% 45%;
		background: radial-gradient(circle at 30% 30%, #8a8498, #3b3548 70%);
		opacity: 0.55;
		animation: tumble 22s linear infinite;
	}

	.craft {
		width: 34px;
		height: 8px;
		flex: none;
		background: linear-gradient(90deg, #9aa4c7, #eef3ff);
		border-radius: 2px;
		box-shadow:
			-16px 0 0 -2px rgba(92, 225, 230, 0.55),
			16px 0 0 -2px rgba(92, 225, 230, 0.55),
			0 0 12px rgba(255, 255, 255, 0.4);
		animation: cruise 28s linear infinite;
	}

	.grid {
		inset: auto 0 -18% 0;
		height: 50%;
		background-image:
			linear-gradient(rgba(92, 225, 230, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(92, 225, 230, 0.1) 1px, transparent 1px);
		background-size: 72px 72px;
		transform: perspective(420px) rotateX(64deg);
		mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 78%);
		animation: grid 16s linear infinite;
	}

	.vignette {
		inset: 0;
		background: radial-gradient(circle at 50% 38%, transparent 30%, rgba(0, 0, 0, 0.5) 100%);
	}

	@keyframes twirl {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes spin {
		from {
			transform: translate(-50%, -50%) rotate(0deg);
		}
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}

	@keyframes planet-spin {
		from {
			transform: rotate(var(--axial, 0deg));
		}
		to {
			transform: rotate(calc(var(--axial, 0deg) + 360deg));
		}
	}

	@keyframes halo-breathe {
		50% {
			opacity: 0.65;
		}
	}

	@keyframes glint {
		50% {
			opacity: 0.45;
			transform: translate(6%, 4%) scale(1.1);
		}
	}

	@keyframes aurora {
		50% {
			opacity: 0.85;
			transform: rotate(18deg) scale(1.05);
		}
	}

	@keyframes ring-spin {
		from {
			transform: rotateX(76deg) rotate(0deg);
		}
		to {
			transform: rotateX(76deg) rotate(360deg);
		}
	}

	@keyframes moon {
		from {
			transform: rotate(0deg) translate(118%) rotate(0deg);
		}
		to {
			transform: rotate(360deg) translate(118%) rotate(-360deg);
		}
	}

	@keyframes streak {
		0% {
			transform: rotate(var(--angle)) translateX(0);
			opacity: 0;
		}
		7% {
			opacity: 1;
		}
		82% {
			opacity: 1;
		}
		100% {
			transform: rotate(var(--angle)) translateX(var(--streak));
			opacity: 0;
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

	@keyframes cruise {
		0% {
			transform: translate3d(0, 0, 0);
			opacity: 0;
		}
		8% {
			opacity: 0.85;
		}
		100% {
			transform: translate3d(40vw, 12vh, 0);
			opacity: 0;
		}
	}

	@keyframes grid {
		to {
			background-position: 0 72px;
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
			filter: drop-shadow(0 0 10px #ffe38a);
		}
	}

	@keyframes four-glow {
		50% {
			filter: drop-shadow(0 0 12px rgba(255, 227, 138, 0.9));
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
		.galaxy,
		.world,
		.world .spin,
		.world .halo,
		.world .glint,
		.world .aurora,
		.world .atmo,
		.world .rings,
		.ring,
		.comet,
		.pebble,
		.craft,
		.grid,
		.moon,
		.egg,
		.sighting {
			animation: none;
		}

		.sector {
			transform: none;
		}

		.comet,
		.sighting {
			opacity: 0;
		}
	}
</style>
