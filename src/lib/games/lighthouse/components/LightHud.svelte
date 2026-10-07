<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import LightIcon from './LightIcon.svelte';
	import { openLightSettings } from '../settings.svelte';
	import { NORTH, SEA_INFO, nameOf, opponent } from '../types';
	import type { LightSession } from '../session.svelte';

	let { session }: { session: LightSession } = $props();

	const me = $derived(session.viewer);
	const them = $derived(opponent(me));
	const ai = $derived(session.mode === 'ai');

	const kicker = $derived.by(() => {
		if (session.screen === 'setup') return ai ? 'Lay out your fleet' : `${nameOf(session.setupFor, session.mode)} · lay out your fleet`;
		const r = session.report;
		if (r && !session.animating) {
			const ship = r.ship >= 0 ? session.ships[r.ship].name : '';
			const mine = r.by === me;
			if (mine) return r.kind === 'miss' ? 'Splash. Open water' : r.kind === 'hit' ? 'A hit! Timber burns' : `You sank the ${ship}!`;
			const who = ai ? 'The Wrecker' : nameOf(r.by, session.mode);
			return r.kind === 'miss' ? `${who} missed` : r.kind === 'hit' ? `${who} hit your ${ship}` : `Your ${ship} went down`;
		}
		return ai ? (session.current === NORTH ? 'Your gun' : "The Wrecker's gun") : `${nameOf(session.current, session.mode)}'s gun`;
	});

	const hint = $derived.by(() => {
		if (session.screen === 'setup') {
			if (session.ready) return 'All hands aboard. Set sail when ready';
			const k = session.selected;
			if (k >= 0 && !session.placing[k]) return `Place the ${session.ships[k].name} · tap a square`;
			return 'Pick a ship below, then tap the sea';
		}
		const status = session.status;
		if (status.type === 'won') {
			if (ai) return status.winner === NORTH ? 'Every hull sunk. The light is yours' : 'The Wrecker has sunk your fleet';
			return `${nameOf(status.winner, session.mode)} keeps the light`;
		}
		if (session.animating) return 'The beam swings round…';
		if (session.aiThinking) return 'The Wrecker studies your waters…';
		if (session.current !== me) return ai ? 'Brace yourself' : 'Pass the glass';
		const again = session.report && session.report.by === me && session.report.kind !== 'miss' && session.chain;
		return again ? 'Fire again: call another square' : 'Call a square in the fog';
	});

	const fleets = $derived.by(() => {
		const w = session.waters;
		const ships = SEA_INFO[session.sea].ships;
		return {
			mine: ships.map((s, k) => ({ ...s, sunk: w ? w[me].sunk[k] : false, hits: w ? w[me].hits[k] : 0 })),
			theirs: ships.map((s, k) => ({ ...s, sunk: w ? w[them].sunk[k] : false, hits: 0 }))
		};
	});
</script>

