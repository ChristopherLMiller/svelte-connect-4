<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly, scale } from 'svelte/transition';
	import { ARCADE_GAMES, type ArcadeGame } from '$lib/arcade/catalog';
	import { playHover, playSelect } from '$lib/game/audio';
	import { openSettings, primeAudio } from '$lib/game/settings.svelte';
	import { APP_VERSION } from '$lib/version';

	let focusId = $state(ARCADE_GAMES[0].id);
	let booting = $state(false);
	let ticker = $state(0);

	const focused = $derived(ARCADE_GAMES.find((game) => game.id === focusId) ?? ARCADE_GAMES[0]);
	const liveCount = $derived(ARCADE_GAMES.filter((game) => game.status === 'live').length);

	$effect(() => {
		const id = window.setInterval(() => {
			ticker = (ticker + 1) % 1000;
		}, 80);
		return () => clearInterval(id);
	});

	function focusGame(game: ArcadeGame) {
		if (focusId === game.id) return;
		focusId = game.id;
		playHover();
	}

	function launch(game: ArcadeGame) {
		primeAudio();
		if (game.status !== 'live' || !game.href) {
			playHover();
			return;
		}
		playSelect();
		booting = true;
		window.setTimeout(() => {
			void goto(game.href!);
		}, 420);
	}

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape') return;

		const index = ARCADE_GAMES.findIndex((game) => game.id === focusId);
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			const next = ARCADE_GAMES[(index + 1) % ARCADE_GAMES.length];
			focusGame(next);
			return;
		}
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			const next = ARCADE_GAMES[(index - 1 + ARCADE_GAMES.length) % ARCADE_GAMES.length];
			focusGame(next);
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			launch(focused);
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<section class="hall" class:booting in:fade={{ duration: 500 }}>
	<div class="scan" aria-hidden="true"></div>
	<div class="sparks" aria-hidden="true"></div>

	<header class="marquee">
		<p class="kicker" in:fly={{ y: 12, duration: 500 }}>SECTOR · OPEN FLOOR</p>
		<h1 in:fly={{ y: 22, duration: 700 }}>
			<span class="brand" data-text="ARCADE">ARCADE</span>
			<span class="protocol" data-text="PROTOCOL">PROTOCOL</span>
		</h1>
		<p class="lede" in:fly={{ y: 16, duration: 780 }}>
			Pick a cabinet. Dial the volumes. Let the transmission ride while you choose your fight.
		</p>
	</header>

	<div class="meters" aria-hidden="true">
		{#each Array.from({ length: 16 }, (_, i) => i) as bar (bar)}
			<span
				style:--h="{(28 + ((ticker * 13 + bar * 37) % 72)) / 100}"
				style:--delay="{bar * 40}ms"
			></span>
		{/each}
	</div>

	<div
		class="rail"
		role="listbox"
		tabindex="0"
		aria-label="Arcade games"
		aria-activedescendant="cab-{focusId}"
	>
		{#each ARCADE_GAMES as game, i (game.id)}
			<button
				id="cab-{game.id}"
				type="button"
				class="cabinet"
				class:on={focusId === game.id}
				class:live={game.status === 'live'}
				class:locked={game.status === 'coming'}
				role="option"
				aria-selected={focusId === game.id}
				style:--accent={game.accent}
				style:--glow={game.glow}
				style:--stagger="{i * 70}ms"
				in:fly={{ y: 40, duration: 520, delay: 120 + i * 70 }}
				onmouseenter={() => focusGame(game)}
				onfocus={() => focusGame(game)}
				onclick={() => launch(game)}
			>
				<div class="bezel">
					<div class="screen {game.cabinet}">
						{#if game.cabinet === 'grid'}
							<div class="preview-grid">
								{#each Array.from({ length: 42 }, (_, cell) => cell) as cell (cell)}
									<i
										class:p1={cell % 11 === 0 || cell % 17 === 3}
										class:p2={cell % 13 === 2 || cell % 19 === 5}
									></i>
								{/each}
							</div>
						{:else if game.cabinet === 'orbit'}
							<span class="ring a"></span>
							<span class="ring b"></span>
							<span class="core"></span>
						{:else if game.cabinet === 'pulse'}
							<span class="stack s1"></span>
							<span class="stack s2"></span>
							<span class="stack s3"></span>
						{:else}
							<span class="slash"></span>
							<span class="slash alt"></span>
						{/if}
						<span class="badge">{game.badge}</span>
					</div>
					<div class="plate">
						<strong>{game.title}</strong>
						<small>{game.tagline}</small>
					</div>
					<div class="controls" aria-hidden="true">
						<span></span><span></span><span></span>
					</div>
				</div>
				{#if focusId === game.id}
					<p class="tip" transition:fade={{ duration: 160 }}>{game.blurb}</p>
				{/if}
			</button>
		{/each}
	</div>

	<footer class="dock" in:fly={{ y: 18, duration: 620, delay: 280 }}>
		<div class="signal">
			<span class="pulse"></span>
			<p>
				<strong>{liveCount} cabinet online</strong>
				<small>Arrow keys · Enter to launch · Esc opens nothing here, settings does</small>
			</p>
		</div>
		<div class="actions">
			<button type="button" class="settings" onclick={() => { primeAudio(); openSettings(); playSelect(); }}>
				Settings
			</button>
			<button
				type="button"
				class="play"
				disabled={focused.status !== 'live'}
				onclick={() => launch(focused)}
			>
				{focused.status === 'live' ? `Launch ${focused.title}` : 'Signal pending'}
			</button>
		</div>
		<p class="build">Arcade Protocol · v{APP_VERSION}</p>
	</footer>

	{#if booting}
		<div class="boot" transition:scale={{ start: 0.96, duration: 280 }}>
			<p>Jacking into {focused.title}…</p>
		</div>
	{/if}
</section>

<style>
	.hall {
		position: relative;
		z-index: 1;
		width: min(1180px, 100%);
		min-height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 28px;
		padding: 12px 4px 20px;
		isolation: isolate;
	}

	.scan,
	.sparks {
		pointer-events: none;
		position: absolute;
		inset: -8% -4%;
		z-index: 0;
	}

	.scan {
		background: repeating-linear-gradient(
			180deg,
			transparent 0 2px,
			rgba(255, 255, 255, 0.025) 2px 3px
		);
		mask-image: linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent);
		animation: scan-drift 7s linear infinite;
		opacity: 0.55;
	}

	.sparks {
		background:
			radial-gradient(circle at 12% 18%, rgba(92, 225, 230, 0.18), transparent 22%),
			radial-gradient(circle at 88% 24%, rgba(255, 51, 92, 0.16), transparent 20%),
			radial-gradient(circle at 50% 92%, rgba(245, 194, 75, 0.12), transparent 28%);
		filter: blur(2px);
		animation: spark-breathe 5.5s ease-in-out infinite;
	}

	.marquee,
	.rail,
	.dock,
	.meters {
		position: relative;
		z-index: 1;
	}

	.marquee {
		text-align: center;
	}

	.kicker {
		margin: 0 0 10px;
		letter-spacing: 0.46em;
		font-size: 0.72rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 900;
		line-height: 0.88;
		letter-spacing: -0.03em;
	}

	.brand,
	.protocol {
		display: block;
		position: relative;
	}

	.brand {
		font-size: clamp(3.4rem, 12vw, 7.2rem);
		background: linear-gradient(95deg, #fff 10%, #5ce1e6 42%, #ff335c 78%, #ffe38a);
		background-size: 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: marquee-sheen 4.8s linear infinite, title-bob 4.2s ease-in-out infinite;
		filter: drop-shadow(0 10px 28px rgba(92, 225, 230, 0.28));
	}

	.protocol {
		font-size: clamp(1.55rem, 5.4vw, 2.8rem);
		letter-spacing: 0.34em;
		color: #f4f1ff;
		text-shadow:
			0 0 18px rgba(255, 51, 92, 0.35),
			0 0 32px rgba(92, 225, 230, 0.2);
		animation: protocol-flicker 5.2s steps(2, end) infinite;
	}

	.brand::before,
	.brand::after,
	.protocol::before {
		content: attr(data-text);
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.brand::before {
		color: #ff335c;
		transform: translate(-2px, 1px);
		opacity: 0.35;
		animation: rgb-shift 2.6s steps(2, end) infinite;
		-webkit-text-fill-color: #ff335c;
	}

	.brand::after {
		color: #5ce1e6;
		transform: translate(2px, -1px);
		opacity: 0.3;
		animation: rgb-shift 3.1s steps(2, end) infinite reverse;
		-webkit-text-fill-color: #5ce1e6;
	}

	.protocol::before {
		opacity: 0.25;
		transform: translate(1px, 0);
		color: #5ce1e6;
		-webkit-text-fill-color: #5ce1e6;
	}

	.lede {
		margin: 18px auto 0;
		max-width: 36rem;
		color: var(--muted);
		font-size: 1.02rem;
		line-height: 1.55;
	}

	.meters {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: 5px;
		height: 42px;
		opacity: 0.85;
	}

	.meters span {
		width: 8px;
		height: calc(100% * var(--h));
		border-radius: 999px 999px 2px 2px;
		background: linear-gradient(180deg, #ffe38a, #5ce1e6 55%, #ff335c);
		box-shadow: 0 0 12px rgba(92, 225, 230, 0.35);
		animation: meter 0.7s ease-in-out var(--delay) infinite alternate;
	}

	.rail {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
		align-items: start;
	}

	.cabinet {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 0;
		cursor: pointer;
		text-align: left;
		color: inherit;
		display: grid;
		gap: 10px;
		transform-origin: 50% 80%;
		transition: transform 180ms ease;
	}

	.cabinet:hover,
	.cabinet.on {
		transform: translateY(-8px) scale(1.02);
	}

	.cabinet.locked {
		cursor: not-allowed;
	}

	.bezel {
		border-radius: 22px 22px 18px 18px;
		padding: 12px 12px 14px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 28%),
			linear-gradient(180deg, #1a1730, #0c0a16 62%, #151022);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
		box-shadow:
			0 22px 40px rgba(0, 0, 0, 0.42),
			0 0 0 1px rgba(255, 255, 255, 0.04) inset,
			0 0 28px color-mix(in srgb, var(--glow) 35%, transparent);
		position: relative;
		overflow: hidden;
	}

	.cabinet.on .bezel {
		border-color: color-mix(in srgb, var(--accent) 70%, white);
		box-shadow:
			0 26px 48px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.08) inset,
			0 0 40px var(--glow);
	}

	.cabinet.locked .bezel {
		filter: saturate(0.72) brightness(0.82);
	}

	.screen {
		position: relative;
		height: 150px;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 55%),
			linear-gradient(180deg, #10101c, #07060d);
	}

	.badge {
		position: absolute;
		top: 10px;
		left: 10px;
		padding: 4px 8px;
		border-radius: 999px;
		font-family: var(--font-display);
		font-size: 0.62rem;
		letter-spacing: 0.16em;
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
		color: var(--accent);
	}

	.cabinet.live .badge {
		animation: badge-pulse 1.8s ease-in-out infinite;
	}

	.preview-grid {
		position: absolute;
		inset: 28px 18px 18px;
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.preview-grid i {
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		aspect-ratio: 1;
	}

	.preview-grid i.p1 {
		background: radial-gradient(circle at 35% 30%, #ff9bb0, #ff335c 60%, #8d1028);
		box-shadow: 0 0 8px rgba(255, 51, 92, 0.55);
		animation: disc-pop 2.4s ease-in-out infinite;
	}

	.preview-grid i.p2 {
		background: radial-gradient(circle at 35% 30%, #ffe9a8, #f5c24b 60%, #9a6408);
		box-shadow: 0 0 8px rgba(245, 194, 75, 0.5);
		animation: disc-pop 2.8s ease-in-out infinite reverse;
	}

	.ring,
	.core,
	.stack,
	.slash {
		position: absolute;
	}

	.ring {
		inset: 28%;
		border-radius: 50%;
		border: 2px solid color-mix(in srgb, var(--accent) 70%, white);
		animation: spin 6s linear infinite;
	}

	.ring.b {
		inset: 18%;
		opacity: 0.45;
		animation-direction: reverse;
		animation-duration: 9s;
	}

	.core {
		left: 50%;
		top: 50%;
		width: 18px;
		height: 18px;
		translate: -50% -50%;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 18px var(--glow);
		animation: core-pulse 1.6s ease-in-out infinite;
	}

	.stack {
		left: 50%;
		width: 54%;
		height: 18px;
		translate: -50% 0;
		border-radius: 8px;
		background: linear-gradient(90deg, transparent, var(--accent), transparent);
		opacity: 0.75;
		animation: stack-rise 2.2s ease-in-out infinite;
	}

	.s1 {
		top: 38%;
	}
	.s2 {
		top: 52%;
		animation-delay: 0.2s;
		opacity: 0.55;
	}
	.s3 {
		top: 66%;
		animation-delay: 0.4s;
		opacity: 0.35;
	}

	.slash {
		left: 18%;
		top: 30%;
		width: 64%;
		height: 10px;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, var(--accent), #fff);
		transform: rotate(-18deg);
		animation: slash 2s ease-in-out infinite;
	}

	.slash.alt {
		top: 58%;
		transform: rotate(16deg);
		animation-delay: 0.35s;
		opacity: 0.65;
	}

	.plate {
		margin-top: 12px;
		padding: 0 4px;
	}

	.plate strong {
		display: block;
		font-family: var(--font-display);
		font-size: 1.12rem;
		letter-spacing: 0.04em;
	}

	.plate small {
		color: color-mix(in srgb, var(--accent) 70%, var(--muted));
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.68rem;
	}

	.controls {
		display: flex;
		gap: 8px;
		justify-content: center;
		margin-top: 12px;
	}

	.controls span {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #2a2438;
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.45);
	}

	.controls span:nth-child(1) {
		background: #ff335c;
	}
	.controls span:nth-child(2) {
		background: #5ce1e6;
	}
	.controls span:nth-child(3) {
		background: #f5c24b;
	}

	.tip {
		margin: 0;
		min-height: 2.6em;
		color: var(--muted);
		font-size: 0.88rem;
		line-height: 1.45;
		padding: 0 4px;
	}

	.dock {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 16px 24px;
		align-items: center;
		padding: 16px 18px;
		border-radius: 22px;
		background: rgba(10, 9, 18, 0.72);
		border: 1px solid var(--line);
		backdrop-filter: blur(10px);
		box-shadow: var(--shadow);
	}

	.signal {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.pulse {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #5ce1e6;
		box-shadow: 0 0 0 0 rgba(92, 225, 230, 0.55);
		animation: live-dot 1.6s ease-out infinite;
		flex-shrink: 0;
	}

	.signal p {
		margin: 0;
		display: grid;
		gap: 2px;
	}

	.signal strong {
		font-family: var(--font-display);
		letter-spacing: 0.06em;
	}

	.signal small {
		color: var(--muted);
		font-size: 0.78rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.settings,
	.play {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 14px 22px;
		cursor: pointer;
		font-family: var(--font-display);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: var(--glass);
	}

	.settings {
		color: var(--cyan);
	}

	.play {
		border: 0;
		background: linear-gradient(180deg, #ffe38a, #f5c24b 45%, #e08a1a);
		color: #2a1600;
		box-shadow:
			0 12px 28px rgba(245, 194, 75, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
		animation: cta-glow 1.8s ease-in-out infinite;
	}

	.play:disabled {
		animation: none;
		opacity: 0.45;
		cursor: not-allowed;
		filter: grayscale(0.4);
	}

	.settings:hover,
	.play:not(:disabled):hover {
		transform: translateY(-2px);
	}

	.build {
		grid-column: 1 / -1;
		margin: 0;
		text-align: center;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		color: var(--muted);
		font-family: var(--font-display);
	}

	.boot {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		background: rgba(4, 3, 10, 0.72);
		backdrop-filter: blur(8px);
	}

	.boot p {
		margin: 0;
		font-family: var(--font-display);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: clamp(1rem, 3vw, 1.4rem);
		color: var(--cyan);
		text-shadow: 0 0 24px rgba(92, 225, 230, 0.45);
		animation: boot-blink 0.7s steps(2, end) infinite;
	}

	.hall.booting .rail,
	.hall.booting .dock,
	.hall.booting .marquee {
		filter: blur(2px) brightness(0.7);
	}

	@keyframes marquee-sheen {
		to {
			background-position: 220% 0;
		}
	}

	@keyframes title-bob {
		50% {
			transform: translateY(-6px);
		}
	}

	@keyframes protocol-flicker {
		0%,
		92%,
		100% {
			opacity: 1;
		}
		93% {
			opacity: 0.55;
		}
		95% {
			opacity: 1;
		}
		97% {
			opacity: 0.7;
		}
	}

	@keyframes rgb-shift {
		50% {
			opacity: 0.12;
		}
	}

	@keyframes scan-drift {
		to {
			transform: translateY(12px);
		}
	}

	@keyframes spark-breathe {
		50% {
			opacity: 0.7;
			transform: scale(1.03);
		}
	}

	@keyframes meter {
		from {
			transform: scaleY(0.55);
		}
		to {
			transform: scaleY(1);
		}
	}

	@keyframes badge-pulse {
		50% {
			box-shadow: 0 0 12px var(--glow);
		}
	}

	@keyframes disc-pop {
		50% {
			transform: scale(1.08);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes core-pulse {
		50% {
			transform: translate(-50%, -50%) scale(1.25);
		}
	}

	@keyframes stack-rise {
		50% {
			transform: translate(-50%, -6px) scaleX(1.08);
			opacity: 1;
		}
	}

	@keyframes slash {
		50% {
			filter: drop-shadow(0 0 10px var(--glow));
			transform: rotate(-18deg) translateX(8px);
		}
	}

	@keyframes live-dot {
		0% {
			box-shadow: 0 0 0 0 rgba(92, 225, 230, 0.55);
		}
		100% {
			box-shadow: 0 0 0 12px rgba(92, 225, 230, 0);
		}
	}

	@keyframes cta-glow {
		50% {
			box-shadow:
				0 16px 36px rgba(245, 194, 75, 0.48),
				inset 0 1px 0 rgba(255, 255, 255, 0.5);
			transform: scale(1.03);
		}
	}

	@keyframes boot-blink {
		50% {
			opacity: 0.45;
		}
	}

	@media (max-width: 980px) {
		.rail {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.dock {
			grid-template-columns: 1fr;
		}

		.actions {
			justify-content: stretch;
		}

		.settings,
		.play {
			flex: 1;
		}
	}

	@media (max-width: 560px) {
		.rail {
			grid-template-columns: 1fr;
		}

		.protocol {
			letter-spacing: 0.18em;
		}

		.tip {
			min-height: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.brand,
		.protocol,
		.scan,
		.sparks,
		.meters span,
		.cabinet.live .badge,
		.preview-grid i,
		.ring,
		.core,
		.stack,
		.slash,
		.pulse,
		.play,
		.boot p {
			animation: none;
		}
	}
</style>
