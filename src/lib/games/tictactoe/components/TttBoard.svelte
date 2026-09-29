<script lang="ts">
	import TttMark from './TttMark.svelte';
	import { playSelect } from '../audio';
	import { scratchGrid } from '../scratch';
	import type { TttSession } from '../session.svelte';

	let { session }: { session: TttSession } = $props();

	const lines = $derived(scratchGrid(session.gridToken));

	const win = $derived(
		session.status.type === 'won' ? new Set(session.status.cells.map(([r, c]) => `${r}:${c}`)) : new Set<string>()
	);

	const slash = $derived.by(() => {
		if (session.status.type !== 'won') return '';
		const [start, , end] = session.status.cells;
		const x1 = start[1] * 100 + 50;
		const y1 = start[0] * 100 + 50;
		const x2 = end[1] * 100 + 50;
		const y2 = end[0] * 100 + 50;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.hypot(dx, dy) || 1;
		const extra = 22;
		const x0 = x1 - (dx / len) * extra;
		const y0 = y1 - (dy / len) * extra;
		const x3 = x2 + (dx / len) * extra;
		const y3 = y2 + (dy / len) * extra;
		const mx = (x0 + x3) / 2 + (dy / len) * 7;
		const my = (y0 + y3) / 2 - (dx / len) * 7;
		return `M${x0},${y0} Q${mx},${my} ${x3},${y3}`;
	});

	function label(row: number, col: number) {
		const cell = session.board[row][col];
		const name = cell === 1 ? 'Cross' : cell === 2 ? 'Loop' : 'empty';
		return `Row ${row + 1}, column ${col + 1}, ${name}`;
	}

	const hinting = $derived(
		session.screen === 'play' &&
			session.status.type === 'playing' &&
			!session.washing &&
			!session.gridHidden &&
			!session.sketching
	);
	const preview = $derived(session.current);

	const fan = (count: number, reach: number, jitter: number, delay: number) =>
		Array.from({ length: count }, (_, i) => {
			const a = (i / count) * Math.PI * 2 + (i % 2) * jitter;
			const d = reach * (0.7 + ((i * 37) % 10) / 22);
			return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: 0.7 + ((i * 53) % 7) / 10, wait: (i % 3) * delay };
		});
	const grains = fan(12, 40, 0.35, 0.03);
	const sparks = fan(10, 46, 0.3, 0.08);

	function hover(row: number, col: number) {
		if (session.busy) return;
		if (session.hover?.[0] !== row || session.hover?.[1] !== col) playSelect();
		session.setHover([row, col]);
	}
</script>

