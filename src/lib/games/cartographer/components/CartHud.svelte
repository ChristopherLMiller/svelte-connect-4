<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import CartIcon from './CartIcon.svelte';
	import { openCartSettings } from '../settings.svelte';
	import { CHART_INFO, INK, VERMILION, nameOf } from '../types';
	import type { CartSession } from '../session.svelte';

	let { session }: { session: CartSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Vermilion');
	const p2 = $derived(nameOf(2, session.mode));
	const total = $derived(session.n * session.n);
	const left = $derived(total - session.count[1] - session.count[2]);

	const kicker = $derived(
		session.status.type !== 'playing'
			? 'The ink is drying'
			: session.mode === 'ai'
				? session.current === VERMILION
					? 'Your quill · vermilion'
					: 'Mercator inks · indigo'
				: `${nameOf(session.current, session.mode)} to ink`
	);

	const hint = $derived.by(() => {
		const status = session.status;
		if (status.type === 'won') {
			if (session.mode === 'ai') return status.winner === VERMILION ? 'The guild names you master' : 'Mercator claims the realm';
			return `${nameOf(status.winner, session.mode)} charts the most land`;
		}
		if (status.type === 'draw') return 'The realm is split down the middle';
		if (session.aiThinking) return session.streak ? `Mercator sweeps on · ${session.streak} claimed` : 'Mercator studies the sheet';
		if (session.streak) return `${session.streak} claimed · ink again`;
		if (session.mode === 'ai') return 'Draw a border; close a square to claim it';
		return `${nameOf(session.current, session.mode)} — close a square to claim it`;
	});

	const share = $derived((session.count[1] / Math.max(1, total)) * 100);
	const share2 = $derived((session.count[2] / Math.max(1, total)) * 100);

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<div class="brand">
		<CartIcon />
		<div class="name">
			<p>Cartographer</p>
			<small>{CHART_INFO[session.chart].name} · {session.n}×{session.n}</small>
		</div>
	</div>
	<div class="call" style:--turn={INK[session.current]}>
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="meter" aria-label="{p1} {session.count[1]} squares, {p2} {session.count[2]} squares, {left} left">
		<span class="side one" class:now={session.current === 1 && session.status.type === 'playing'}>
			<i></i><em {@attach bump(session.count[1])}>{session.count[1]}</em>
		</span>
		<span class="bar" aria-hidden="true">
			<b class="one" style:width="{share}%"></b>
			<b class="two" style:width="{share2}%"></b>
		</span>
		<span class="side two" class:now={session.current === 2 && session.status.type === 'playing'}>
			<em {@attach bump(session.count[2])}>{session.count[2]}</em><i></i>
		</span>
	</div>
	<div class="score">
		<span>{p1} <em>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openCartSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()}>New sheet</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="ink" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		gap: 10px;
		align-items: stretch;
		color: #2e2014;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.meter,
	.score,
	.ops button {
		border: 1px solid rgba(107, 72, 36, 0.45);
		background: linear-gradient(180deg, rgba(246, 234, 208, 0.93), rgba(228, 206, 162, 0.92));
		border-radius: 6px;
		box-shadow:
			inset 0 1px 0 rgba(255, 248, 228, 0.8),
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
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.25rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.58rem;
		color: #a33a1f;
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
		color: var(--turn);
		margin-bottom: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'EB Garamond', Georgia, serif;
		font-weight: 600;
		font-size: clamp(1rem, 2.2vw, 1.25rem);
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
		font-family: 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.35rem;
	}

	.side i {
		width: 14px;
		height: 14px;
		border-radius: 50% 40% 55% 45%;
		flex-shrink: 0;
	}

	.one i {
		background: radial-gradient(circle at 35% 30%, #e66a4e, #b3311d 60%, #6e1a0c);
	}

	.two i {
		background: radial-gradient(circle at 35% 30%, #6d8bd0, #26407f 60%, #121f44);
	}

	.side.now i {
		box-shadow: 0 0 0 2px rgba(255, 248, 228, 0.9), 0 0 10px rgba(255, 170, 80, 0.7);
	}

	.bar {
		position: relative;
		width: clamp(70px, 9vw, 130px);
		height: 8px;
		border-radius: 999px;
		background: rgba(107, 72, 36, 0.16);
		overflow: hidden;
		box-shadow: inset 0 0 0 1px rgba(107, 72, 36, 0.3);
	}

	.bar b {
		position: absolute;
		top: 0;
		bottom: 0;
		transition: width 600ms cubic-bezier(0.3, 0.8, 0.3, 1);
	}

	.bar .one {
		left: 0;
		background: #b3311d;
	}

	.bar .two {
		right: 0;
		background: #26407f;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.85rem;
		font-family: 'EB Garamond', Georgia, serif;
	}

	.score em {
		font-style: normal;
		font-weight: 700;
		font-size: 1.3rem;
		margin-left: 3px;
		color: #a33a1f;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #6b5238;
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
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition: border-color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: rgba(163, 58, 31, 0.8);
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
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
