<script lang="ts">
	import type { Player } from '../types';

	let {
		mode = 'win',
		winner = 1
	}: {
		mode?: 'win' | 'draw';
		winner?: Player;
	} = $props();

	const palette = $derived(
		mode === 'draw'
			? ['#5ce1e6', '#8b7cff', '#9aa3c7']
			: winner === 1
				? ['#ff335c', '#ff8aa3', '#5ce1e6', '#ffffff']
				: ['#f5c24b', '#ffe38a', '#5ce1e6', '#ffffff']
	);
	const words = $derived(mode === 'draw' ? ['NULL', 'HOLD', '0x00', '//'] : ['04', 'LOCK', 'FOUR', '0x4', 'OK']);
	const burst = $derived.by(() => {
		const colors = palette;
		const labels = words;
		const pick = (i: number) => colors[i % colors.length] ?? '#5ce1e6';
		if (mode === 'draw') {
			return {
				streaks: [] as Array<{ a: number; d: number; l: number; c: string }>,
				shards: [] as Array<{ a: number; d: number; s: number; c: string }>,
				glyphs: labels.map((text, i) => ({
					text,
					x: 12 + i * 22,
					y: 18 + (i % 3) * 16,
					d: 80 * i
				}))
			};
		}
		return {
			streaks: Array.from({ length: 16 }, (_, i) => ({
				a: (360 / 16) * i + (i % 4) * 7,
				d: (i % 6) * 28,
				l: 70 + (i % 5) * 22,
				c: pick(i)
			})),
			shards: Array.from({ length: 8 }, (_, i) => ({
				a: (360 / 8) * i + 12,
				d: 40 + i * 24,
				s: 8 + (i % 3) * 4,
				c: pick(i + 1)
			})),
			glyphs: labels.map((text, i) => ({
				text,
				x: 10 + ((i * 19) % 78),
				y: 8 + ((i * 13) % 36),
				d: 90 * i
			}))
		};
	});
</script>

<div class={['burst', mode, { p1: winner === 1, p2: winner === 2 }]} aria-hidden="true">
	{#each burst.streaks as streak, i (`s${i}`)}
		<span
			class="streak"
			style:--a="{streak.a}deg"
			style:--d="{streak.d}ms"
			style:--l="{streak.l}px"
			style:--c={streak.c}
		></span>
	{/each}
	{#each burst.shards as shard, i (`h${i}`)}
		<i
			class="shard"
			style:--a="{shard.a}deg"
			style:--d="{shard.d}ms"
			style:--s="{shard.s}px"
			style:--c={shard.c}
		></i>
	{/each}
	{#if mode === 'win'}
		<span class="ring one"></span>
		<span class="ring two"></span>
	{/if}
	{#each burst.glyphs as glyph, i (`g${i}`)}
		<b class="glyph" style:--x="{glyph.x}%" style:--y="{glyph.y}%" style:--d="{glyph.d}ms">{glyph.text}</b>
	{/each}
</div>

<style>
	.burst {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		contain: strict;
	}

	.streak,
	.shard,
	.ring,
	.glyph {
		position: absolute;
		left: 50%;
		top: 38%;
		pointer-events: none;
	}

	.streak {
		width: var(--l);
		height: 2px;
		margin: 0;
		background: linear-gradient(90deg, var(--c), transparent);
		transform-origin: 0 50%;
		animation: streak 0.7s ease-out var(--d) forwards;
	}

	.shard {
		width: var(--s);
		height: var(--s);
		margin: 0;
		border: 1px solid var(--c);
		transform: rotate(45deg);
		animation: shard 0.85s ease-out var(--d) forwards;
	}

	.ring {
		width: 28px;
		height: 28px;
		border: 2px solid #fff;
		border-radius: 50%;
		translate: -50% -50%;
		animation: ring 0.9s ease-out forwards;
	}

	.p1 .ring {
		border-color: #ff335c;
	}

	.p2 .ring {
		border-color: #f5c24b;
	}

	.two {
		animation-delay: 120ms;
	}

	.glyph {
		left: var(--x);
		top: var(--y);
		margin: 0;
		font: 700 0.72rem ui-monospace, monospace;
		letter-spacing: 0.14em;
		color: #5ce1e6;
		opacity: 0;
		animation: glyph 1.8s ease-out var(--d) forwards;
	}

	.p1 .glyph {
		color: #ff8aa3;
	}

	.p2 .glyph {
		color: #ffe38a;
	}

	.draw .glyph {
		color: #8b7cff;
		animation-duration: 2.2s;
	}

	@keyframes streak {
		from {
			transform: rotate(var(--a)) scaleX(0.15);
			opacity: 1;
		}
		to {
			transform: rotate(var(--a)) scaleX(1.65);
			opacity: 0;
		}
	}

	@keyframes shard {
		from {
			transform: rotate(var(--a)) translate(0, 0) rotate(45deg);
			opacity: 1;
		}
		to {
			transform: rotate(var(--a)) translate(120px, 0) rotate(120deg);
			opacity: 0;
		}
	}

	@keyframes ring {
		from {
			transform: scale(0.4);
			opacity: 0.85;
		}
		to {
			transform: scale(18);
			opacity: 0;
		}
	}

	@keyframes glyph {
		0% {
			opacity: 0;
			transform: translateY(-8px);
		}
		18% {
			opacity: 0.8;
		}
		100% {
			opacity: 0;
			transform: translateY(28px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.streak,
		.shard,
		.ring,
		.glyph {
			animation: none;
			opacity: 0;
		}
	}
</style>
