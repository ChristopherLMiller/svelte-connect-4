<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { setMusicStation } from '$lib/audio/station';
	import ArcadeCabinet from '$lib/components/ArcadeCabinet.svelte';
	import HallBackdrop from '$lib/components/HallBackdrop.svelte';
	import HallEggs from '$lib/components/HallEggs.svelte';
	import LibrarySettings from '$lib/components/LibrarySettings.svelte';
	import { LIBRARY_GAMES, tickerCopy, type LibraryGame } from '$lib/games/catalog';
	import { closeLibrarySettings, libraryPanel, openLibrarySettings } from '$lib/library/settings.svelte';
	import { loadCabinet, recallCabinet, rememberCabinet } from '$lib/library/persist';
	import { playLibraryHover, playLibrarySelect } from '$lib/library/sfx';
	import { primeAudio } from '$lib/audio/prefs.svelte';

	const LIGHTS = Array.from({ length: 56 }, (_, i) => i);
	const TICKER = tickerCopy();
	const COUNT = LIBRARY_GAMES.length;
	/**
	 * Visual gap between neighbours, in degrees. It stays fixed so a larger library
	 * does not pack every cabinet onto the wheel — only a window around the front is mounted.
	 */
	const STEP = 28;
	/** How many cabinets to keep on either side of the one in front. */
	const WINDOW = 5;

	function wrap(next: number) {
		return ((next % COUNT) + COUNT) % COUNT;
	}

	function indexOfId(id: string | null | undefined) {
		const found = LIBRARY_GAMES.findIndex((game) => game.id === id);
		return found >= 0 ? found : 0;
	}

	/** Unwrapped index of cabinet `i` nearest the continuous wheel position. */
	function nearest(i: number, cursor: number) {
		if (COUNT <= 1) return 0;
		return i + Math.round((cursor - i) / COUNT) * COUNT;
	}

	function visualAngle(i: number) {
		return (nearest(i, spin.current) - spin.current) * STEP;
	}

	function windowIndices(cursor: number) {
		if (COUNT <= 1) return [0];
		const reach = Math.min(COUNT, WINDOW * 2 + 1);
		const pad = COUNT > reach ? 1 : 0;
		const half = Math.floor((reach - 1) / 2) + pad;
		const base = Math.round(cursor);
		const seen = new Set<number>();
		const indices: number[] = [];
		for (let k = -half; k <= half; k++) {
			const wrapped = wrap(base + k);
			if (seen.has(wrapped)) continue;
			seen.add(wrapped);
			indices.push(wrapped);
		}
		return indices;
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

	const spin = new Spring(start, { stiffness: 0.14, damping: 0.6, precision: 0.002 });
	const facingIndex = $derived(wrap(Math.round(spin.current)));
	const windowBase = $derived(Math.round(spin.current));
	const shown = $derived(windowIndices(windowBase));
	const focused = $derived(LIBRARY_GAMES[index] ?? LIBRARY_GAMES[0]);
	const rx = $derived(Math.max(168, Math.min(wide * 0.24, 268)));
	const rz = $derived(Math.max(96, Math.min(wide * 0.11, 148)));

	const DRAG = 12;
	/** Horizontal blur radii (px) for each motion-blur level. */
	const BLUR_LEVELS = [2, 4.5, 8, 13];

	/** Ghost silhouettes smeared along the arc behind the front cabinets while spinning. */
	const GHOSTS = Array.from({ length: 4 }, (_, k) => k);
	const WARP_COLORS = ['#ff2bd6', '#00f0ff', '#ffe14a', '#ffffff'];
	/** Neon speed lines that rush across the stage while the wheel spins. */
	const WARP = Array.from({ length: 18 }, (_, i) => ({
		y: 6 + ((i * 37) % 88),
		w: 90 + ((i * 53) % 220),
		d: 0.42 + ((i * 29) % 40) / 100,
		delay: -((i * 17) % 60) / 100,
		color: WARP_COLORS[i % WARP_COLORS.length]
	}));
	const BURST = Array.from({ length: 14 }, (_, i) => {
		const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2;
		const d = 150 + (i % 3) * 60;
		return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, color: WARP_COLORS[i % 3] };
	});

	/** Signed wheel angular velocity in cabinet-steps per second, sampled every frame. */
	let vel = $state(0);
	const speed = $derived(Math.abs(vel));
	const smear = $derived(calm ? 0 : Math.min(1, Math.max(0, (speed - 0.1) / 1.1)));
	let slotHeight = $state(0);
	/** Bumped each time the wheel lands on a cabinet after a real spin. */
	let landKey = $state(0);

	function blurLevel(depth: number) {
		const v = speed * Math.max(0, depth);
		if (calm || depth < 0.65 || v < 0.5) return 0;
		if (v < 1.2) return 1;
		if (v < 2.1) return 2;
		if (v < 3.1) return 3;
		return 4;
	}

	$effect(() => {
		let last = untrack(() => spin.current);
		let lastT = performance.now();
		let smooth = 0;
		let peak = 0;
		let raf = 0;
		const tick = (now: number) => {
			const dt = Math.max(1, now - lastT) / 1000;
			const cursor = spin.current;
			const raw = -(cursor - last) / dt;
			smooth += (raw - smooth) * Math.min(1, dt * 18);
			last = cursor;
			lastT = now;
			const next = Math.abs(smooth) < 0.05 ? 0 : Math.round(smooth * 20) / 20;
			if (next !== vel) vel = next;
			peak = Math.max(peak, Math.abs(smooth));
			if (peak > 0.9 && Math.abs(smooth) < 0.35 && Math.abs(cursor - spin.target) < 0.12) {
				peak = 0;
				landKey += 1;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

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
		spin.set(spin.target + delta, { instant: calm });
		playLibraryHover();
	}

	function arcPose(deg: number, push = 0, lean = 0, bank = 0) {
		const ang = (deg * Math.PI) / 180;
		const side = Math.sin(ang);
		const depth = Math.cos(ang);
		const x = side * rx;
		const z = depth * rz - push;
		const yaw = -side * 20 + lean;
		const scale = 0.84 + 0.16 * Math.max(0, depth);
		const y = (1 - depth) * 6;
		const opacity = depth < -0.15 ? Math.max(0, (depth + 1) * 0.4) : 0.78 + 0.22 * depth;
		return {
			depth,
			opacity,
			transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${yaw}deg) rotateZ(${bank}deg) scale(${scale})`
		};
	}

	function slotPose(i: number) {
		const lean = calm ? 0 : Math.max(-18, Math.min(18, -vel * 7));
		const bank = calm ? 0 : Math.max(-6, Math.min(6, vel * 2.2));
		const pose = arcPose(visualAngle(i), 0, lean, bank);
		const blur = blurLevel(pose.depth);
		return {
			filter: blur ? `url(#spin-blur-${blur})` : 'none',
			transform: pose.transform,
			z: Math.round(50 + pose.depth * 50),
			opacity: pose.opacity,
			depth: pose.depth,
			events: pose.depth > -0.2 ? 'auto' : 'none'
		};
	}

	/** Trailing echo k of cabinet i, placed back along the arc opposite the direction of travel. */
	function ghostPose(i: number, k: number, lead: number) {
		const arc = Math.min(STEP * 0.95, speed * STEP * 0.34);
		const back = -Math.sign(vel) * arc * ((k + 1) / GHOSTS.length);
		const lean = Math.max(-18, Math.min(18, -vel * 7));
		const pose = arcPose(visualAngle(i) + back, 16 + k * 3, lean);
		const fade = Math.pow(1 - k / GHOSTS.length, 1.2);
		return {
			transform: pose.transform,
			opacity: Math.min(lead, pose.opacity) * fade * smear * 0.9
		};
	}

	let hallEl = $state<HTMLElement>();
	let stageEl = $state<HTMLElement>();
	let gust = $state<{ x: number; y: number; rx: number; ry: number } | null>(null);

	/** Centres the neon spoke field on the cabinet stage. */
	function placeGust() {
		if (!hallEl || !stageEl) return;
		const hall = hallEl.getBoundingClientRect();
		const stage = stageEl.getBoundingClientRect();
		gust = {
			x: stage.left + stage.width / 2 - hall.left,
			y: stage.top + stage.height * 0.5 - hall.top,
			rx: stage.width * 0.9,
			ry: stage.height * 0.75
		};
	}

	$effect(() => {
		void wide;
		void slotHeight;
		const raf = requestAnimationFrame(() => untrack(placeGust));
		return () => cancelAnimationFrame(raf);
	});

	function measure(node: HTMLElement) {
		const observer = new ResizeObserver(() => (slotHeight = node.offsetHeight));
		observer.observe(node);
		return () => observer.disconnect();
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
		spin.set(saved, { instant: true });
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
		spin.set(dragSpin - dx / Math.max(160, wide * 0.2), { instant: true });
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (!dragged) return;
		const snapped = Math.round(spin.current);
		const snappedIndex = wrap(snapped);
		if (snappedIndex !== index) {
			index = snappedIndex;
			playLibraryHover();
		}
		keep(snappedIndex);
		spin.set(snapped, { instant: calm });
		window.setTimeout(() => {
			dragged = false;
		}, 40);
	}
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<section class="hall" class:leaving class:quiet in:fade={{ duration: 420 }} bind:this={hallEl}>
	<HallBackdrop {quiet} {calm} rush={calm ? 0 : vel} {gust} />

	<svg class="fx-defs" width="0" height="0" aria-hidden="true">
		<defs>
			{#each BLUR_LEVELS as radius, i (i)}
				<filter id="spin-blur-{i + 1}" x="-25%" y="-5%" width="150%" height="110%">
					<feGaussianBlur stdDeviation="{radius} 0" />
				</filter>
			{/each}
		</defs>
	</svg>

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
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.25 5.5 8.75 12l6.5 6.5" /></svg>
		</button>
		<div
			class="stage"
			class:calm
			bind:this={stageEl}
			{@attach catchWheel}
			role="group"
			aria-label="Cabinet wheel"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			{#if smear > 0.04}
				<div class="warp" class:rev={vel < 0} style:opacity={smear} aria-hidden="true">
					{#each WARP as line, i (i)}
						<i
							style:top="{line.y}%"
							style:width="{line.w}px"
							style:--d="{line.d}s"
							style:--delay="{line.delay}s"
							style:--c={line.color}
						></i>
					{/each}
				</div>
			{/if}
			<div class="ring" style:--rush={smear} aria-hidden="true"></div>
			<div class="wheel">
				{#each shown as i (LIBRARY_GAMES[i].id)}
					{@const game = LIBRARY_GAMES[i]}
					{@const pose = slotPose(i)}
					{#if smear > 0 && slotHeight > 0 && pose.depth > 0.55}
						{#each GHOSTS as k (k)}
							{@const ghost = ghostPose(i, k, pose.opacity)}
							<div
								class="ghost"
								aria-hidden="true"
								style:--accent={game.accent}
								style:--glow={game.glow}
								style:height="{slotHeight}px"
								style:transform={ghost.transform}
								style:opacity={ghost.opacity}
							></div>
						{/each}
					{/if}
					<div
						{@attach measure}
						class="slot"
						class:hot={i === facingIndex}
						style:transform={pose.transform}
						style:z-index={pose.z}
						style:opacity={pose.opacity}
						style:filter={pose.filter}
						style:pointer-events={pose.events}
					>
						<ArcadeCabinet
							{game}
							index={i}
							nested
							compact
							hot={i === facingIndex}
							awake={i === index && speed < 14}
							onlaunch={pick}
						/>
						{#if i === facingIndex && landKey && !calm}
							{#key landKey}
								<i class="sweep" aria-hidden="true"></i>
							{/key}
						{/if}
					</div>
				{/each}
				{#if landKey && !calm}
					{#key landKey}
						<div
							class="landing"
							style:--accent={focused.accent}
							style:transform="translate(-50%, -50%) translate3d(0, 0, {rz + 40}px)"
							aria-hidden="true"
						>
							<i class="shock"></i>
							<i class="shock late"></i>
							<i class="column"></i>
							{#each BURST as spark, s (s)}
								<b style:--x="{spark.x}px" style:--y="{spark.y}px" style:--c={spark.color}></b>
							{/each}
						</div>
					{/key}
				{/if}
			</div>
		</div>
		<button
			type="button"
			class="nudge next"
			aria-label="Next cabinet"
			onclick={() => goTo(index + 1)}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.75 5.5 15.25 12l-6.5 6.5" /></svg>
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
		/* Top band is reserved for the neon pipes drawn by the backdrop. */
		--pipes: 44px;
		padding: max(var(--pipes), clamp(16px, 3vw, 36px), env(safe-area-inset-top)) max(var(--gutter), env(safe-area-inset-right)) env(safe-area-inset-bottom) max(var(--gutter), env(safe-area-inset-left));
		overflow: hidden;
		background: #070014;
		color: var(--ink);
		font-family: 'Exo 2', ui-sans-serif, system-ui, sans-serif;
	}

	.hall.quiet {
		animation-play-state: paused;
	}

	.sign,
	.poster,
	.changer {
		pointer-events: none;
		position: absolute;
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

	@media (hover: hover) {
		.gear:hover {
			border-color: #00f0ff;
			box-shadow: 0 0 18px rgba(0, 240, 255, 0.25);
		}
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
		--size: clamp(42px, 6vw, 58px);
		appearance: none;
		position: relative;
		display: grid;
		place-items: center;
		grid-row: 1;
		z-index: 4;
		width: var(--size);
		height: var(--size);
		padding: 0;
		border-radius: 50%;
		border: 2px solid rgba(0, 240, 255, 0.45);
		background: radial-gradient(circle at 50% 35%, rgba(40, 10, 70, 0.9), rgba(12, 0, 28, 0.78) 70%);
		color: #00f0ff;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(0, 240, 255, 0.18);
		transition:
			transform 180ms cubic-bezier(0.3, 1.6, 0.5, 1),
			border-color 180ms ease,
			color 180ms ease;
	}

	.nudge svg {
		width: 46%;
		height: 46%;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.6;
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: drop-shadow(0 0 4px currentColor);
		transition: transform 180ms ease;
	}

	/* Spinning neon ring + glow; only opacity/transform animate. */
	.nudge::before,
	.nudge::after {
		content: '';
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		opacity: 0;
		transition: opacity 200ms ease;
	}

	.nudge::before {
		inset: -7px;
		background: conic-gradient(from 0deg, transparent 0 10%, #ffe14a 22%, transparent 36%, #ff2bd6 60%, transparent 74%, #00f0ff 88%, transparent);
		mask: radial-gradient(circle, transparent calc(50% - 2.5px), #000 calc(50% - 2px) 50%, transparent calc(50% + 0.5px));
	}

	.nudge::after {
		inset: -2px;
		box-shadow:
			0 0 26px rgba(255, 225, 74, 0.45),
			inset 0 0 14px rgba(255, 225, 74, 0.25);
	}

	.nudge.prev {
		grid-column: 1;
	}

	.nudge.next {
		grid-column: 3;
	}

	.nudge:focus-visible {
		border-color: #ffe14a;
		color: #ffe14a;
		transform: scale(1.1);
		outline: none;
	}

	@media (hover: hover) {
		.nudge:hover {
			border-color: #ffe14a;
			color: #ffe14a;
			transform: scale(1.1);
			outline: none;
		}
	}

	.nudge:focus-visible::before {
		opacity: 1;
		animation: nudge-spin 1.8s linear infinite;
	}

	@media (hover: hover) {
		.nudge:hover::before {
			opacity: 1;
			animation: nudge-spin 1.8s linear infinite;
		}
	}

	.nudge:focus-visible::after {
		opacity: 1;
	}

	@media (hover: hover) {
		.nudge:hover::after {
			opacity: 1;
		}
	}

	@media (hover: hover) {
		.nudge.prev:hover svg {
			animation: nudge-left 0.9s ease-in-out infinite;
		}
	}

	@media (hover: hover) {
		.nudge.next:hover svg {
			animation: nudge-right 0.9s ease-in-out infinite;
		}
	}

	.nudge:active {
		transform: scale(0.92);
		transition-duration: 60ms;
	}

	.nudge.prev:active svg {
		transform: translateX(-3px);
	}

	.nudge.next:active svg {
		transform: translateX(3px);
	}

	@keyframes nudge-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes nudge-left {
		50% {
			transform: translateX(-3px);
		}
	}

	@keyframes nudge-right {
		50% {
			transform: translateX(3px);
		}
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
		--rush: 0;
	}

	.ring::after {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: inherit;
		border: 3px solid #00f0ff;
		box-shadow:
			0 0 26px #00f0ff,
			0 0 60px rgba(255, 43, 214, 0.8),
			inset 0 0 40px rgba(0, 240, 255, 0.6);
		opacity: var(--rush);
	}

	.warp {
		position: absolute;
		inset: -10% -20%;
		overflow: hidden;
		pointer-events: none;
		-webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
		mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
	}

	.warp.rev {
		transform: scaleX(-1);
	}

	.warp i {
		position: absolute;
		left: 0;
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(90deg, transparent, var(--c) 70%, #fff);
		box-shadow: 0 0 10px var(--c);
		will-change: transform;
		animation: warp var(--d) linear var(--delay) infinite;
	}

	@keyframes warp {
		from {
			transform: translateX(-30vw);
		}
		to {
			transform: translateX(130vw);
		}
	}

	.sweep {
		position: absolute;
		inset: 0;
		border-radius: 14px;
		pointer-events: none;
		overflow: hidden;
		z-index: 5;
	}

	.sweep::before {
		content: '';
		position: absolute;
		top: -10%;
		bottom: -10%;
		width: 45%;
		left: 0;
		background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75) 45%, rgba(255, 255, 255, 0.95) 50%, transparent);
		transform: translateX(-120%) skewX(-12deg);
		animation: sweep 0.75s cubic-bezier(0.3, 0.7, 0.3, 1) forwards;
	}

	@keyframes sweep {
		to {
			transform: translateX(320%) skewX(-12deg);
		}
	}

	.landing {
		position: absolute;
		left: 50%;
		top: 48%;
		width: 0;
		height: 0;
		pointer-events: none;
		transform-style: preserve-3d;
	}

	.landing .shock {
		position: absolute;
		left: -170px;
		top: -170px;
		width: 340px;
		height: 340px;
		border-radius: 50%;
		border: 4px solid var(--accent);
		box-shadow:
			0 0 30px var(--accent),
			inset 0 0 30px var(--accent);
		opacity: 0;
		animation: shock 0.8s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
	}

	.landing .shock.late {
		border-color: #fff;
		border-width: 2px;
		animation-delay: 0.12s;
	}

	@keyframes shock {
		0% {
			opacity: 1;
			transform: scale(0.35, 0.25);
		}
		100% {
			opacity: 0;
			transform: scale(1.6, 1.15);
		}
	}

	.landing .column {
		position: absolute;
		left: -70px;
		top: -420px;
		width: 140px;
		height: 700px;
		background: radial-gradient(closest-side, rgba(255, 255, 255, 0.85), color-mix(in srgb, var(--accent) 60%, transparent) 45%, transparent);
		opacity: 0;
		animation: column 0.7s ease-out forwards;
	}

	@keyframes column {
		0% {
			opacity: 0.95;
			transform: scaleX(0.2);
		}
		40% {
			opacity: 0.7;
			transform: scaleX(1);
		}
		100% {
			opacity: 0;
			transform: scaleX(1.4);
		}
	}

	.landing b {
		position: absolute;
		left: -5px;
		top: -5px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
		box-shadow:
			0 0 12px var(--c),
			0 0 24px var(--c);
		opacity: 0;
		animation: spark 0.75s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
	}

	@keyframes spark {
		0% {
			opacity: 1;
			transform: translate(0, 0) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(var(--x), var(--y)) scale(0.2);
		}
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

	.ghost {
		--streak: color-mix(in srgb, var(--accent) 45%, #fff);
		position: absolute;
		left: 50%;
		top: 48%;
		width: min(280px, 40vw);
		border-radius: 14px;
		pointer-events: none;
		backface-visibility: hidden;
		will-change: transform, opacity;
		background:
			linear-gradient(
				180deg,
				transparent 3%,
				var(--streak) 4% 5.5%,
				transparent 7% 12%,
				color-mix(in srgb, var(--streak) 70%, transparent) 13% 14%,
				transparent 15% 22%,
				var(--streak) 23% 24%,
				transparent 25% 33%,
				color-mix(in srgb, var(--glow) 80%, #fff) 34% 35.5%,
				transparent 37% 45%,
				color-mix(in srgb, var(--streak) 55%, transparent) 46% 47%,
				transparent 48% 56%,
				var(--streak) 57% 58.5%,
				transparent 60% 67%,
				color-mix(in srgb, var(--streak) 65%, transparent) 68% 69%,
				transparent 70% 79%,
				var(--streak) 80% 81%,
				transparent 82% 90%,
				color-mix(in srgb, var(--streak) 50%, transparent) 91% 92%,
				transparent 93%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--accent) 34%, transparent),
				color-mix(in srgb, var(--glow) 24%, transparent) 50%,
				color-mix(in srgb, var(--accent) 16%, transparent)
			);
		mask-image: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent);
	}

	.fx-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
		pointer-events: none;
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
		.changer {
			display: none;
		}

		.top {
			flex-direction: column;
		}

		.nudge {
			--size: 40px;
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
			padding: var(--pipes) var(--gutter) 0;
		}

		.lights i:nth-child(n + 28) {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		h1,
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
