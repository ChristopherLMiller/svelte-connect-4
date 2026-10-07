<script lang="ts">
	import OpponentSeal from './OpponentSeal.svelte';
	import PieceGlyph from './PieceGlyph.svelte';
	import type { ChessSession } from '../session.svelte';
	import type { Side } from '../types';

	let { session, side }: { session: ChessSession; side: Side } = $props();

	const bot = $derived(session.mode === 'ai' && side !== session.human);
	const name = $derived(session.nameOf(side));
	const sub = $derived.by(() => {
		if (bot) return `${session.opponent.title} · ${session.opponent.rating}`;
		if (session.mode === 'ai') return side === 'w' ? 'White' : 'Black';
		return 'Hotseat';
	});
	const toMove = $derived(session.screen === 'play' && !session.outcome && session.live && session.turn === side);
	const taken = $derived(session.captures[side]);
	const edge = $derived.by(() => {
		const b = session.captures.balance * (side === 'w' ? 1 : -1);
		return b > 0 ? `+${b}` : '';
	});
	const ms = $derived(session.clocks[side]);
	const clock = $derived.by(() => {
		const t = Math.max(0, ms);
		if (t < 10_000) return (Math.floor(t / 100) / 10).toFixed(1);
		const s = Math.ceil(t / 1000);
		const m = Math.floor(s / 60);
		return `${m}:${String(s % 60).padStart(2, '0')}`;
	});
	const low = $derived(session.timed && ms < 20_000);
	const dead = $derived(session.timed && ms <= 0);
	const thinking = $derived(bot && session.aiThinking);
	const won = $derived(session.outcome && session.outcome.winner === (side === 'w' ? 1 : -1));
</script>

<div class="plate" class:on={toMove} class:won style:--hue={bot ? session.opponent.hue : side === 'w' ? '#f3e7cf' : '#b39a7a'}>
	{#if bot}
		<OpponentSeal opponent={session.opponent} size={38} />
	{:else}
		<span class="king"><PieceGlyph piece={side === 'w' ? 6 : -6} size={32} /></span>
	{/if}
	<div class="who">
		<strong>
			{name}
			{#if thinking}
				<span class="dots" aria-label="thinking"><i></i><i></i><i></i></span>
			{/if}
		</strong>
		<span class="taken">
			{#if taken.length}
				{#each taken as type, i (i)}
					<PieceGlyph piece={side === 'w' ? -type : type} size={16} />
				{/each}
			{:else}
				<small>{sub}</small>
			{/if}
			{#if edge}<b class="edge">{edge}</b>{/if}
		</span>
	</div>
	{#if session.timed}
		<span class="clock" class:low class:dead class:run={toMove && session.records.length >= 2} aria-label="{name} clock {clock}">{clock}</span>
	{/if}
</div>

<style>
	.plate {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 5px 8px 5px 6px;
		border-radius: 10px;
		border: 1px solid rgba(217, 178, 94, 0.2);
		background: linear-gradient(180deg, rgba(40, 22, 15, 0.9), rgba(16, 9, 6, 0.92));
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.06),
			0 6px 14px rgba(0, 0, 0, 0.4);
		color: #f3e7cf;
		transition:
			border-color 220ms ease,
			box-shadow 220ms ease;
		min-width: 0;
	}

	.plate.on {
		border-color: color-mix(in srgb, var(--hue) 70%, #d9b25e);
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.08),
			0 0 0 1px color-mix(in srgb, var(--hue) 35%, transparent),
			0 0 22px rgba(255, 196, 110, 0.18),
			0 6px 14px rgba(0, 0, 0, 0.4);
	}

	.plate.won {
		border-color: #ecc874;
		box-shadow:
			0 0 0 1px rgba(236, 200, 116, 0.5),
			0 0 30px rgba(255, 206, 120, 0.35);
	}

	.king {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 40%, rgba(255, 220, 160, 0.16), rgba(0, 0, 0, 0.3));
		border: 1px solid rgba(217, 178, 94, 0.3);
	}

	.who {
		display: grid;
		min-width: 0;
		line-height: 1.15;
	}

	.who strong {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 0.98rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.taken {
		display: flex;
		align-items: center;
		min-height: 17px;
		overflow: hidden;
	}

	.taken :global(canvas + canvas) {
		margin-left: -5px;
	}

	.taken small {
		color: #bba88a;
		font-style: italic;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.edge {
		margin-left: 6px;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.72rem;
		color: #d9b25e;
	}

	.clock {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-variant-numeric: tabular-nums;
		font-size: 1.3rem;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 7px;
		background: rgba(0, 0, 0, 0.35);
		color: #bba88a;
		border: 1px solid transparent;
		transition:
			background 200ms ease,
			color 200ms ease;
	}

	.clock.run {
		background: #f3e7cf;
		color: #1c1107;
	}

	.clock.low.run {
		background: #b8322a;
		color: #fff2e6;
		animation: urgent 1s ease-in-out infinite;
	}

	.clock.dead {
		background: #5a1410;
		color: #ffb3a8;
	}

	.dots {
		display: inline-flex;
		gap: 3px;
	}

	.dots i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--hue);
		animation: dot 1.2s ease-in-out infinite;
	}

	.dots i:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dots i:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes dot {
		0%,
		100% {
			opacity: 0.25;
			translate: 0 0;
		}
		40% {
			opacity: 1;
			translate: 0 -3px;
		}
	}

	@keyframes urgent {
		50% {
			box-shadow: 0 0 14px rgba(255, 90, 70, 0.7);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dots i,
		.clock.low.run {
			animation: none;
		}

		.dots i {
			opacity: 0.8;
		}
	}
</style>
