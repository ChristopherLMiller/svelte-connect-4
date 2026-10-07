<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { HIT, SUNK } from '../engine';
	import { NORTH, nameOf, opponent, type Player } from '../types';
	import type { LightSession } from '../session.svelte';

	let { session }: { session: LightSession } = $props();

	let shown = $state(false);
	let tucked = $state(false);

	$effect(() => {
		const over = session.screen === 'play' && session.status.type !== 'playing' && !session.animating;
		tucked = false;
		if (!over) {
			shown = false;
			return;
		}
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = window.setTimeout(() => (shown = true), reduced ? 250 : 2200);
		return () => window.clearTimeout(timer);
	});

	const winner = $derived<Player>(session.status.type === 'won' ? session.status.winner : NORTH);
	const won = $derived(session.mode === 'local' || winner === NORTH);

	function gunnery(player: Player) {
		const w = session.waters;
		if (!w) return { shots: 0, hits: 0 };
		const sea = w[opponent(player)].shots;
		let shots = 0;
		let hits = 0;
		for (const s of sea) {
			if (s) shots += 1;
			if (s === HIT || s === SUNK) hits += 1;
		}
		return { shots, hits };
	}

	const stats = $derived.by(() => {
		const g = gunnery(session.mode === 'ai' ? NORTH : winner);
		return { ...g, pct: g.shots ? Math.round((g.hits / g.shots) * 100) : 0 };
	});

	const copy = $derived.by(() => {
		if (session.mode === 'ai') {
			return winner === NORTH
				? { kicker: 'Dawn over the headland', title: 'The Wrecker is sunk', body: 'Every false light is out. The lamp burns on and the keeper sleeps at last.' }
				: { kicker: 'The lamp gutters', title: 'Wrecked on the rocks', body: 'The Wrecker found every hull. Sweep the gaps the next time and keep the guns close.' };
		}
		const name = nameOf(winner, session.mode);
		return { kicker: 'The fog lifts', title: `${name} keeps the light`, body: `${nameOf(opponent(winner), session.mode)} has no ships left. Swap who fires first and sail again?` };
	});

	const gulls = Array.from({ length: 6 }, (_, k) => ({ k, x: 10 + ((k * 37) % 80), y: (k * 23) % 40, d: (k * 0.7) % 3 }));
</script>

