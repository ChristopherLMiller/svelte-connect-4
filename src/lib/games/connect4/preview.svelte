<script lang="ts">
	import type { Cell } from './types';

	const SNAPSHOT: Cell[][] = [
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 1, 0, 0, 0, 0],
		[0, 2, 1, 2, 0, 0, 0],
		[0, 2, 1, 1, 2, 0, 0],
		[1, 2, 2, 1, 1, 2, 1]
	];
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sky"></div>
	<div class="hud">
		<div class="brand">
			<span>CONNECT</span>
			<strong>4</strong>
		</div>
		<div class="turn">
			<i class="pip"></i>
			<div>
				<small>Active operator · LOCAL DUEL · HOTSEAT</small>
				<b>Crimson to drop</b>
			</div>
		</div>
		<div class="score">
			<div class="fighter p1">
				<span>Crimson</span>
				<em>2</em>
			</div>
			<i>VS</i>
			<div class="fighter p2">
				<span>Gold</span>
				<em>1</em>
			</div>
		</div>
	</div>
	<div class="well">
		<div class="board">
			{#each SNAPSHOT as row, r (r)}
				{#each row as cell, c (`${r}-${c}`)}
					<span class="hole" class:p1={cell === 1} class:p2={cell === 2}></span>
				{/each}
			{/each}
		</div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		isolation: isolate;
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 3%;
		padding: 4% 4% 4.5%;
		overflow: hidden;
		font-family: Orbitron, sans-serif;
		color: #f4f1ff;
		container-type: size;
	}

	.sky {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(circle at 12% 18%, rgba(139, 124, 255, 0.28), transparent 32%),
			radial-gradient(circle at 88% 8%, rgba(255, 51, 92, 0.16), transparent 28%),
			radial-gradient(1.2px 1.2px at 18% 22%, #fff, transparent),
			radial-gradient(1px 1px at 72% 16%, #5ce1e6, transparent),
			radial-gradient(1px 1px at 40% 70%, #fff, transparent),
			radial-gradient(1.4px 1.4px at 86% 48%, #ffe38a, transparent),
			linear-gradient(180deg, #12081c 0%, #07060d 58%, #0c0714 100%);
	}

	.hud,
	.well {
		position: relative;
		z-index: 1;
	}

	.well {
		display: grid;
		place-items: center;
		min-height: 0;
		container-type: size;
	}

	.hud {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 6px;
		align-items: stretch;
	}

	.brand,
	.turn,
	.score {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 40%),
			rgba(10, 8, 20, 0.72);
		border-radius: 10px;
	}

	.brand {
		display: grid;
		align-content: center;
		padding: 6px 10px 6px 12px;
		line-height: 0.86;
		min-width: 64px;
		position: relative;
	}

	.brand::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 2px;
		background: linear-gradient(180deg, #5ce1e6, #f5c24b, #ff335c);
	}

	.brand span {
		letter-spacing: 0.18em;
		font-size: 0.42rem;
		color: #5ce1e6;
	}

	.brand strong {
		font-size: 1.15rem;
		background: linear-gradient(180deg, #fff1b0, #ff335c);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.turn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		min-width: 0;
		border-color: rgba(255, 51, 92, 0.4);
	}

	.pip {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		flex-shrink: 0;
		background:
			radial-gradient(circle at 32% 28%, #fff, #ff335c 42%, #6a1024);
		box-shadow: 0 0 10px rgba(255, 51, 92, 0.55);
	}

	.turn small {
		display: block;
		color: #5ce1e6;
		font-size: 0.38rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.turn b {
		display: block;
		font-size: clamp(0.55rem, 1.6vw, 0.78rem);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
	}

	.fighter {
		display: grid;
		justify-items: center;
		line-height: 1;
	}

	.fighter span {
		font-size: 0.32rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(244, 241, 255, 0.55);
	}

	.fighter em {
		font-style: normal;
		font-size: 0.95rem;
	}

	.fighter.p1 em {
		color: #ff6b88;
	}

	.fighter.p2 em {
		color: #ffe38a;
	}

	.score i {
		font-style: normal;
		font-size: 0.38rem;
		letter-spacing: 0.12em;
		color: #5ce1e6;
		border: 1px solid rgba(92, 225, 230, 0.35);
		border-radius: 999px;
		padding: 3px 5px;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		grid-template-rows: repeat(6, minmax(0, 1fr));
		aspect-ratio: 7 / 6;
		width: min(100cqw, calc(100cqh * 7 / 6));
		height: min(100cqh, calc(100cqw * 6 / 7));
		max-width: 100%;
		gap: 4.5%;
		padding: 5.5% 5% 6.5%;
		box-sizing: border-box;
		border-radius: 14px;
		background:
			linear-gradient(rgba(92, 225, 230, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(92, 225, 230, 0.1) 1px, transparent 1px),
			linear-gradient(180deg, rgba(92, 225, 230, 0.08), transparent 28%),
			linear-gradient(180deg, #2a3348, #121826 32%, #070910);
		background-size: 16px 16px, 16px 16px, auto, auto;
		border: 1px solid rgba(92, 225, 230, 0.28);
		box-shadow:
			0 18px 36px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px rgba(255, 255, 255, 0.06);
		position: relative;
	}

	.board::before,
	.board::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(92, 225, 230, 0.55);
		pointer-events: none;
	}

	.board::before {
		top: 8px;
		left: 8px;
		border-right: 0;
		border-bottom: 0;
	}

	.board::after {
		top: 8px;
		right: 8px;
		border-left: 0;
		border-bottom: 0;
	}

	.hole {
		display: block;
		min-width: 0;
		min-height: 0;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 40%, #14101c, #05040a 72%);
		box-shadow:
			inset 0 0 0 1.4px rgba(92, 225, 230, 0.38),
			0 0 0 2.5px rgba(8, 10, 18, 0.9);
	}

	.hole.p1,
	.hole.p2 {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.2),
			0 4px 8px rgba(0, 0, 0, 0.4);
	}

	.hole.p1 {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), transparent 28%),
			radial-gradient(circle at 50% 46%, #ff335c, #5a0820 70%);
	}

	.hole.p2 {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), transparent 28%),
			radial-gradient(circle at 50% 46%, #ffe38a, #8a5a08 70%);
	}

	@media (max-width: 720px) {
		.turn small {
			display: none;
		}

		.brand span {
			font-size: 0.36rem;
		}
	}

	@container (max-width: 420px) {
		.turn small,
		.fighter span,
		.score i {
			display: none;
		}

		.hud {
			gap: 4px;
		}

		.turn b {
			font-size: 0.55rem;
		}
	}
</style>
