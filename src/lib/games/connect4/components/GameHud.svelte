<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import type { GameSession } from '../session.svelte';
	import { lookSettings, toggleSettings } from '../settings.svelte';

	let { session }: { session: GameSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Crimson');
	const p2 = $derived(session.mode === 'ai' ? 'Neural Core' : 'Gold');
	const turnName = $derived(session.current === 1 ? p1 : p2);
	const protocol = $derived(session.mode === 'ai' ? `VS CORE · ${session.difficulty}` : 'LOCAL DUEL · HOTSEAT');
	const alerts = $derived(lookSettings.threatAlerts);
	const phase = $derived(
		session.status.type !== 'playing'
			? 'locked'
			: session.aiThinking
				? 'thinking'
				: session.animating
					? 'flight'
					: alerts && session.killShots.length
						? 'finish'
						: alerts && session.dangerShots.length
							? 'threat'
							: 'live'
	);
	const turnHint = $derived(
		phase === 'locked'
			? 'Grid locked'
			: phase === 'thinking'
				? 'Core is calculating'
				: phase === 'flight'
					? 'Piece in flight'
					: phase === 'finish'
						? 'Finish available'
						: phase === 'threat'
							? 'Threat detected'
							: `${turnName} to drop`
	);
	const kicker = $derived(
		phase === 'locked'
			? 'Signal sealed'
			: phase === 'thinking'
				? 'Minimax chewing'
				: phase === 'flight'
					? 'Trajectory live'
					: phase === 'finish'
						? 'Four is open'
						: phase === 'threat'
							? 'Block or burn'
							: 'Active operator'
	);
</script>

<header class="hud" in:fade={{ duration: 250 }}>
	<div class="brand">
		<span class="live"></span>
		<p>CONNECT</p>
		<strong>4</strong>
	</div>

	<div
		class={[
			'turn',
			{
				p1: session.current === 1,
				p2: session.current === 2,
				thinking: phase === 'thinking',
				flight: phase === 'flight',
				finish: phase === 'finish',
				threat: phase === 'threat',
				locked: phase === 'locked'
			}
		]}
	>
		<div class="disc" aria-hidden="true">
			<i></i>
		</div>
		<div class="call">
			<small>{kicker} · {protocol}</small>
			{#key turnHint}
				<b in:fly={{ y: 10, duration: 220 }}>{turnHint}</b>
			{/key}
		</div>
		<div class="meters" aria-hidden="true">
			<span></span>
			<span></span>
			<span></span>
			<span></span>
		</div>
	</div>

	<div class="board-score">
		<div class={['fighter', 'p1', { hot: session.current === 1 && phase !== 'locked' }]}>
			<span>{p1}</span>
			{#key session.scores[1]}
				<em in:scale={{ start: 1.35, duration: 220 }}>{session.scores[1]}</em>
			{/key}
		</div>
		<div class="vs">VS</div>
		<div class={['fighter', 'p2', { hot: session.current === 2 && phase !== 'locked' }]}>
			<span>{p2}</span>
			{#key session.scores[2]}
				<em in:scale={{ start: 1.35, duration: 220 }}>{session.scores[2]}</em>
			{/key}
		</div>
	</div>

	<div class="ops">
		<button onclick={toggleSettings}>Settings</button>
		<button onclick={() => session.resetRound()}>Rematch</button>
		<button onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="space" />
	</div>
</header>

<style>
	.hud {
		width: 100%;
		display: grid;
		grid-template-columns: auto minmax(0, 1.4fr) auto auto;
		gap: 10px;
		align-items: stretch;
		position: relative;
		z-index: 2;
		margin-bottom: 6px;
		flex-shrink: 0;
	}

	.brand,
	.turn,
	.board-score,
	.ops button {
		border: 1px solid var(--line);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 40%),
			rgba(10, 8, 20, 0.72);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 10px 28px rgba(0, 0, 0, 0.28);
	}

	.brand {
		position: relative;
		overflow: hidden;
		display: grid;
		align-content: center;
		padding: 10px 16px 10px 18px;
		border-radius: 18px;
		font-family: var(--font-display);
		line-height: 0.86;
		min-width: 108px;
	}

	.brand::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 3px;
		background: linear-gradient(180deg, var(--cyan), var(--gold), var(--crimson));
	}

	.live {
		position: absolute;
		top: 8px;
		right: 10px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #39ff9a;
		box-shadow: 0 0 10px #39ff9a;
		animation: blink 1.4s ease-in-out infinite;
	}

	.brand p {
		margin: 0;
		letter-spacing: 0.22em;
		font-size: 0.62rem;
		color: var(--cyan);
	}

	.brand strong {
		font-size: 2rem;
		background: linear-gradient(180deg, #fff1b0, #ff335c);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.turn {
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 14px;
		align-items: center;
		padding: 10px 16px;
		border-radius: 20px;
		justify-self: stretch;
	}

	.turn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.08) 46%, transparent 62%);
		translate: -80% 0;
		animation: sheen 4.8s ease-in-out infinite;
		pointer-events: none;
	}

	.turn.p1 {
		border-color: rgba(255, 51, 92, 0.45);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 0 0 1px rgba(255, 51, 92, 0.12),
			0 12px 32px rgba(255, 51, 92, 0.18);
	}

	.turn.p2 {
		border-color: rgba(245, 194, 75, 0.45);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 0 0 1px rgba(245, 194, 75, 0.12),
			0 12px 32px rgba(245, 194, 75, 0.18);
	}

	.disc {
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: radial-gradient(circle at 32% 28%, #fff, var(--crimson) 42%, #6a1024);
		box-shadow:
			0 0 0 3px rgba(255, 255, 255, 0.12),
			0 0 22px var(--crimson);
		animation: pulse 1.15s ease-in-out infinite;
	}

	.turn.p2 .disc {
		background: radial-gradient(circle at 32% 28%, #fff8d6, var(--gold) 42%, #8a5a00);
		box-shadow:
			0 0 0 3px rgba(255, 255, 255, 0.12),
			0 0 22px var(--gold);
	}

	.disc i,
	.disc::before,
	.disc::after {
		position: absolute;
		inset: -8px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 50%;
		animation: ring 2.2s linear infinite;
	}

	.disc::after {
		inset: -14px;
		opacity: 0.45;
		animation-duration: 3.1s;
	}

	.call {
		min-width: 0;
	}

	.call small {
		display: block;
		color: var(--cyan);
		font-size: 0.68rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin-bottom: 2px;
	}

	.call b {
		display: block;
		font-family: var(--font-display);
		font-size: clamp(1.05rem, 2.2vw, 1.45rem);
		letter-spacing: 0.03em;
		text-transform: uppercase;
		line-height: 1.1;
		min-height: 1.2em;
	}

	.meters {
		display: flex;
		align-items: end;
		gap: 4px;
		height: 28px;
	}

	.meters span {
		width: 4px;
		border-radius: 99px;
		background: var(--crimson);
		animation: meter 0.9s ease-in-out infinite;
	}

	.turn.p2 .meters span {
		background: var(--gold);
	}

	.meters span:nth-child(1) {
		height: 40%;
		animation-delay: 0s;
	}
	.meters span:nth-child(2) {
		height: 70%;
		animation-delay: 0.12s;
	}
	.meters span:nth-child(3) {
		height: 100%;
		animation-delay: 0.24s;
	}
	.meters span:nth-child(4) {
		height: 55%;
		animation-delay: 0.36s;
	}

	.turn.thinking .meters span,
	.turn.flight .meters span {
		animation-duration: 0.45s;
	}

	.turn.thinking {
		border-color: rgba(245, 194, 75, 0.7);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 0 0 1px rgba(245, 194, 75, 0.2),
			0 12px 32px rgba(245, 194, 75, 0.28);
	}

	.turn.thinking::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 34%;
		background: linear-gradient(90deg, transparent, rgba(245, 194, 75, 0.2), transparent);
		animation: thinkscan 1s linear infinite;
		pointer-events: none;
	}

	.turn.thinking .disc {
		animation-duration: 0.42s;
	}

	.turn.threat {
		border-color: rgba(255, 51, 92, 0.8);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 0 0 1px rgba(255, 51, 92, 0.28),
			0 12px 36px rgba(255, 51, 92, 0.38);
		animation: alert 0.7s ease-in-out infinite;
	}

	.turn.finish {
		border-color: rgba(92, 225, 230, 0.85);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 0 0 1px rgba(92, 225, 230, 0.3),
			0 12px 36px rgba(92, 225, 230, 0.32);
	}

	.turn.finish .call small,
	.turn.threat .call small {
		color: #fff;
	}

	.turn.locked {
		opacity: 0.72;
		filter: saturate(0.7);
	}

	.board-score {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 20px;
		min-width: 210px;
	}

	.fighter {
		display: grid;
		justify-items: center;
		padding: 2px 8px;
		border-radius: 12px;
		opacity: 0.48;
		transition:
			opacity 200ms ease,
			background 200ms ease;
	}

	.fighter.hot {
		opacity: 1;
		background: rgba(255, 255, 255, 0.05);
	}

	.fighter span {
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.fighter.p1.hot span {
		color: var(--crimson);
	}

	.fighter.p2.hot span {
		color: var(--gold);
	}

	.fighter em {
		font-style: normal;
		font-family: var(--font-display);
		font-size: 1.85rem;
		line-height: 1;
		display: block;
	}

	.fighter.p1 em {
		color: #ff6b88;
		text-shadow: 0 0 16px rgba(255, 51, 92, 0.45);
	}

	.fighter.p2 em {
		color: #ffe38a;
		text-shadow: 0 0 16px rgba(245, 194, 75, 0.4);
	}

	.vs {
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		color: var(--cyan);
		padding: 6px 8px;
		border: 1px solid rgba(92, 225, 230, 0.35);
		border-radius: 999px;
		animation: vs 2.4s ease-in-out infinite;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
		flex-wrap: wrap;
	}

	.ops button {
		padding: 0 14px;
		border-radius: 16px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.72rem;
		font-family: var(--font-display);
	}

	.ops button:hover {
		border-color: rgba(92, 225, 230, 0.5);
		color: var(--cyan);
	}

	@keyframes blink {
		50% {
			opacity: 0.25;
		}
	}

	@keyframes sheen {
		0%,
		55% {
			translate: -80% 0;
		}
		100% {
			translate: 120% 0;
		}
	}

	@keyframes pulse {
		50% {
			transform: scale(1.08);
		}
	}

	@keyframes ring {
		from {
			transform: scale(0.92);
			opacity: 0.7;
		}
		to {
			transform: scale(1.18);
			opacity: 0;
		}
	}

	@keyframes meter {
		0%,
		100% {
			transform: scaleY(0.45);
			opacity: 0.55;
		}
		50% {
			transform: scaleY(1);
			opacity: 1;
		}
	}

	@keyframes vs {
		50% {
			box-shadow: 0 0 16px rgba(92, 225, 230, 0.35);
		}
	}

	@keyframes thinkscan {
		from {
			translate: -120% 0;
		}
		to {
			translate: 380% 0;
		}
	}

	@keyframes alert {
		50% {
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.08),
				0 0 0 1px rgba(255, 51, 92, 0.5),
				0 12px 42px rgba(255, 51, 92, 0.55);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.live,
		.turn::before,
		.disc,
		.disc i,
		.disc::before,
		.disc::after,
		.meters span,
		.vs,
		.turn.thinking::after,
		.turn.threat {
			animation: none;
		}
	}

	@media (max-width: 980px) {
		.hud {
			grid-template-columns: 1fr 1fr;
		}

		.turn {
			grid-column: 1 / -1;
		}

		.ops {
			grid-column: 1 / -1;
			justify-content: center;
		}

		.ops button {
			padding: 10px 14px;
		}
	}

	@media (max-width: 620px) {
		.hud {
			grid-template-columns: 1fr;
			justify-items: stretch;
		}

		.brand,
		.board-score {
			justify-self: stretch;
		}
	}
</style>
