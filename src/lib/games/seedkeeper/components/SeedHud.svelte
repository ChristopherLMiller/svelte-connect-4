<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import SeedIcon from './SeedIcon.svelte';
	import { openSeedSettings } from '../settings.svelte';
	import { FIREFLY, GLOW, SOWING_INFO, STORE, nameOf } from '../types';
	import type { SeedSession } from '../session.svelte';

	let { session }: { session: SeedSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Firefly');
	const p2 = $derived(nameOf(2, session.mode));
	const total = $derived(SOWING_INFO[session.sowing].seeds * 12);
	const home1 = $derived(session.shown[STORE[1]]);
	const home2 = $derived(session.shown[STORE[2]]);

	const kicker = $derived(
		session.status.type !== 'playing'
			? 'The harvest is in'
			: session.mode === 'ai'
				? session.current === FIREFLY
					? 'Your stones · firefly'
					: 'Old Heron sows · heron'
				: `${nameOf(session.current, session.mode)} to sow`
	);

	const hint = $derived.by(() => {
		const status = session.status;
		if (status.type === 'won') {
			if (session.mode === 'ai') return status.winner === FIREFLY ? 'You out-gathered Old Heron' : 'Old Heron takes the harvest';
			return `${nameOf(status.winner, session.mode)} gathers the most`;
		}
		if (status.type === 'draw') return 'An even harvest, seed for seed';
		if (session.taking) {
			const { player, taken } = session.taking;
			if (session.mode === 'ai') return player === FIREFLY ? `You capture ${taken} seeds!` : `Old Heron spears ${taken} seeds`;
			return `${nameOf(player, session.mode)} captures ${taken} seeds!`;
		}
		if (session.animating) return session.chain ? 'Seeds falling home…' : 'Sowing…';
		if (session.aiThinking) return session.chain ? 'Old Heron sows again' : 'Old Heron studies the stones';
		if (session.chain) return 'Last seed home · sow again';
		if (session.mode === 'ai') return 'Pick a glowing pit on your row to sow';
		return `${nameOf(session.current, session.mode)} — pick a pit on your row`;
	});

	const share = $derived((home1 / Math.max(1, total)) * 100);
	const share2 = $derived((home2 / Math.max(1, total)) * 100);

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<div class="brand">
		<SeedIcon />
		<div class="name">
			<p>Seedkeeper</p>
			<small>{SOWING_INFO[session.sowing].name} · {SOWING_INFO[session.sowing].seeds} a pit</small>
		</div>
	</div>
	<div class="call" style:--turn={GLOW[session.current]}>
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="meter" aria-label="{p1} {home1} seeds home, {p2} {home2} seeds home">
		<span class="side one" class:now={session.current === 1 && session.status.type === 'playing'}>
			<i></i><em {@attach bump(home1)}>{home1}</em>
		</span>
		<span class="bar" aria-hidden="true">
			<b class="one" style:width="{share}%"></b>
			<b class="two" style:width="{share2}%"></b>
			<span class="mid"></span>
		</span>
		<span class="side two" class:now={session.current === 2 && session.status.type === 'playing'}>
			<em {@attach bump(home2)}>{home2}</em><i></i>
		</span>
	</div>
	<div class="score">
		<span>{p1} <em>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openSeedSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()}>New game</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="moss" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		gap: 10px;
		align-items: stretch;
		color: #f3ecd6;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.meter,
	.score,
	.ops button {
		border: 1px solid rgba(184, 240, 106, 0.2);
		background: linear-gradient(180deg, rgba(28, 40, 26, 0.88), rgba(12, 20, 12, 0.9));
		border-radius: 14px;
		backdrop-filter: blur(6px);
		box-shadow:
			inset 0 1px 0 rgba(230, 255, 190, 0.07),
			0 8px 20px rgba(0, 0, 0, 0.4);
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
		text-align: left;
	}

	.name p {
		margin: 0;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: 1.22rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.58rem;
		font-weight: 800;
		color: #c8f06a;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 6px 16px 6px 13px;
		min-width: 0;
		border-left: 4px solid var(--turn);
		transition: border-color 300ms ease;
	}

	.call small {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.6rem;
		font-weight: 800;
		color: var(--turn);
		margin-bottom: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: Fraunces, Georgia, serif;
		font-weight: 600;
		font-size: clamp(1rem, 2.1vw, 1.2rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meter {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		font-variant-numeric: tabular-nums;
	}

	.side {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 2.4em;
		opacity: 0.6;
		transition: opacity 200ms ease;
	}

	.side.two {
		justify-content: flex-end;
	}

	.side.now {
		opacity: 1;
	}

	.side em {
		font-style: normal;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: 1.35rem;
	}

	.side i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.one i {
		background: radial-gradient(circle, #fff6c8, #f6c453 45%, rgba(246, 196, 83, 0));
		box-shadow: 0 0 10px rgba(246, 196, 83, 0.6);
	}

	.two i {
		background: radial-gradient(circle, #f0f8ff, #8fc3ea 45%, rgba(143, 195, 234, 0));
		box-shadow: 0 0 10px rgba(143, 195, 234, 0.6);
	}

	.side.now i {
		animation: blink 1.6s ease-in-out infinite;
	}

	.bar {
		position: relative;
		width: clamp(70px, 9vw, 130px);
		height: 8px;
		border-radius: 999px;
		background: rgba(184, 240, 106, 0.1);
		overflow: hidden;
		box-shadow: inset 0 0 0 1px rgba(184, 240, 106, 0.2);
	}

	.bar b {
		position: absolute;
		top: 0;
		bottom: 0;
		transition: width 600ms cubic-bezier(0.3, 0.8, 0.3, 1);
	}

	.bar .one {
		left: 0;
		background: linear-gradient(90deg, #d69a22, #f6c453);
	}

	.bar .two {
		right: 0;
		background: linear-gradient(90deg, #8fc3ea, #4f86b8);
	}

	.bar .mid {
		position: absolute;
		left: 50%;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: rgba(255, 255, 255, 0.4);
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.score em {
		font-style: normal;
		font-weight: 800;
		font-size: 1.25rem;
		margin-left: 3px;
		color: #f6c453;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #bdb79c;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 14px;
		font: inherit;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition: border-color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: rgba(246, 196, 83, 0.8);
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@keyframes blink {
		50% {
			box-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.side.now i {
			animation: none;
		}
	}

	@media (max-width: 1100px) {
		.score {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.hud {
			grid-template-columns: 1fr auto;
			height: auto;
			flex-basis: auto;
			gap: 8px;
		}

		.name small {
			display: none;
		}

		.call,
		.ops {
			grid-column: 1 / -1;
		}

		.call {
			order: 3;
		}

		.ops {
			order: 4;
			justify-content: center;
		}

		.ops button {
			padding: 9px 14px;
		}
	}

	@media (max-width: 520px) {
		.brand {
			padding: 4px 10px 4px 4px;
			gap: 8px;
		}

		.name p {
			font-size: 1.05rem;
		}

		.meter {
			padding: 0 10px;
			gap: 8px;
		}

		.bar {
			width: 54px;
		}

		.ops {
			gap: 6px;
		}

		.ops button {
			padding: 8px 10px;
			font-size: 0.62rem;
			letter-spacing: 0.06em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}
</style>