<div class="grid">
	{#if !session.gridHidden}
		{#key session.gridToken}
			<svg class="grooves" viewBox="0 0 300 300" aria-hidden="true">
				{#each lines as d, i (`${i}-${d.slice(0, 24)}`)}
					<g class="cut" style:--wait="{i * 0.22}s">
						<path class="ridge" {d} />
						<path class="trough" {d} />
						<path class="wet" {d} />
					</g>
				{/each}
			</svg>
		{/key}
	{/if}
	{#each session.board as row, r (r)}
		{#each row as cell, c (`${r}-${c}`)}
			<button
				type="button"
				class="cell"
				class:on={hinting && session.hover?.[0] === r && session.hover?.[1] === c}
				class:ponder={session.aiThinking && session.hover?.[0] === r && session.hover?.[1] === c}
				class:win={win.has(`${r}:${c}`)}
				disabled={session.busy || cell !== 0}
				aria-label={label(r, c)}
				onclick={() => void session.playCell(r, c)}
				onpointerenter={() => hover(r, c)}
				onpointerleave={() => session.setHover(null)}
			>
				{#if cell !== 0}
					<span class="ink">
						<span class="damp" aria-hidden="true"></span>
						<span class="kick" aria-hidden="true">
							{#each grains as g, i (i)}
								<i style:--dx={g.dx} style:--dy={g.dy} style:--s={g.s} style:--wait="{g.wait}s"></i>
							{/each}
						</span>
						<TttMark player={cell} winning={win.has(`${r}:${c}`)} />
						{#if win.has(`${r}:${c}`)}
							<span class="sparks" aria-hidden="true">
								{#each sparks as g, i (i)}
									<i style:--dx={g.dx} style:--dy={g.dy} style:--s={g.s} style:--wait="{g.wait}s"></i>
								{/each}
							</span>
						{/if}
					</span>
				{:else if hinting && session.hover?.[0] === r && session.hover?.[1] === c}
					<span class="ink ghost">
						<TttMark
							player={preview}
							ghost
							thinking={session.aiThinking}
							seed={session.gridToken + r * 13 + c * 29}
						/>
					</span>
				{/if}
			</button>
		{/each}
	{/each}
	{#if slash && !session.gridHidden}
		<svg class="slash" viewBox="0 0 300 300" aria-hidden="true">
			<path class="glow wide" d={slash} />
			<path class="glow" d={slash} />
			<path class="stick" d={slash} />
		</svg>
	{/if}
</div>

<style>
	.grid {
		position: relative;
		width: min(78vmin, 92cqmin, 100%);
		aspect-ratio: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		background: transparent;
	}

	.grooves {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.grooves path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 520;
		stroke-dashoffset: 520;
		animation: scratch 0.55s ease-out forwards;
		animation-delay: var(--wait);
	}

	.ridge {
		stroke: #e8d4b4;
		stroke-width: 8.2;
		opacity: 0.42;
		transform: translate(0.6px, -0.8px);
	}

	.trough {
		stroke: #7a4f36;
		stroke-width: 5.2;
		opacity: 0.86;
	}

	.wet {
		stroke: #5c3a28;
		stroke-width: 2;
		opacity: 0.45;
	}

	.cell {
		appearance: none;
		border: 0;
		background: transparent;
		display: grid;
		place-items: center;
		cursor: pointer;
		position: relative;
		z-index: 1;
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.on::after {
		content: '';
		position: absolute;
		inset: 18%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(42, 22, 12, 0.16), transparent 70%);
		pointer-events: none;
	}

	.cell.ponder::after {
		animation: ponderDip 0.9s ease-in-out infinite;
	}

	.ink.ghost {
		opacity: 0.92;
		pointer-events: none;
		animation: hintIn 0.16s ease-out;
	}

	.cell.ponder .ink.ghost {
		animation: ponder 1s ease-in-out infinite;
	}

	.slash {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
		z-index: 2;
	}

	.slash path {
		fill: none;
		stroke-linecap: round;
		stroke-dasharray: 480;
		stroke-dashoffset: 480;
		animation: scratch 0.7s ease-out 0.18s forwards;
	}

	.slash .glow {
		stroke: rgba(255, 214, 130, 0.55);
		stroke-width: 22;
		opacity: 0.7;
	}

	.slash .glow.wide {
		stroke-width: 36;
		opacity: 0.28;
	}

	.slash .stick {
		stroke: #6e3d22;
		stroke-width: 6.2;
		opacity: 0.95;
	}

	.cell.win::before {
		content: '';
		position: absolute;
		inset: 10%;
		border-radius: 50%;
		border: 2px solid rgba(255, 214, 140, 0.38);
		animation: ripple 1.7s ease-out infinite;
		pointer-events: none;
	}

	.cell.win .ink {
		animation: pulse 1.2s ease-in-out infinite;
	}

	.cell.win .ink::after {
		content: '';
		position: absolute;
		inset: 10%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 214, 140, 0.55), transparent 68%);
		animation: winGlow 1.2s ease-in-out infinite;
		pointer-events: none;
		z-index: 0;
	}

	.ink {
		display: grid;
		place-items: center;
		position: relative;
		width: 100%;
		height: 100%;
		container-type: size;
	}

	.ink > :global(svg) {
		position: relative;
		z-index: 1;
	}

	.damp {
		position: absolute;
		inset: 14%;
		border-radius: 46% 54% 50% 50%;
		background: radial-gradient(circle, rgba(92, 58, 36, 0.13), rgba(92, 58, 36, 0.05) 50%, transparent 70%);
		animation: damp 2.6s ease-out forwards;
		pointer-events: none;
	}

	.kick,
	.sparks {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sparks {
		z-index: 2;
	}

	.kick i,
	.sparks i {
		position: absolute;
		left: 50%;
		top: 50%;
		border-radius: 50%;
		opacity: 0;
	}

	.kick i {
		width: calc(var(--s) * 4.6cqw);
		height: calc(var(--s) * 4.6cqw);
		margin: calc(var(--s) * -2.3cqw);
		background: radial-gradient(circle at 35% 30%, #fff3d8, #d8b684 70%);
		box-shadow: 0 0.8cqw 0.6cqw rgba(70, 42, 24, 0.45);
		animation: kick 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
		animation-delay: calc(0.12s + var(--wait));
	}

	.sparks i {
		width: calc(var(--s) * 5cqw);
		height: calc(var(--s) * 5cqw);
		margin: calc(var(--s) * -2.5cqw);
		background: radial-gradient(circle, #fffbe8 0 22%, rgba(255, 214, 130, 0.9) 36%, transparent 70%);
		animation: spark 1.3s ease-out infinite;
		animation-delay: calc(0.5s + var(--wait));
	}

	@keyframes damp {
		0% {
			opacity: 0;
			scale: 0.5;
		}
		18% {
			opacity: 1;
			scale: 1.08;
		}
		100% {
			opacity: 0.55;
			scale: 1;
		}
	}

	@keyframes kick {
		0% {
			opacity: 0.95;
			translate: 0 0;
		}
		60% {
			opacity: 0.85;
		}
		100% {
			opacity: 0;
			translate: calc(var(--dx) * 1cqw) calc(var(--dy) * 1cqh + 6cqh);
			scale: 0.5;
		}
	}

	@keyframes spark {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.3;
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: calc(var(--dx) * 1cqw) calc(var(--dy) * 1cqh);
			scale: 1.1;
		}
	}

	@keyframes scratch {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes pulse {
		50% {
			scale: 1.06;
		}
	}

	@keyframes winGlow {
		50% {
			opacity: 0.5;
		}
	}

	@keyframes ripple {
		0% {
			opacity: 0.7;
			scale: 0.72;
		}
		100% {
			opacity: 0;
			scale: 1.18;
		}
	}

	@keyframes hintIn {
		from {
			opacity: 0;
			scale: 0.92;
		}
		to {
			opacity: 0.92;
			scale: 1;
		}
	}

	@keyframes ponder {
		50% {
			opacity: 0.58;
		}
	}

	@keyframes ponderDip {
		50% {
			opacity: 0.55;
			scale: 1.12;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.grooves path,
		.slash path {
			animation: none;
			stroke-dashoffset: 0;
		}

		.damp,
		.kick i,
		.sparks i {
			animation: none;
		}

		.kick i,
		.sparks i {
			display: none;
		}

		.cell.win::before,
		.cell.win .ink,
		.cell.win .ink::after,
		.ink.ghost,
		.cell.ponder::after,
		.cell.ponder .ink.ghost {
			animation: none;
		}
	}
</style>
