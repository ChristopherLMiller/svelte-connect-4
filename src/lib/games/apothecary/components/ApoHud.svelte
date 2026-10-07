<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ApoIcon from './ApoIcon.svelte';
	import { apoStats, openApoSettings, todaysBrew } from '../settings.svelte';
	import { BENCH_INFO, UNDO_MAX, reagentOf, valueOf } from '../types';
	import type { ApoSession } from '../session.svelte';

	let { session }: { session: ApoSession } = $props();

	const where = $derived(session.board === 'daily' ? 'Brew of the day' : BENCH_INFO[session.board].name);
	const best = $derived(Math.max(session.score, session.board === 'daily' ? todaysBrew().score : apoStats.best[session.board]));
	const rare = $derived(reagentOf(session.top));

	let floaters = $state<Array<{ id: number; points: number }>>([]);
	let seenGain = untrack(() => session.gain.id);
	$effect(() => {
		const g = session.gain;
		untrack(() => {
			if (g.id === seenGain) return;
			seenGain = g.id;
			const item = { id: g.id, points: g.points };
			floaters = [...floaters.slice(-3), item];
			window.setTimeout(() => (floaters = floaters.filter((f) => f.id !== item.id)), 900);
		});
	});

	let toast = $state<{ id: number; tier: number } | null>(null);
	let seenDiscovery = untrack(() => session.discovery.id);
	$effect(() => {
		const d = session.discovery;
		if (d.id === seenDiscovery) return;
		seenDiscovery = d.id;
		toast = { ...d };
		const timer = window.setTimeout(() => (toast = null), 2600);
		return () => window.clearTimeout(timer);
	});
</script>

<header class="hud">
	<div class="brand">
		<ApoIcon />
		<div class="name">
			<p>Apothecary</p>
			<small>{where}</small>
		</div>
	</div>

	<div class="tally">
		<div class="box score">
			<small>Brew</small>
			<b>{session.score}</b>
			{#each floaters as f (f.id)}
				<span class="float" aria-hidden="true">+{f.points}</span>
			{/each}
		</div>
		<div class="box">
			<small>Best</small>
			<b>{best}</b>
		</div>
		<div class="box rare" style:--c={rare.color}>
			<small>Rarest</small>
			<b><i></i>{rare.name || '—'}</b>
		</div>
	</div>

	<div class="ops">
		<button type="button" class="undo" disabled={!session.canUndo || session.status.type === 'stone'} onclick={() => session.undo()} aria-label="Undo the last pour, {session.undos} stoppers left">
			<span class="corks" aria-hidden="true">
				{#each Array.from({ length: UNDO_MAX }, (_, i) => i) as i (i)}
					<i class:spent={i >= session.undos}></i>
				{/each}
			</span>
			Undo
		</button>
		<button type="button" onclick={() => session.restart()}>New brew</button>
		<button type="button" onclick={() => openApoSettings()}>Settings</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="brew" />
	</div>

	{#if toast}
		{@const r = reagentOf(toast.tier)}
		<div class="toast" style:--c={r.color} transition:fly={{ y: -12, duration: 260 }} role="status">
			<i></i>
			<span><small>New reagent · {valueOf(toast.tier)}</small><b>{r.name}</b><em>{r.note}</em></span>
		</div>
	{/if}
</header>

<style>
	.hud {
		position: relative;
		width: min(1200px, 100%);
		margin: 0 auto;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 10px;
		align-items: stretch;
		color: #f1e6c8;
		z-index: 3;
	}

	.brand,
	.box,
	.ops button {
		border: 1px solid rgba(214, 170, 92, 0.38);
		background: linear-gradient(180deg, rgba(30, 42, 36, 0.92), rgba(14, 20, 17, 0.94));
		border-radius: 10px;
		box-shadow:
			inset 0 1px 0 rgba(255, 240, 200, 0.1),
			0 8px 20px rgba(0, 0, 0, 0.45);
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
	}

	.name p {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1.15rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.58rem;
		color: #6fe3b0;
	}

	.tally {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr);
		gap: 10px;
		min-width: 0;
	}

	.box {
		position: relative;
		display: grid;
		align-content: center;
		padding: 6px 16px;
		min-width: 88px;
		font-variant-numeric: tabular-nums;
	}

	.box small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.58rem;
		color: #c9a560;
	}

	.box b {
		font-family: Cinzel, Georgia, serif;
		font-size: 1.35rem;
		line-height: 1.1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rare {
		min-width: 0;
	}

	.rare b {
		font-family: Spectral, Georgia, serif;
		font-size: 1.05rem;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.rare i,
	.toast > i {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 50%, white), var(--c) 60%, color-mix(in srgb, var(--c) 50%, black));
		box-shadow: 0 0 10px color-mix(in srgb, var(--c) 60%, transparent);
	}

	.float {
		position: absolute;
		left: 100%;
		top: 50%;
		margin-left: -0.4em;
		font-family: Cinzel, Georgia, serif;
		z-index: 4;
		font-weight: 700;
		color: #6fe3b0;
		text-shadow: 0 0 10px rgba(111, 227, 176, 0.6);
		pointer-events: none;
		animation: rise 900ms ease-out forwards;
	}

	@keyframes rise {
		from {
			opacity: 1;
			translate: 0 0;
		}
		to {
			opacity: 0;
			translate: 0 -26px;
		}
	}

	.ops {
		display: flex;
		align-items: stretch;
		gap: 8px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 14px;
		font: inherit;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition:
			border-color 160ms ease,
			opacity 160ms ease;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	@media (hover: hover) {
		.ops button:not(:disabled):hover {
			border-color: #e0b25c;
		}
	}

	.corks {
		display: inline-flex;
		gap: 3px;
	}

	.corks i {
		width: 7px;
		height: 10px;
		border-radius: 2px 2px 3px 3px;
		background: linear-gradient(180deg, #d6a868, #8a5a2a);
	}

	.corks i.spent {
		background: rgba(255, 255, 255, 0.12);
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	.toast {
		position: absolute;
		left: 50%;
		top: calc(100% + 12px);
		translate: -50% 0;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 18px 8px 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--c) 60%, transparent);
		background: rgba(10, 14, 12, 0.92);
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.5),
			0 0 24px color-mix(in srgb, var(--c) 35%, transparent);
		white-space: nowrap;
		pointer-events: none;
	}

	.toast > i {
		width: 20px;
		height: 20px;
	}

	.toast span {
		display: grid;
		text-align: left;
	}

	.toast small {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.56rem;
		color: #c9a560;
	}

	.toast b {
		font-family: Cinzel, Georgia, serif;
		font-size: 1rem;
	}

	.toast em {
		font-family: Spectral, Georgia, serif;
		font-size: 0.8rem;
		color: #b9ad90;
	}

	@media (max-width: 1020px) {
		.hud {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.brand {
			display: none;
		}

		.ops {
			justify-content: center;
		}

		.ops button {
			padding: 9px 12px;
		}
	}

	@media (max-width: 560px) {
		.tally {
			gap: 6px;
		}

		.box {
			min-width: 0;
			padding: 5px 10px;
		}

		.box b {
			font-size: 1.1rem;
		}

		.rare b {
			font-size: 0.9rem;
		}

		.ops {
			gap: 6px;
		}

		.ops button {
			padding: 8px 9px;
			font-size: 0.6rem;
			letter-spacing: 0.06em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.float {
			animation: none;
			opacity: 0;
		}
	}
</style>
