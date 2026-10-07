<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import PieceGlyph from './PieceGlyph.svelte';
	import type { ChessSession } from '../session.svelte';

	let { session }: { session: ChessSession } = $props();

	const CHOICES: Array<[number, string, string]> = [
		[5, 'Queen', 'q'],
		[4, 'Rook', 'r'],
		[3, 'Bishop', 'b'],
		[2, 'Knight', 'n']
	];
	const sign = $derived(session.turn === 'w' ? 1 : -1);

	function onkey(event: KeyboardEvent) {
		const hit = CHOICES.find((c) => c[2] === event.key.toLowerCase());
		if (hit) {
			event.preventDefault();
			event.stopPropagation();
			session.choosePromotion(hit[0]);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			session.cancelPromotion();
		}
	}
</script>

<svelte:window onkeydowncapture={onkey} />

<div class="veil" transition:fade={{ duration: 140 }} onclick={() => session.cancelPromotion()} role="presentation">
	<div class="picker" role="dialog" aria-label="Promote to" tabindex="-1" transition:scale={{ start: 0.9, duration: 180 }} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
		<p>Promote to</p>
		<div class="row">
			{#each CHOICES as [type, label, key] (type)}
				<button onclick={() => session.choosePromotion(type)} aria-label="{label} ({key.toUpperCase()})">
					<PieceGlyph piece={type * sign} size={56} />
					<small>{label}</small>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.veil {
		position: absolute;
		inset: 0;
		z-index: 6;
		display: grid;
		place-items: center;
		background: rgba(8, 4, 2, 0.5);
		backdrop-filter: blur(2px);
		border-radius: 8px;
	}

	.picker {
		padding: 12px 14px 14px;
		border-radius: 12px;
		background: linear-gradient(180deg, #2a1610, #120a07);
		border: 1px solid #d9b25e;
		box-shadow:
			0 0 40px rgba(255, 196, 110, 0.25),
			0 18px 40px rgba(0, 0, 0, 0.6);
		text-align: center;
		color: #f3e7cf;
	}

	p {
		margin: 0 0 8px;
		font-family: 'Cinzel', Georgia, serif;
		letter-spacing: 0.12em;
		font-size: 0.86rem;
		color: #d9b25e;
	}

	.row {
		display: flex;
		gap: 8px;
	}

	button {
		appearance: none;
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 8px 8px 6px;
		border-radius: 10px;
		border: 1px solid rgba(217, 178, 94, 0.25);
		background: radial-gradient(circle at 50% 40%, rgba(255, 220, 160, 0.14), rgba(0, 0, 0, 0.3));
		color: inherit;
		font: inherit;
		cursor: pointer;
		transition:
			border-color 140ms ease,
			transform 140ms ease;
	}

	button small {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #bba88a;
	}

	@media (hover: hover) {
		button:hover {
			border-color: #ecc874;
			transform: translateY(-2px);
		}
	}

	@media (max-width: 420px) {
		.row :global(canvas) {
			width: 44px !important;
			height: 44px !important;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button:hover {
			transform: none;
		}
	}
</style>
