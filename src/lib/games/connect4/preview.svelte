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

	const stars = [
		[12, 18, 1.4],
		[28, 8, 1],
		[46, 22, 1.2],
		[63, 11, 0.9],
		[78, 26, 1.3],
		[88, 9, 1],
		[18, 42, 0.8],
		[92, 48, 1.1],
		[8, 62, 0.9],
		[71, 16, 1.5],
		[5, 88, 1],
		[95, 80, 1.2],
		[36, 94, 0.8]
	] as const;
</script>

<div class="shot" aria-hidden="true">
	<div class="void"></div>
	{#each stars as [x, y, s], i (`s${i}`)}
		<i class="star" style:left="{x}%" style:top="{y}%" style:--s={s}></i>
	{/each}
	<div class="planet a"></div>
	<div class="planet b"></div>
	<div class="well">
		<div class="board">
			<i class="beam"></i>
			<i class="drop"></i>
			<div class="holes">
				{#each SNAPSHOT as row, r (r)}
					{#each row as cell, c (`${r}-${c}`)}
						<span class="hole" class:p1={cell === 1} class:p2={cell === 2}></span>
					{/each}
				{/each}
			</div>
			<i class="bracket tl"></i>
			<i class="bracket tr"></i>
			<i class="bracket bl"></i>
			<i class="bracket br"></i>
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
		grid-template-rows: minmax(0, 1fr);
		padding: 10% 5% 3%;
		box-sizing: border-box;
		overflow: hidden;
		container-type: size;
		background: #07060d;
	}

	.void {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(40% 34% at 22% 22%, rgba(139, 124, 255, 0.34), transparent 70%),
			radial-gradient(46% 40% at 82% 16%, rgba(255, 51, 92, 0.3), transparent 70%),
			radial-gradient(50% 40% at 60% 70%, rgba(150, 40, 90, 0.22), transparent 70%),
			radial-gradient(36% 30% at 12% 80%, rgba(92, 225, 230, 0.1), transparent 70%),
			linear-gradient(180deg, #160a22 0%, #0b0714 58%, #12081a 100%);
	}

	.star,
	.planet {
		position: absolute;
		z-index: 0;
		pointer-events: none;
		border-radius: 50%;
	}

	.star {
		width: calc(1.1px * var(--s));
		height: calc(1.1px * var(--s));
		background: #fff;
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
		opacity: 0.7;
	}

	.planet.a {
		width: 14%;
		aspect-ratio: 1;
		left: 4%;
		bottom: 10%;
		background: radial-gradient(circle at 34% 30%, #7fd6d0, #2a6a70 60%, #0c1c22);
		box-shadow: 0 0 16px rgba(92, 225, 230, 0.25);
		opacity: 0.75;
	}

	.planet.b {
		width: 10%;
		aspect-ratio: 1;
		right: 5%;
		top: 30%;
		background:
			repeating-linear-gradient(135deg, transparent 0 12%, rgba(255, 255, 255, 0.35) 12% 18%),
			radial-gradient(circle at 40% 32%, #b07ad8, #4a2a78 70%);
		opacity: 0.6;
	}

	.well {
		position: relative;
		z-index: 1;
		min-height: 0;
		display: grid;
		place-items: center;
	}

	.board {
		position: relative;
		aspect-ratio: 7 / 6;
		height: 100%;
		max-width: 100%;
		border-radius: 5%;
		background:
			repeating-linear-gradient(0deg, rgba(92, 225, 230, 0.08) 0 1px, transparent 1px 4%),
			repeating-linear-gradient(90deg, rgba(92, 225, 230, 0.08) 0 1px, transparent 1px 4%),
			linear-gradient(180deg, rgba(70, 110, 130, 0.62), rgba(30, 52, 66, 0.72) 60%, rgba(24, 40, 54, 0.8));
		box-shadow:
			inset 0 0 0 1px rgba(150, 230, 240, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			0 0 22px rgba(255, 51, 92, 0.22),
			0 12px 22px rgba(0, 0, 0, 0.5);
	}

	.holes {
		position: absolute;
		inset: 5% 3.5%;
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		grid-template-rows: repeat(6, minmax(0, 1fr));
		gap: 3%;
	}

	.hole {
		display: block;
		min-width: 0;
		min-height: 0;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 42%, rgba(40, 30, 60, 0.9), rgba(8, 8, 16, 0.95) 72%);
		box-shadow:
			inset 0 0 0 1.5px rgba(110, 220, 225, 0.55),
			inset 0 0 6px rgba(92, 225, 230, 0.25),
			0 0 0 1px rgba(4, 8, 14, 0.8);
	}

	.hole.p1,
	.hole.p2 {
		box-shadow:
			inset 0 0 0 1.5px rgba(110, 220, 225, 0.35),
			0 2px 5px rgba(0, 0, 0, 0.5);
	}

	.hole.p1 {
		background:
			radial-gradient(circle at 36% 30%, #fff 0 5%, rgba(255, 190, 205, 0.9) 11%, transparent 24%),
			radial-gradient(circle at 50% 50%, #f0365e 0, #c01c42 45%, #5a0820 78%, #2a0410 100%);
	}

	.hole.p2 {
		background:
			radial-gradient(circle at 36% 30%, #fff8dc 0 5%, rgba(255, 236, 170, 0.9) 11%, transparent 24%),
			radial-gradient(circle at 50% 50%, #f4c450 0, #c8901e 45%, #6a4208 78%, #2e1c04 100%);
	}

	.beam {
		position: absolute;
		left: 44.5%;
		width: 10.9%;
		top: -9%;
		bottom: 5%;
		background: linear-gradient(180deg, rgba(220, 255, 255, 0.5), rgba(160, 240, 245, 0.12) 30%, rgba(160, 240, 245, 0.06));
		border-radius: 40% 40% 8% 8%;
		pointer-events: none;
	}

	.drop {
		position: absolute;
		left: 44.5%;
		width: 10.9%;
		aspect-ratio: 1;
		top: -14%;
		border-radius: 50%;
		background:
			radial-gradient(circle at 36% 30%, #fff 0 5%, rgba(255, 190, 205, 0.9) 11%, transparent 24%),
			radial-gradient(circle at 50% 50%, #f0365e 0, #c01c42 45%, #5a0820 78%, #2a0410 100%);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.3),
			0 0 14px rgba(255, 51, 92, 0.55);
	}

	.bracket {
		position: absolute;
		width: 6%;
		aspect-ratio: 1;
		border: 0 solid #5ce1e6;
		opacity: 0.8;
	}

	.bracket.tl {
		top: 2.5%;
		left: 2%;
		border-top-width: 1.5px;
		border-left-width: 1.5px;
	}

	.bracket.tr {
		top: 2.5%;
		right: 2%;
		border-top-width: 1.5px;
		border-right-width: 1.5px;
	}

	.bracket.bl {
		bottom: 2.5%;
		left: 2%;
		border-color: #ff335c;
		border-bottom-width: 1.5px;
		border-left-width: 1.5px;
	}

	.bracket.br {
		bottom: 2.5%;
		right: 2%;
		border-color: #ff335c;
		border-bottom-width: 1.5px;
		border-right-width: 1.5px;
	}
</style>
