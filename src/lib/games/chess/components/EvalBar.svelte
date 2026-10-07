<script lang="ts">
	import { MATE } from '../ai';
	import type { Side } from '../types';

	let { score, bottom }: { score: number | null; bottom: Side } = $props();

	const mate = $derived(score !== null && Math.abs(score) > MATE - 1000);
	const white = $derived.by(() => {
		if (score === null) return 0.5;
		if (mate) return score > 0 ? 1 : 0;
		return 0.5 + 0.5 * Math.tanh(score / 600);
	});
	const label = $derived.by(() => {
		if (score === null) return '…';
		if (mate) {
			const n = Math.ceil((MATE - Math.abs(score)) / 2);
			return n <= 0 ? '#' : `M${n}`;
		}
		const v = Math.abs(score) / 100;
		return v < 0.05 ? '0.0' : v.toFixed(1);
	});
	const leader = $derived(score === null || Math.abs(score) < 5 ? null : score > 0 ? 'w' : 'b');
</script>

<div class="bar" class:flip={bottom === 'b'} role="meter" aria-label="Evaluation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(white * 100)}>
	<i class="white" style:--fill={white}></i>
	<b class="label" class:top={leader !== bottom && leader !== null}>{label}</b>
</div>

<style>
	.bar {
		position: relative;
		width: 16px;
		height: 100%;
		border-radius: 5px;
		overflow: hidden;
		background: linear-gradient(90deg, #2a1d16, #120c09);
		border: 1px solid rgba(217, 178, 94, 0.35);
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
	}

	.white {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 100%;
		transform-origin: bottom;
		transform: scaleY(var(--fill));
		background: linear-gradient(90deg, #fffaf0, #d9c8a6);
		transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.flip .white {
		bottom: auto;
		top: 0;
		transform-origin: top;
	}

	.label {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 3px;
		text-align: center;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.5rem;
		font-weight: 800;
		color: #f3e7cf;
		mix-blend-mode: difference;
		writing-mode: vertical-rl;
		rotate: 180deg;
	}

	.label.top {
		bottom: auto;
		top: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.white {
			transition: none;
		}
	}
</style>