{#if shown}
	{#if tucked}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (tucked = false)}>
			<i aria-hidden="true">{won ? '☀' : '⚓'}</i>{copy.title}
		</button>
	{:else}
		<div class="overlay" transition:fade={{ duration: 300 }}>
			<div class="panel" class:lost={!won} transition:scale={{ start: 0.92, duration: 340, delay: 80 }}>
				{#if won}
					<div class="gulls" aria-hidden="true">
						{#each gulls as g (g.k)}
							<i style:left="{g.x}%" style:top="{g.y}px" style:animation-delay="{g.d}s"></i>
						{/each}
					</div>
				{/if}
				<div class="seal" aria-hidden="true">
					<svg viewBox="0 0 40 40">
						{#if won}
							<circle cx="20" cy="20" r="8" fill="#ffd27a" />
							{#each Array.from({ length: 8 }, (_, k) => k) as k (k)}
								<line x1="20" y1="5" x2="20" y2="9" stroke="#ffd27a" stroke-width="2.4" stroke-linecap="round" transform="rotate({k * 45} 20 20)" />
							{/each}
						{:else}
							<path d="M20 6 v26 M12 12 h16 M8 24 q12 14 24 0" stroke="#d9d3c4" stroke-width="3" fill="none" stroke-linecap="round" />
							<circle cx="20" cy="6" r="3" fill="none" stroke="#d9d3c4" stroke-width="2.4" />
						{/if}
					</svg>
				</div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span>{copy.body}</span>
				<dl>
					<div><dt>Shots</dt><dd>{stats.shots}</dd></div>
					<div><dt>Hits</dt><dd>{stats.hits}</dd></div>
					<div><dt>Gunnery</dt><dd>{stats.pct}%</dd></div>
				</dl>
				<div class="actions">
					<button type="button" class="primary" onclick={() => session.rematch()}>Sail again</button>
					<button type="button" onclick={() => (tucked = true)}>Look at the charts</button>
					<button type="button" onclick={() => session.backToMenu()}>Leave the light</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: center;
		padding: 16px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
		pointer-events: none;
		background: radial-gradient(70% 60% at 50% 50%, rgba(4, 8, 12, 0.55), transparent);
	}

	.panel {
		position: relative;
		width: min(460px, 100%);
		padding: 30px 24px 20px;
		border-radius: 14px;
		pointer-events: auto;
		text-align: center;
		color: #f2e8d5;
		background:
			radial-gradient(80% 60% at 50% 0%, rgba(255, 200, 110, 0.18), transparent 70%),
			linear-gradient(180deg, #16283a, #0a1520);
		border: 1px solid rgba(232, 176, 90, 0.4);
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			0 0 50px rgba(255, 200, 110, 0.12),
			inset 0 1px 0 rgba(255, 230, 180, 0.12);
	}

	.panel.lost {
		background:
			radial-gradient(80% 60% at 50% 0%, rgba(150, 170, 190, 0.14), transparent 70%),
			linear-gradient(180deg, #141c24, #080d12);
		border-color: rgba(170, 180, 190, 0.3);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
	}

	.gulls {
		position: absolute;
		inset: -70px 0 auto;
		height: 70px;
		pointer-events: none;
	}

	.gulls i {
		position: absolute;
		width: 18px;
		height: 7px;
		border-top: 2px solid #f2e8d5;
		border-radius: 50% 50% 0 0;
		opacity: 0.8;
		animation: glide 5s ease-in-out infinite;
	}

	.gulls i::after {
		content: '';
		position: absolute;
		left: 8px;
		top: -2px;
		width: 18px;
		height: 7px;
		border-top: 2px solid #f2e8d5;
		border-radius: 50% 50% 0 0;
	}

	.seal {
		width: 62px;
		height: 62px;
		margin: -62px auto 10px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #20384c, #0b1621);
		border: 2px solid #e8b05a;
		box-shadow:
			0 10px 24px rgba(0, 0, 0, 0.5),
			0 0 22px rgba(255, 200, 110, 0.45);
		animation: rise 700ms cubic-bezier(0.2, 1.4, 0.4, 1) both 150ms;
	}

	.lost .seal {
		border-color: #b9c2c9;
		background: radial-gradient(circle at 40% 35%, #34414c, #151c22);
		box-shadow:
			0 10px 24px rgba(0, 0, 0, 0.5),
			0 0 18px rgba(170, 190, 210, 0.3);
	}

	.seal svg {
		width: 40px;
		height: 40px;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #e8b05a;
	}

	.lost p {
		color: #a9b3bb;
	}

	.panel h2 {
		margin: 6px 0;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.7rem, 4.6vw, 2.3rem);
		line-height: 1.05;
	}

	.panel > span {
		display: block;
		color: #b3ab9a;
		font-size: 1rem;
		line-height: 1.5;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin: 16px 0 0;
	}

	dl div {
		padding: 8px 4px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(232, 176, 90, 0.16);
	}

	dt {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #b3ab9a;
	}

	dd {
		margin: 2px 0 0;
		font-family: 'IM Fell English', Georgia, serif;
		font-size: 1.5rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}

	.actions button,
	.pill {
		appearance: none;
		border: 1px solid rgba(232, 176, 90, 0.3);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		border-color: transparent;
		background: linear-gradient(180deg, #ffd27a, #c58a2c);
		color: #1a1206;
	}

	.pill {
		position: absolute;
		z-index: 9;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom));
		translate: -50% 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(180deg, #16283a, #0a1520);
		color: #f2e8d5;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.pill i {
		font-style: normal;
		color: #ffd27a;
	}

	@keyframes glide {
		50% {
			transform: translate(16px, -8px) scaleY(0.6);
		}
	}

	@keyframes rise {
		from {
			translate: 0 20px;
			opacity: 0;
		}
		to {
			translate: 0 0;
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.seal,
		.gulls i {
			animation: none;
		}
	}
</style>
