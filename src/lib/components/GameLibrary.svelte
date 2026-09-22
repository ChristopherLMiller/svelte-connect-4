<script lang="ts">
	import { goto } from '$app/navigation';
	import { Spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { setMusicStation } from '$lib/audio/station';
	import ArcadeCabinet from '$lib/components/ArcadeCabinet.svelte';
	import HallEggs from '$lib/components/HallEggs.svelte';
	import LibrarySettings from '$lib/components/LibrarySettings.svelte';
	import { LIBRARY_GAMES, tickerCopy, type LibraryGame } from '$lib/games/catalog';
	import { closeLibrarySettings, libraryPanel, openLibrarySettings } from '$lib/library/settings.svelte';
	import { loadCabinet, recallCabinet, rememberCabinet } from '$lib/library/persist';
	import { playLibraryHover, playLibrarySelect } from '$lib/library/sfx';
	import { primeAudio } from '$lib/audio/prefs.svelte';

	const MOTES = Array.from({ length: 18 }, (_, i) => i);
	const LIGHTS = Array.from({ length: 56 }, (_, i) => i);
	const TICKER = tickerCopy();
	const COUNT = LIBRARY_GAMES.length;
	const STEP = 360 / Math.max(COUNT, 1);

	function wrap(next: number) {
		return ((next % COUNT) + COUNT) % COUNT;
	}

	function indexOfId(id: string | null | undefined) {
		const found = LIBRARY_GAMES.findIndex((game) => game.id === id);
		return found >= 0 ? found : 0;
	}

	const start = indexOfId(recallCabinet());
	let index = $state(start);
	let leaving = $state(false);
	let leaveTitle = $state((LIBRARY_GAMES[start] ?? LIBRARY_GAMES[0]).title);
	let quiet = $state(false);
	let wide = $state(1200);
	let calm = $state(false);
	let dragged = false;
	let dragging = false;
	let dragOrigin = 0;
	let dragSpin = 0;
	let restored = false;

	const spin = new Spring(-start * STEP, { stiffness: 0.1, damping: 0.82, precision: 0.05 });
	const facingIndex = $derived(wrap(Math.round(-spin.current / STEP)));
	const focused = $derived(LIBRARY_GAMES[index] ?? LIBRARY_GAMES[0]);
	const rx = $derived(Math.max(168, Math.min(wide * 0.24, 268)));
	const rz = $derived(Math.max(96, Math.min(wide * 0.11, 148)));

	const DRAG = 12;

	function prefersReduce() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function keep(i = index) {
		const game = LIBRARY_GAMES[wrap(i)];
		if (game) rememberCabinet(game.id);
	}

	function shortest(from: number, to: number) {
		let delta = to - from;
		if (delta > COUNT / 2) delta -= COUNT;
		if (delta < -COUNT / 2) delta += COUNT;
		return delta;
	}

	function goTo(next: number) {
		const to = wrap(next);
		if (to === index) return;
		const delta = shortest(index, to);
		index = to;
		keep(to);
		spin.set(spin.target - delta * STEP, { instant: calm });
		playLibraryHover();
	}

	function slotPose(i: number) {
		const ang = ((i * STEP + spin.current) * Math.PI) / 180;
		const side = Math.sin(ang);
		const depth = Math.cos(ang);
		const x = side * rx;
		const z = depth * rz;
		const yaw = -side * 20;
		const scale = 0.84 + 0.16 * Math.max(0, depth);
		const y = (1 - depth) * 6;
		const opacity = depth < -0.15 ? Math.max(0, (depth + 1) * 0.4) : 0.78 + 0.22 * depth;
		return {
			transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${yaw}deg) scale(${scale})`,
			z: Math.round(50 + depth * 50),
			opacity,
			events: depth > -0.2 ? 'auto' : 'none'
		};
	}

	$effect(() => {
		setMusicStation('library');
		wide = window.innerWidth;
		calm = prefersReduce();
		const onResize = () => (wide = window.innerWidth);
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (restored) return;
		restored = true;
		const saved = indexOfId(loadCabinet());
		if (saved === index) return;
		index = saved;
		spin.set(-saved * STEP, { instant: true });
	});

	function launch(game: LibraryGame = focused) {
		if (leaving) return;
		primeAudio();
		playLibrarySelect();
		index = LIBRARY_GAMES.findIndex((item) => item.id === game.id);
		keep(index);
		leaveTitle = game.title;
		leaving = true;
		window.setTimeout(() => {
			void goto(game.href);
		}, prefersReduce() ? 80 : 720);
	}

	function pick(i: number) {
		if (dragged) return;
		if (i !== index && i !== facingIndex) {
			goTo(i);
			return;
		}
		launch(LIBRARY_GAMES[i]);
	}

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && libraryPanel.open) {
			closeLibrarySettings();
			return;
		}
		if (libraryPanel.open) return;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			goTo(index + 1);
			return;
		}
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			goTo(index - 1);
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			launch();
		}
	}

	function catchWheel(node: HTMLElement) {
		let last = 0;
		const on = (event: WheelEvent) => {
			if (libraryPanel.open || leaving || dragging) return;
			event.preventDefault();
			const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			if (Math.abs(delta) < 8) return;
			const now = performance.now();
			if (now - last < 160) return;
			last = now;
			goTo(index + (delta > 0 ? 1 : -1));
		};
		node.addEventListener('wheel', on, { passive: false });
		return () => node.removeEventListener('wheel', on);
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		dragging = true;
		dragged = false;
		dragOrigin = event.clientX;
		dragSpin = spin.current;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const dx = event.clientX - dragOrigin;
		if (!dragged) {
			if (Math.abs(dx) < DRAG) return;
			dragged = true;
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}
		spin.set(dragSpin + (dx / Math.max(160, wide * 0.2)) * STEP, { instant: true });
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (!dragged) return;
		const nearest = wrap(Math.round(-spin.current / STEP));
		const snapped = -nearest * STEP;
		if (nearest !== index) {
			index = nearest;
			playLibraryHover();
		}
		keep(nearest);
		spin.set(snapped, { instant: calm });
		window.setTimeout(() => {
			dragged = false;
		}, 40);
	}
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<section class="hall" class:leaving class:quiet in:fade={{ duration: 420 }}>
	<div class="ceiling" aria-hidden="true">
		<span class="pipe mag"></span>
		<span class="pipe cyan"></span>
		<span class="pipe gold"></span>
		<span class="lamp a"></span>
		<span class="lamp b"></span>
	</div>
	<div class="void" aria-hidden="true"></div>
	<div class="haze" aria-hidden="true"></div>
	<div class="grid" aria-hidden="true"><i></i></div>
	<div class="carpet" aria-hidden="true"></div>
	<div class="scan" aria-hidden="true"><i></i></div>
	{#each MOTES as i (i)}
		<i class="mote" style:--i={i} aria-hidden="true"></i>
	{/each}

	<div class="sign left" aria-hidden="true">
		<span>FREE</span>
		<strong>PLAY</strong>
	</div>
	<div class="sign right" aria-hidden="true">
		<span>HIGH</span>
		<strong>SCORE</strong>
	</div>
	<p class="poster" aria-hidden="true">THE HOUSE THINKS BACK</p>
	<div class="changer" aria-hidden="true">
		<span>CHANGE</span>
		<strong>TOKEN</strong>
	</div>

	<HallEggs />

	<header class="top">
		<div class="brand">
			<p class="kicker">Always open · machines inside</p>
			<h1><span class="glow" aria-hidden="true">AI Arcade</span>AI Arcade</h1>
			<p class="lede">Live cabinets. Real boards. Drop in.</p>
		</div>
		<div class="tools">
			<p class="credits"><b></b> FREE PLAY</p>
			<button
				type="button"
				class="gear"
				onclick={() => {
					primeAudio();
					openLibrarySettings();
				}}
			>
				Settings
			</button>
		</div>
	</header>

	<div class="floor">
		<button
			type="button"
			class="nudge prev"
			aria-label="Previous cabinet"
			onclick={() => goTo(index - 1)}
		>
			‹
		</button>
		<div
			class="stage"
			class:calm
			{@attach catchWheel}
			role="group"
			aria-label="Cabinet wheel"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<div class="ring" aria-hidden="true"></div>
			<div class="wheel">
				{#each LIBRARY_GAMES as game, i (game.id)}
					{@const pose = slotPose(i)}
					<div
						class="slot"
						class:hot={i === facingIndex}
						style:transform={pose.transform}
						style:z-index={pose.z}
						style:opacity={pose.opacity}
						style:pointer-events={pose.events}
					>
						<ArcadeCabinet
							{game}
							nested
							compact
							hot={i === facingIndex}
							onlaunch={() => pick(i)}
						/>
					</div>
				{/each}
			</div>
		</div>
		<button
			type="button"
			class="nudge next"
			aria-label="Next cabinet"
			onclick={() => goTo(index + 1)}
		>
			›
		</button>
		<p class="pick">
			<strong>{focused.title}</strong>
			<span>{focused.tagline}</span>
		</p>
	</div>

	<footer class="foot">
		<p>
			<strong>{LIBRARY_GAMES.length} cabinets online</strong>
			<span>Arrows spin the wheel · Enter starts</span>
		</p>
		<div class="rail" aria-hidden="true">
			<div class="lights">
				{#each LIGHTS as i (i)}
					<i style:--n={i}></i>
				{/each}
			</div>
			<div class="ticker">
				<div class="track">
					<p>{TICKER}</p>
					<p aria-hidden="true">{TICKER}</p>
				</div>
			</div>
		</div>
	</footer>

	<LibrarySettings />

	{#if leaving}
		<div class="leave" transition:fade={{ duration: 180 }}>
			<p class="coin">INSERT COIN</p>
			<p class="boot">Booting {leaveTitle}</p>
		</div>
	{/if}
</section>

<style>
	.hall {
		--ink: #f7f1ff;
		--mute: #b7a8d8;
		position: relative;
		isolation: isolate;
		--gutter: clamp(16px, 4vw, 48px);
		min-height: 100dvh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		gap: clamp(16px, 3vh, 32px);
		padding: clamp(16px, 3vw, 36px) var(--gutter) 0;
		overflow: hidden;
		background: #070014;
		color: var(--ink);
		font-family: 'Exo 2', ui-sans-serif, system-ui, sans-serif;
	}

	.hall.quiet {
		animation-play-state: paused;
	}

	.void,
	.haze,
	.grid,
	.carpet,
	.scan,
	.mote,
	.sign,
	.poster,
	.changer,
	.ceiling {
		pointer-events: none;
		position: absolute;
	}

	.ceiling {
		inset: 0 0 auto;
		height: 18%;
		z-index: 1;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent);
	}

	.pipe {
		position: absolute;
		top: 10px;
		height: 8px;
		border-radius: 8px;
		box-shadow: 0 0 18px currentColor;
	}

	.pipe.mag {
		left: 8%;
		width: 28%;
		color: #ff2bd6;
		background: #ff2bd6;
	}

	.pipe.cyan {
		left: 38%;
		width: 26%;
		top: 22px;
		color: #00f0ff;
		background: #00f0ff;
	}

	.pipe.gold {
		right: 8%;
		width: 22%;
		color: #ffe14a;
		background: #ffe14a;
	}

	.lamp {
		position: absolute;
		top: 0;
		width: 90px;
		height: 42vh;
		background: linear-gradient(180deg, rgba(255, 225, 74, 0.16), transparent 70%);
		clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%);
		opacity: 0.7;
	}

	.lamp.a {
		left: 18%;
	}

	.lamp.b {
		right: 18%;
		background: linear-gradient(180deg, rgba(0, 240, 255, 0.14), transparent 70%);
	}

	.void {
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(900px 520px at 18% -10%, rgba(255, 43, 214, 0.28), transparent 58%),
			radial-gradient(820px 540px at 88% 0%, rgba(0, 240, 255, 0.2), transparent 52%),
			radial-gradient(700px 480px at 50% 120%, rgba(255, 225, 74, 0.1), transparent 60%),
			linear-gradient(180deg, #140022 0%, #070014 42%, #12081f 100%);
	}

	.haze {
		inset: 0;
		z-index: 0;
		background: radial-gradient(ellipse at 50% 80%, rgba(90, 20, 120, 0.35), transparent 55%);
		animation: breathe 7s ease-in-out infinite;
		will-change: opacity;
	}

	.grid {
		left: -10%;
		right: -10%;
		bottom: -12%;
		height: 62%;
		z-index: 0;
		overflow: hidden;
		transform: perspective(700px) rotateX(62deg);
		transform-style: preserve-3d;
		mask-image: linear-gradient(180deg, transparent, #000 22%, #000 82%, transparent);
	}

	.grid i {
		position: absolute;
		inset: -20%;
		background-image:
			linear-gradient(rgba(0, 240, 255, 0.22) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 43, 214, 0.16) 1px, transparent 1px);
		background-size: 64px 64px;
		animation: gridShift 18s linear infinite;
		will-change: transform;
	}

	.carpet {
		left: 8%;
		right: 8%;
		bottom: 0;
		height: 18%;
		z-index: 0;
		background:
			repeating-linear-gradient(90deg, rgba(90, 20, 80, 0.35) 0 12px, rgba(40, 8, 50, 0.25) 12px 24px);
		mask-image: linear-gradient(180deg, transparent, #000 40%);
		opacity: 0.55;
	}

	.scan {
		inset: 0;
		z-index: 4;
		overflow: hidden;
		mix-blend-mode: overlay;
		opacity: 0.08;
		isolation: isolate;
		transform: translateZ(0);
	}

	.scan i {
		position: absolute;
		left: 0;
		right: 0;
		top: -12px;
		height: calc(100% + 24px);
		background: repeating-linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.35) 0 1px,
			transparent 1px 3px
		);
		animation: scanMove 6s linear infinite;
		will-change: transform;
	}

	.mote {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		left: calc(6% + (var(--i) * 5.1%));
		bottom: 12%;
		background: #ffe14a;
		opacity: 0.45;
		box-shadow: 0 0 10px #ffe14a;
		animation: float 5.4s ease-in-out infinite;
		animation-delay: calc(var(--i) * -0.28s);
		z-index: 1;
		will-change: transform, opacity;
	}

	.mote:nth-child(odd) {
		background: #00f0ff;
		box-shadow: 0 0 10px #00f0ff;
		width: 4px;
		height: 4px;
	}

	.sign {
		top: 22%;
		z-index: 1;
		padding: 10px 12px;
		border: 3px solid currentColor;
		rotate: -8deg;
		text-align: center;
		line-height: 0.9;
		font-family: Bungee, Impact, sans-serif;
		text-shadow: 0 0 12px currentColor;
	}

	.sign span,
	.sign strong {
		display: block;
	}

	.sign span {
		font-size: 0.7rem;
		letter-spacing: 0.2em;
	}

	.sign strong {
		font-size: 1.35rem;
	}

	.sign.left {
		left: clamp(8px, 3vw, 28px);
		color: #ff2bd6;
		box-shadow: 0 0 24px rgba(255, 43, 214, 0.25);
	}

	.sign.right {
		right: clamp(8px, 3vw, 28px);
		color: #00f0ff;
		rotate: 7deg;
		box-shadow: 0 0 24px rgba(0, 240, 255, 0.22);
	}

	.poster {
		margin: 0;
		top: 58%;
		right: 4%;
		z-index: 1;
		rotate: 12deg;
		letter-spacing: 0.28em;
		font-size: 0.62rem;
		color: #ffe14a;
		opacity: 0.55;
	}

	.changer {
		left: 18px;
		bottom: 18%;
		z-index: 1;
		padding: 10px 8px 12px;
		width: 72px;
		text-align: center;
		background: linear-gradient(180deg, #2a1a38, #100818);
		border: 2px solid #ffe14a;
		box-shadow: 0 0 16px rgba(255, 225, 74, 0.25);
		font-family: Bungee, Impact, sans-serif;
		color: #ffe14a;
	}

	.changer span,
	.changer strong {
		display: block;
	}

	.changer span {
		font-size: 0.48rem;
		letter-spacing: 0.14em;
	}

	.changer strong {
		font-size: 0.78rem;
		margin-top: 4px;
	}

	.top,
	.floor,
	.foot {
		position: relative;
		z-index: 2;
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
	}

	.brand {
		text-align: left;
	}

	.lights {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 3px;
		width: 100%;
		padding: 0 10px;
		box-sizing: border-box;
	}

	.lights i {
		width: 9px;
		height: 9px;
		flex: 0 0 auto;
		border-radius: 50%;
		background: #ff2bd6;
		opacity: 0.25;
		box-shadow: 0 0 8px #ff2bd6;
		animation: chase 1.5s linear infinite;
		animation-delay: calc(var(--n) * -0.08s);
	}

	.lights i:nth-child(3n) {
		background: #00f0ff;
		box-shadow: 0 0 8px #00f0ff;
	}

	.lights i:nth-child(3n + 1) {
		background: #ffe14a;
		box-shadow: 0 0 8px #ffe14a;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #00f0ff;
	}

	h1 {
		position: relative;
		margin: 4px 0 0;
		font-family: Bungee, Impact, sans-serif;
		font-size: clamp(2.4rem, 8vw, 4.6rem);
		line-height: 0.92;
		letter-spacing: 0.02em;
		background: linear-gradient(90deg, #00f0ff, #ffe14a 42%, #ff2bd6 78%, #00f0ff);
		background-size: 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: marquee 5s linear infinite;
	}

	h1 .glow {
		position: absolute;
		inset: 0;
		color: #ff2bd6;
		text-shadow: 0 0 18px rgba(255, 43, 214, 0.45), 0 0 32px rgba(0, 240, 255, 0.28);
		z-index: -1;
	}

	.lede {
		margin: 8px 0 0;
		color: var(--mute);
		font-size: 1.02rem;
	}

	.ticker {
		width: 100%;
		overflow: hidden;
		border: 2px solid #39ff9a;
		border-left: 0;
		border-right: 0;
		background: #04140c;
		box-shadow: 0 0 14px rgba(57, 255, 154, 0.25);
	}

	.track {
		display: flex;
		width: max-content;
		animation: tick 36s linear infinite;
		will-change: transform;
	}

	.track p {
		flex: none;
		margin: 0;
		padding: 7px 0;
		white-space: nowrap;
		font-family: Bungee, Impact, sans-serif;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		color: #39ff9a;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.credits {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		letter-spacing: 0.16em;
		font-size: 0.72rem;
		color: #ffe14a;
		text-shadow: 0 0 10px rgba(255, 225, 74, 0.45);
	}

	.credits b {
		position: relative;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #39ff9a;
		box-shadow: 0 0 12px #39ff9a;
	}

	.credits b::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: #39ff9a;
		animation: live 1.6s ease-out infinite;
		will-change: transform, opacity;
	}

	.gear {
		appearance: none;
		border: 1px solid rgba(0, 240, 255, 0.4);
		background: rgba(12, 0, 28, 0.7);
		color: var(--ink);
		border-radius: 999px;
		padding: 10px 16px;
		cursor: pointer;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.78rem;
	}

	.gear:hover {
		border-color: #00f0ff;
		box-shadow: 0 0 18px rgba(0, 240, 255, 0.25);
	}

	.floor {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: minmax(0, 1fr) auto;
		align-items: center;
		justify-items: center;
		gap: 8px 6px;
		width: min(1400px, 100%);
		margin: 0 auto;
		min-height: 0;
		overflow: visible;
		padding: 8px 0 0;
		perspective: 1600px;
		perspective-origin: 50% 42%;
	}

	.nudge {
		appearance: none;
		grid-row: 1;
		z-index: 4;
		width: clamp(42px, 6vw, 58px);
		height: clamp(42px, 6vw, 58px);
		border-radius: 50%;
		border: 2px solid rgba(0, 240, 255, 0.45);
		background: rgba(12, 0, 28, 0.72);
		color: #00f0ff;
		font-size: 1.8rem;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(0, 240, 255, 0.18);
	}

	.nudge.prev {
		grid-column: 1;
	}

	.nudge.next {
		grid-column: 3;
	}

	.nudge:hover {
		border-color: #ffe14a;
		color: #ffe14a;
		box-shadow: 0 0 18px rgba(255, 225, 74, 0.28);
	}

	.stage {
		grid-column: 2;
		grid-row: 1;
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: visible;
		touch-action: none;
		cursor: grab;
		transform-style: preserve-3d;
	}

	.stage:active {
		cursor: grabbing;
	}

	.ring {
		position: absolute;
		left: 12%;
		right: 12%;
		bottom: 6%;
		height: 18%;
		border-radius: 50%;
		border: 2px solid rgba(0, 240, 255, 0.18);
		box-shadow:
			0 0 24px rgba(255, 43, 214, 0.12),
			inset 0 0 18px rgba(0, 240, 255, 0.08);
		transform: rotateX(72deg);
		pointer-events: none;
	}

	.wheel {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transform: rotateX(5deg) translateZ(0);
	}

	.slot {
		position: absolute;
		left: 50%;
		top: 48%;
		width: min(280px, 40vw);
		transform-style: preserve-3d;
		transform-origin: center center;
		backface-visibility: hidden;
		will-change: transform, opacity;
	}

	.stage.calm .slot:not(.hot) {
		opacity: 0 !important;
		pointer-events: none !important;
	}

	.stage.calm .slot.hot {
		transform: translate(-50%, -50%) !important;
		opacity: 1 !important;
		filter: none;
	}

	.pick {
		grid-column: 1 / -1;
		grid-row: 2;
		margin: 0;
		text-align: center;
		z-index: 3;
	}

	.pick strong {
		display: block;
		font-family: Bungee, Impact, sans-serif;
		font-size: clamp(0.95rem, 2.4vw, 1.35rem);
		letter-spacing: 0.08em;
		color: #ffe14a;
		text-shadow: 0 0 14px rgba(255, 225, 74, 0.4);
	}

	.pick span {
		display: block;
		margin-top: 2px;
		color: var(--mute);
		font-size: 0.88rem;
	}

	.foot {
		width: 100%;
		margin: 0;
		text-align: center;
		display: grid;
		gap: 14px;
	}

	.rail {
		display: grid;
		gap: 8px;
		width: calc(100% + 2 * var(--gutter));
		margin-inline: calc(var(--gutter) * -1);
	}

	.foot > p {
		width: min(1200px, 100%);
		margin: 0 auto;
	}

	.foot strong {
		display: block;
		font-family: Bungee, Impact, sans-serif;
		font-size: 0.82rem;
		letter-spacing: 0.12em;
		color: #ff2bd6;
		text-shadow: 0 0 10px rgba(255, 43, 214, 0.45);
		margin-bottom: 6px;
	}

	.foot span {
		color: var(--mute);
		font-size: 0.85rem;
	}

	.leave {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 10px;
		background: rgba(4, 0, 12, 0.78);
		backdrop-filter: blur(10px);
		transform: translateZ(0);
	}

	.coin,
	.boot {
		margin: 0;
		font-family: Bungee, Impact, sans-serif;
	}

	.coin {
		font-size: clamp(1.8rem, 6vw, 3.4rem);
		color: #ffe14a;
		text-shadow: 0 0 22px #ffe14a;
		animation: blink 0.7s steps(2, jump-none) infinite;
	}

	.boot {
		letter-spacing: 0.16em;
		font-size: 0.9rem;
		color: #00f0ff;
	}

	@keyframes chase {
		0%,
		100% {
			opacity: 0.18;
		}
		35% {
			opacity: 1;
		}
	}

	@keyframes marquee {
		to {
			background-position: 220% 0;
		}
	}

	@keyframes breathe {
		50% {
			opacity: 0.65;
		}
	}

	@keyframes gridShift {
		to {
			transform: translate3d(64px, 64px, 0);
		}
	}

	@keyframes scanMove {
		to {
			transform: translate3d(0, 12px, 0);
		}
	}

	@keyframes float {
		0%,
		100% {
			translate: 0 0;
			opacity: 0.2;
		}
		50% {
			translate: 12px -46px;
			opacity: 0.8;
		}
	}

	@keyframes live {
		to {
			transform: scale(2.4);
			opacity: 0;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.2;
		}
	}

	@keyframes tick {
		to {
			transform: translate3d(-50%, 0, 0);
		}
	}

	@media (max-width: 860px) {
		.sign,
		.poster,
		.changer,
		.lamp {
			display: none;
		}

		.top {
			flex-direction: column;
		}

		.nudge {
			width: 40px;
			height: 40px;
			font-size: 1.5rem;
		}

		.slot {
			width: min(260px, 64vw);
		}

		.lights i:nth-child(n + 40) {
			display: none;
		}
	}

	@media (max-width: 520px) {
		.hall {
			--gutter: 12px;
			padding: 14px var(--gutter) 0;
		}

		.lights i:nth-child(n + 28) {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		h1,
		.haze,
		.grid i,
		.scan i,
		.mote,
		.lights i,
		.credits b,
		.credits b::after,
		.coin,
		.track,
		.ticker p {
			animation: none;
		}

		h1 {
			background-position: 0 0;
		}
	}
</style>