<header class="hud">
	<div class="brand">
		<LightIcon />
		<div class="name">
			<p>Lighthouse</p>
			<small>{SEA_INFO[session.sea].name}</small>
		</div>
	</div>
	<div class="call" class:south={session.current === 2 && session.screen === 'play'}>
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	{#if session.screen === 'play'}
		<div class="fleets">
			<div class="side" aria-label="{ai ? 'Your' : nameOf(me, session.mode)} fleet: {session.afloatOf[me]} afloat">
				<span>{ai ? 'You' : me === NORTH ? 'North' : 'South'}</span>
				<div class="pips">
					{#each fleets.mine as ship, k (k)}
						<i class:sunk={ship.sunk} class:hurt={!ship.sunk && ship.hits > 0} style:--len={ship.length} title={ship.name}></i>
					{/each}
				</div>
			</div>
			<div class="side them" aria-label="{nameOf(them, session.mode)} fleet: {session.afloatOf[them]} afloat">
				<span>{ai ? 'Wrecker' : them === NORTH ? 'North' : 'South'}</span>
				<div class="pips">
					{#each fleets.theirs as ship, k (k)}
						<i class:sunk={ship.sunk} style:--len={ship.length} title={ship.name}></i>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	<div class="ops">
		<button type="button" onclick={() => openLightSettings()}>Settings</button>
		{#if session.screen === 'play'}
			<button type="button" onclick={() => session.rematch()}>New battle</button>
		{/if}
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="beacon" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: stretch;
		color: #f2e8d5;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.fleets,
	.ops button {
		border: 1px solid rgba(232, 176, 90, 0.24);
		background: linear-gradient(180deg, rgba(20, 34, 46, 0.9), rgba(9, 17, 24, 0.92));
		border-radius: 10px;
		box-shadow:
			inset 0 1px 0 rgba(255, 230, 180, 0.07),
			0 8px 18px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
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
		font-family: 'IM Fell English', Georgia, serif;
		font-size: 1.3rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.58rem;
		font-weight: 700;
		color: #e8b05a;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 6px 16px 6px 13px;
		min-width: 0;
		border-left: 4px solid #ffc65a;
		transition: border-color 300ms ease;
	}

	.call.south {
		border-left-color: #7fe0d0;
	}

	.call small {
		display: block;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #e8b05a;
		margin-bottom: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.02rem, 2.1vw, 1.25rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fleets {
		display: grid;
		align-content: center;
		gap: 4px;
		padding: 6px 14px;
	}

	.side {
		display: grid;
		grid-template-columns: 5.8em auto;
		align-items: center;
		gap: 8px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.side span {
		color: #ffc65a;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.side.them span {
		color: #7fe0d0;
	}

	.pips {
		display: flex;
		gap: 4px;
	}

	.pips i {
		width: calc(var(--len) * 6px);
		height: 7px;
		border-radius: 2px 5px 5px 2px;
		background: linear-gradient(180deg, #a07448, #5e3f22);
		box-shadow: inset 0 0 0 1px rgba(255, 220, 160, 0.25);
		transition:
			opacity 300ms ease,
			filter 300ms ease;
	}

	.pips i.hurt {
		background: linear-gradient(90deg, #a07448, #ff8a3c 60%, #a07448);
	}

	.pips i.sunk {
		opacity: 0.35;
		filter: grayscale(1);
		background: repeating-linear-gradient(135deg, #3a3a3a 0 3px, #1a1a1a 3px 6px);
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
		padding: 0 13px;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition: border-color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: #e8b05a;
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 1180px) {
		.name small {
			display: none;
		}
	}

	@media (max-width: 1000px) {
		.hud {
			grid-template-columns: auto auto minmax(0, 1fr);
			grid-template-areas: 'brand fleets ops' 'call call call';
			height: auto;
			flex-basis: auto;
			gap: 8px;
		}

		.brand {
			grid-area: brand;
			padding: 4px;
		}

		.name {
			display: none;
		}

		.fleets {
			grid-area: fleets;
			padding: 4px 10px;
		}

		.ops {
			grid-area: ops;
		}

		.call {
			grid-area: call;
			padding-block: 5px;
		}

		.ops button {
			padding: 9px 10px;
			letter-spacing: 0.08em;
		}
	}

	@media (max-width: 640px) {
		.hud {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas: 'brand fleets' 'call call' 'ops ops';
		}

		.hud:not(:has(.fleets)) {
			grid-template-areas: 'brand ops' 'call call';
		}

		.ops {
			justify-content: center;
		}
	}

	@media (max-width: 520px) {
		.side {
			grid-template-columns: 4em auto;
			font-size: 0.62rem;
		}

		.pips i {
			width: calc(var(--len) * 5px);
		}

		.ops {
			gap: 5px;
		}

		.ops button {
			padding: 8px 9px;
			font-size: 0.62rem;
			letter-spacing: 0.05em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}
</style>
