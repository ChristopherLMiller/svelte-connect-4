<script lang="ts">
	import type { LightSession } from '../session.svelte';

	let { session }: { session: LightSession } = $props();

	const placed = $derived(session.placing.filter(Boolean).length);
</script>

<aside class="dock" aria-label="Your fleet">
	<p class="title">The fleet <span>{placed} / {session.ships.length} at anchor</span></p>
	<ul>
		{#each session.ships as ship, k (k)}
			<li>
				<button
					type="button"
					class:on={session.selected === k}
					class:placed={!!session.placing[k]}
					onclick={() => session.selectShip(k)}
					aria-pressed={session.selected === k}
				>
					<i class="hull" style:--len={ship.length} class:upright={session.selected === k ? session.vertical && !session.placing[k] : false}>
						{#each Array.from({ length: ship.length }, (_, m) => m) as m (m)}
							<b></b>
						{/each}
					</i>
					<span>{ship.name}</span>
					<em>{session.placing[k] ? 'At anchor' : `${ship.length} squares`}</em>
				</button>
			</li>
		{/each}
	</ul>
	<p class="tip">Tap a laid ship to turn it. Drag it to move.</p>
	<div class="tools">
		<button type="button" onclick={() => session.turn()}>
			Turn
			<small>{session.selected >= 0 && session.placing[session.selected] ? 'this ship' : session.vertical ? 'now: down' : 'now: across'}</small>
		</button>
		<button type="button" onclick={() => session.scatter()}>Scatter</button>
		<button type="button" onclick={() => session.clearFleet()} disabled={!placed}>Clear</button>
	</div>
	<button type="button" class="sail" disabled={!session.ready} onclick={() => session.confirmSetup()}>Set sail</button>
</aside>

<style>
	.dock {
		display: grid;
		align-content: start;
		gap: 10px;
		padding: 14px;
		border-radius: 12px;
		border: 1px solid rgba(232, 176, 90, 0.24);
		background: linear-gradient(180deg, rgba(20, 34, 46, 0.92), rgba(9, 17, 24, 0.94));
		box-shadow:
			inset 0 1px 0 rgba(255, 230, 180, 0.07),
			0 12px 28px rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
		color: #f2e8d5;
		min-width: 0;
	}

	.title {
		margin: 0;
		font-family: 'IM Fell English', Georgia, serif;
		font-size: 1.35rem;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	.title span {
		font-family: 'Alegreya Sans', sans-serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #e8b05a;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}

	li button {
		width: 100%;
		appearance: none;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid rgba(232, 176, 90, 0.16);
		background: rgba(255, 255, 255, 0.03);
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: left;
		transition:
			border-color 160ms ease,
			background 160ms ease;
	}

	li button.on {
		border-color: #ffc65a;
		background: rgba(255, 198, 90, 0.1);
		box-shadow: 0 0 0 1px rgba(255, 198, 90, 0.35);
	}

	li button.placed:not(.on) {
		opacity: 0.62;
	}

	.hull {
		display: flex;
		gap: 2px;
		width: calc(var(--len) * 14px);
		transition: rotate 200ms ease;
	}

	.hull b {
		flex: 1;
		height: 10px;
		background: linear-gradient(180deg, #a07448, #5e3f22);
		box-shadow: inset 0 0 0 1px rgba(255, 220, 160, 0.25);
	}

	.hull b:first-child {
		border-radius: 4px 1px 1px 4px;
	}

	.hull b:last-child {
		border-radius: 1px 7px 7px 1px;
	}

	li span {
		font-family: 'IM Fell English', Georgia, serif;
		font-size: 1.08rem;
	}

	li em {
		font-style: normal;
		font-size: 0.72rem;
		color: #b3ab9a;
		letter-spacing: 0.06em;
	}

	.tip {
		margin: 0;
		font-size: 0.84rem;
		color: #b3ab9a;
	}

	.tools {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}

	.tools button,
	.sail {
		appearance: none;
		border: 1px solid rgba(232, 176, 90, 0.26);
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.74rem;
		padding: 9px 6px;
		border-radius: 8px;
		cursor: pointer;
		display: grid;
		gap: 1px;
		place-items: center;
	}

	.tools small {
		font-size: 0.6rem;
		letter-spacing: 0.04em;
		text-transform: none;
		color: #b3ab9a;
		font-weight: 600;
	}

	.tools button:disabled,
	.sail:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.sail {
		border: 0;
		padding: 13px;
		font-size: 0.9rem;
		letter-spacing: 0.16em;
		background: linear-gradient(180deg, #ffd27a, #c58a2c);
		color: #1a1206;
		box-shadow:
			0 8px 20px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 245, 220, 0.7);
	}

	.sail:not(:disabled) {
		animation: ready 2.4s ease-in-out infinite;
	}

	@media (hover: hover) {
		li button:hover,
		.tools button:not(:disabled):hover {
			border-color: #e8b05a;
		}
	}

	@keyframes ready {
		50% {
			box-shadow:
				0 8px 20px rgba(0, 0, 0, 0.4),
				0 0 26px rgba(255, 200, 100, 0.55),
				inset 0 1px 0 rgba(255, 245, 220, 0.7);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sail:not(:disabled) {
			animation: none;
		}

		.hull {
			transition: none;
		}
	}

	@container (orientation: portrait) or (max-width: 760px) {
		.dock {
			padding: 10px;
			gap: 8px;
		}

		ul {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		li button {
			grid-template-columns: auto 1fr;
			gap: 6px;
			padding: 6px 8px;
		}

		li em,
		.tip {
			display: none;
		}

		.hull {
			width: calc(var(--len) * 9px);
		}

		.hull b {
			height: 8px;
		}

		li span {
			font-size: 0.95rem;
		}

		.title {
			font-size: 1.1rem;
		}
	}
</style>
