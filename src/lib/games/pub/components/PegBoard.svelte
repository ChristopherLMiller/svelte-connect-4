<script lang="ts">
	import { SEAT_GLOW } from '../types';

	let {
		scores,
		prev,
		names
	}: {
		scores: number[];
		prev: number[];
		names: string[];
	} = $props();

	const uid = $props.id();
	const W = 450;
	const ROWS = [34, 82, 130];

	function holeX(i: number, row: number) {
		const x = 30 + i * 9 + Math.floor(i / 5) * 6;
		return row === 1 ? 453 - x : x;
	}

	/** Centre of a lane's hole for a score from 0 (start) to 121 (home). */
	function at(score: number, lane: number) {
		const off = lane === 0 ? -7 : 7;
		if (score <= 0) return { x: 12, y: ROWS[0] + off };
		if (score >= 121) return { x: 440, y: ROWS[2] + 24 };
		const row = Math.floor((score - 1) / 40);
		const i = (score - 1) % 40;
		return { x: holeX(i, row), y: ROWS[row] + off };
	}

	const holes: Array<{ x: number; y: number }> = [];
	for (let row = 0; row < 3; row++) {
		for (let i = 0; i < 40; i++) {
			for (const off of [-7, 7]) holes.push({ x: holeX(i, row), y: ROWS[row] + off });
		}
	}
</script>

<svg class="board" viewBox="0 0 {W} 168" role="img" aria-label="Cribbage board: {names[0]} {scores[0]}, {names[1]} {scores[1]}">
	<defs>
		<linearGradient id="{uid}-walnut" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#6b4224" />
			<stop offset="0.5" stop-color="#4e2e17" />
			<stop offset="1" stop-color="#3a2110" />
		</linearGradient>
		<pattern id="{uid}-grain" width="60" height="8" patternUnits="userSpaceOnUse">
			<path d="M0 4 Q15 2 30 4 T60 4" stroke="rgba(0,0,0,0.18)" fill="none" stroke-width="1" />
		</pattern>
	</defs>
	<rect x="2" y="2" width={W - 4} height="164" rx="16" fill="url(#{uid}-walnut)" stroke="#2a170a" stroke-width="2" />
	<rect x="2" y="2" width={W - 4} height="164" rx="16" fill="url(#{uid}-grain)" opacity="0.8" />
	<rect x="7" y="7" width={W - 14} height="154" rx="12" fill="none" stroke="#c99a48" stroke-width="1.2" opacity="0.6" />
	{#each ROWS as y (y)}
		<line x1="24" x2="430" y1={y} y2={y} stroke="#c99a48" stroke-width="0.8" opacity="0.4" />
	{/each}
	{#each holes as hole, i (i)}
		<circle cx={hole.x} cy={hole.y} r="1.9" fill="#1a0d05" />
	{/each}
	<circle cx="12" cy={ROWS[0]} r="9" fill="#2a170a" opacity="0.5" />
	<circle cx="440" cy={ROWS[2] + 24} r="5" fill="#1a0d05" stroke="#c99a48" stroke-width="1" />
	<text x="440" y={ROWS[2] + 37} text-anchor="middle" class="tiny">121</text>
	{#each [30, 60, 90] as mark (mark)}
		{@const p = at(mark, 0)}
		<text x={p.x} y={p.y - 9} text-anchor="middle" class="tiny">{mark}</text>
	{/each}
	{#each [0, 1] as lane (lane)}
		{#each [prev[lane], scores[lane]] as score, k (k)}
			{@const p = at(score, lane)}
			<g class="peg" style:transform="translate({p.x}px, {p.y}px)" style:--glow={SEAT_GLOW[lane]}>
				<circle r={k === 1 ? 5 : 3.8} fill={k === 1 ? 'var(--glow)' : 'color-mix(in srgb, var(--glow) 55%, #3a2110)'} stroke="#1a0d05" stroke-width="1" />
				{#if k === 1}<circle r="1.4" cx="-1.2" cy="-1.2" fill="rgba(255,255,255,0.6)" />{/if}
			</g>
		{/each}
	{/each}
</svg>

<style>
	.board {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.5));
	}

	.tiny {
		font: 600 7px Spectral, Georgia, serif;
		fill: #d9b06a;
		opacity: 0.7;
	}

	.peg {
		transition: transform 700ms cubic-bezier(0.3, 1.4, 0.5, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		.peg {
			transition: none;
		}
	}
</style>
