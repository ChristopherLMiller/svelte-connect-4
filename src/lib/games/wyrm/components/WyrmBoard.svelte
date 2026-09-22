<script lang="ts">
	import { COLS, ROWS, type Dir, type Point } from '../types';
	import type { WyrmSession } from '../session.svelte';

	let { session }: { session: WyrmSession } = $props();

	const uid = $props.id();
	const cell = 20;
	const width = COLS * cell;
	const height = ROWS * cell;

	const path = $derived(toPath(session.drawn, cell));
	const head = $derived(session.drawn.at(-1) ?? { x: 0, y: 0 });
	const food = $derived(session.food);
	const heading = $derived(session.dir);
	const ended = $derived(session.status.type === 'dead' || session.status.type === 'won');
	const deg = $derived(headDeg(heading));

	function toXY(point: Point) {
		return { x: point.x * cell + cell / 2, y: point.y * cell + cell / 2 };
	}

	function toPath(cells: Point[], size: number) {
		if (!cells.length) return '';
		const pts = cells.map((point) => {
			const x = point.x * size + size / 2;
			const y = point.y * size + size / 2;
			return `${x},${y}`;
		});
		return `M ${pts.join(' L ')}`;
	}

	function headDeg(dir: Dir) {
		if (dir === 'down') return 90;
		if (dir === 'left') return 180;
		if (dir === 'up') return -90;
		return 0;
	}

	let swipe: { x: number; y: number } | null = null;

	function down(event: PointerEvent) {
		swipe = { x: event.clientX, y: event.clientY };
	}

	function up(event: PointerEvent) {
		if (!swipe) return;
		const dx = event.clientX - swipe.x;
		const dy = event.clientY - swipe.y;
		swipe = null;
		if (Math.hypot(dx, dy) < 24) return;
		if (Math.abs(dx) > Math.abs(dy)) session.steer(dx > 0 ? 'right' : 'left');
		else session.steer(dy > 0 ? 'down' : 'up');
	}

	const hx = $derived(toXY(head));
	const lampLeft = $derived(((food.x + 0.5) / COLS) * 100);
	const lampTop = $derived(((food.y + 0.5) / ROWS) * 100);
	const biteAt = $derived(session.meal ?? food);
	const sparks = Array.from({ length: 12 }, (_, i) => {
		const a = (i / 12) * Math.PI * 2;
		const reach = i % 2 === 0 ? 1 : 0.62;
		return { i, x: Math.cos(a) * reach, y: Math.sin(a) * reach, a };
	});
</script>

<div
	class="stage"
	class:ended
	class:waiting={session.waiting}
	class:paused={session.status.type === 'paused'}
	class:won={session.status.type === 'won'}
	role="application"
	aria-label="Lantern Wyrm board. Arrow keys or WASD steer the dragon."
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={() => (swipe = null)}
>
	<div class="frame">
		<i class="vine top"></i>
		<i class="vine bottom"></i>
		<i class="corner tl"></i>
		<i class="corner tr"></i>
		<i class="corner bl"></i>
		<i class="corner br"></i>
		<span class="peg tl"><b></b></span>
		<span class="peg tr"><b></b></span>
		<span class="peg bl"><b></b></span>
		<span class="peg br"><b></b></span>
		<div class="play">
		<svg class="board" viewBox="0 0 {width} {height}" aria-hidden="true">
			<defs>
				<linearGradient id="{uid}-silk" x1="0" y1="0" x2={width} y2={height} gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#fff6d2" />
					<stop offset="0.35" stop-color="#f0c45c" />
					<stop offset="0.78" stop-color="#e24a3d" />
					<stop offset="1" stop-color="#8a1820" />
				</linearGradient>
				<pattern id="{uid}-paper" width={cell} height={cell} patternUnits="userSpaceOnUse">
					<rect width={cell} height={cell} fill="rgba(240, 196, 92, 0.04)" />
					<path
						d="M {cell} 0 L 0 0 0 {cell}"
						fill="none"
						stroke="rgba(240, 196, 92, 0.11)"
						stroke-width="1"
					/>
				</pattern>
			</defs>
			<rect class="paper" width={width} height={height} fill="url(#{uid}-paper)" />
			{#if path}
				<path
					class="shadow"
					d={path}
					fill="none"
					stroke="#140c16"
					stroke-width="16.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="0.45"
				/>
				<path
					class="silk"
					d={path}
					fill="none"
					stroke="url(#{uid}-silk)"
					stroke-width="13.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					class="ridge"
					d={path}
					fill="none"
					stroke="#fff6d8"
					stroke-width="3.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="0.38"
				/>
				<path
					class="scales"
					d={path}
					fill="none"
					stroke="rgba(26, 18, 48, 0.28)"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-dasharray="4 10"
				/>
			{/if}
			<g class="head" transform="translate({hx.x} {hx.y}) rotate({deg})">
				<ellipse class="halo" rx="13" ry="10" fill="rgba(255, 241, 196, 0.34)" />
				<path class="whisker" d="M 7 0 Q 16 -7 22 -11" fill="none" stroke="#fff1c4" stroke-width="0.9" />
				<path class="whisker low" d="M 7 2 Q 16 9 22 12" fill="none" stroke="#fff1c4" stroke-width="0.9" />
				<path d="M -9 -1 Q -15 -8 -7 -11 Q -4 -4 0 -3 Z" fill="#e24a3d" />
				<ellipse cx="1" cy="0" rx="8.1" ry="6.5" fill="#fff1c4" />
				<ellipse cx="8.1" cy="1.1" rx="4.4" ry="3.4" fill="#ffe7b0" />
				<path d="M 0 -6 L 2.6 -13.2 L 4.6 -5.8 Z" fill="#e24a3d" />
				<ellipse cx="5.2" cy="-1.7" rx="1.45" ry="1.65" fill="#1a1230" />
				<ellipse cx="8.6" cy="-1.4" rx="1.2" ry="1.4" fill="#1a1230" />
				<circle cx="5.6" cy="-2.15" r="0.42" fill="#fff" />
				<circle cx="9" cy="-1.85" r="0.38" fill="#fff" />
			</g>
		</svg>
		{#key `${food.x}:${food.y}`}
			<div class="lamp food-lamp" style:left="{lampLeft}%" style:top="{lampTop}%">
				<i class="glow"></i>
				<em class="cord"></em>
				<span class="paper">
					<b class="crown"></b>
					<b class="bulb"></b>
					<i class="tail"></i>
				</span>
			</div>
		{/key}
		{#if session.eatPulse}
			{#key session.eatPulse}
				<div
					class="fx"
					style:left="{(biteAt.x + 0.5) / COLS * 100}%"
					style:top="{(biteAt.y + 0.5) / ROWS * 100}%"
				>
					<span class="flare"></span>
					<span class="ring"></span>
					{#each sparks as spark (spark.i)}
						<i style:--x={spark.x} style:--y={spark.y} style:--a={spark.a}></i>
					{/each}
				</div>
			{/key}
		{/if}
		</div>
	</div>
</div>

<style>
	.stage {
		width: min(100%, 920px);
		aspect-ratio: 18 / 14;
		max-height: 100%;
		touch-action: none;
		user-select: none;
	}

	.frame {
		position: relative;
		height: 100%;
		padding: 16px;
		border-radius: 22px;
		background:
			linear-gradient(180deg, rgba(240, 196, 92, 0.2), rgba(18, 12, 28, 0.28)),
			repeating-linear-gradient(
				135deg,
				rgba(240, 196, 92, 0.08) 0 8px,
				transparent 8px 16px
			),
			rgba(10, 8, 22, 0.94);
		border: 1px solid rgba(240, 196, 92, 0.38);
		box-shadow:
			inset 0 1px 0 rgba(255, 244, 210, 0.2),
			0 18px 40px rgba(0, 0, 0, 0.32);
	}

	.vine {
		position: absolute;
		left: 22px;
		right: 22px;
		height: 3px;
		background: linear-gradient(90deg, transparent, #f0c45c 12%, #e24a3d 50%, #f0c45c 88%, transparent);
		opacity: 0.55;
		pointer-events: none;
	}

	.vine.top {
		top: 11px;
	}

	.vine.bottom {
		bottom: 11px;
	}

	.corner {
		position: absolute;
		width: 18px;
		height: 18px;
		border: 2px solid #f0c45c;
		pointer-events: none;
	}

	.tl {
		top: 8px;
		left: 8px;
		border-right: 0;
		border-bottom: 0;
	}

	.tr {
		top: 8px;
		right: 8px;
		border-left: 0;
		border-bottom: 0;
	}

	.bl {
		bottom: 8px;
		left: 8px;
		border-right: 0;
		border-top: 0;
	}

	.br {
		bottom: 8px;
		right: 8px;
		border-left: 0;
		border-top: 0;
	}

	.peg {
		position: absolute;
		width: 10px;
		z-index: 1;
		pointer-events: none;
		animation: sway 2.8s ease-in-out infinite;
	}

	.peg.tl {
		top: 2px;
		left: 28px;
	}

	.peg.tr {
		top: 2px;
		right: 28px;
		animation-delay: -0.8s;
	}

	.peg.bl {
		bottom: 4px;
		left: 28px;
		animation-delay: -1.4s;
	}

	.peg.br {
		bottom: 4px;
		right: 28px;
		animation-delay: -2s;
	}

	.peg b {
		display: block;
		width: 9px;
		height: 12px;
		margin: 6px auto 0;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #e24a3d);
		box-shadow: 0 0 10px #f0c45c;
	}

	.play {
		position: relative;
		height: 100%;
		overflow: visible;
		isolation: isolate;
	}

	.board {
		display: block;
		position: relative;
		z-index: 0;
		width: 100%;
		height: 100%;
		border-radius: 12px;
		background:
			radial-gradient(ellipse at 50% 0%, rgba(240, 196, 92, 0.12), transparent 46%),
			linear-gradient(180deg, rgba(40, 28, 52, 0.65), rgba(12, 10, 24, 0.92));
	}

	.lamp {
		position: absolute;
		z-index: 2;
		width: calc(100% / 18 * 1.9);
		height: calc(100% / 14 * 2.35);
		translate: -50% -58%;
		pointer-events: none;
		animation: hang-in 320ms ease-out both;
	}

	.lamp .glow {
		position: absolute;
		inset: 8% -12% -8%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 210, 90, 0.55), transparent 70%);
		animation: breathe 1.8s ease-in-out infinite;
	}

	.lamp .cord {
		position: absolute;
		left: 50%;
		top: 0;
		width: 2px;
		height: 20%;
		translate: -50% 0;
		background: linear-gradient(#f0c45c, rgba(240, 196, 92, 0.2));
	}

	.lamp .paper {
		position: absolute;
		inset: 18% 10% 0;
		transform-origin: 50% 0;
		animation: wiggle 2.4s ease-in-out infinite;
	}

	.lamp .crown,
	.lamp .bulb,
	.lamp .tail {
		position: absolute;
		left: 50%;
		translate: -50% 0;
		display: block;
	}

	.lamp .crown {
		top: 0;
		width: 42%;
		height: 12%;
		border-radius: 2px;
		background: #fff1c4;
		box-shadow: 0 0 6px rgba(255, 241, 196, 0.7);
	}

	.lamp .bulb {
		top: 12%;
		width: 78%;
		height: 58%;
		border-radius: 42% 42% 38% 38%;
		background: radial-gradient(circle at 34% 28%, #fff8e4, #ffbe4a 46%, #e24a3d 88%);
		box-shadow: 0 0 16px rgba(255, 180, 70, 0.75);
	}

	.lamp .tail {
		top: 72%;
		width: 2px;
		height: 22%;
		background: #e24a3d;
		border-radius: 1px;
		transform-origin: 50% 0;
		animation: tassel 2.1s ease-in-out infinite;
	}

	.lamp .tail::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -4px;
		width: 7px;
		height: 7px;
		translate: -50% 0;
		border-radius: 50%;
		background: #e24a3d;
	}

	.fx {
		position: absolute;
		z-index: 3;
		width: calc(100% / 18 * 3.2);
		height: calc(100% / 14 * 3.2);
		translate: -50% -50%;
		pointer-events: none;
	}

	.fx .flare {
		position: absolute;
		inset: 18%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 244, 210, 0.95), rgba(255, 190, 74, 0.45) 42%, transparent 70%);
		animation: flare 480ms ease-out forwards;
	}

	.fx .ring {
		position: absolute;
		inset: 22%;
		border-radius: 50%;
		border: 2px solid rgba(255, 241, 196, 0.9);
		animation: ring 480ms ease-out forwards;
	}

	.fx i {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 11px;
		height: 3px;
		margin-left: -5px;
		margin-top: -1px;
		border-radius: 2px;
		background: #fff6d2;
		box-shadow: 0 0 8px #f0c45c;
		rotate: calc(var(--a) * 1rad);
		animation: spark 480ms ease-out forwards;
	}

	.scales {
		animation: crawl 1.1s linear infinite;
	}

	.whisker {
		opacity: 0.85;
		animation: whisk 2.4s ease-in-out infinite;
	}

	.whisker.low {
		animation-delay: -1.1s;
	}

	.ended .silk,
	.ended .ridge,
	.ended .scales,
	.ended .head {
		filter: saturate(0.35) brightness(0.72);
		animation: none;
	}

	.ended .lamp {
		animation: none;
		opacity: 0.35;
	}

	.ended .lamp .paper,
	.ended .lamp .glow,
	.ended .lamp .tail {
		animation: none;
	}

	.won .silk,
	.won .ridge,
	.won .head {
		filter: saturate(1.25) brightness(1.1);
	}

	.paused {
		filter: saturate(0.8);
	}

	@keyframes sway {
		0%,
		100% {
			rotate: -10deg;
		}
		50% {
			rotate: 10deg;
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			rotate: -6deg;
		}
		50% {
			rotate: 6deg;
		}
	}

	@keyframes tassel {
		0%,
		100% {
			rotate: -14deg;
		}
		50% {
			rotate: 14deg;
		}
	}

	@keyframes breathe {
		50% {
			opacity: 0.62;
			scale: 1.1;
		}
	}

	@keyframes hang-in {
		from {
			opacity: 0;
			scale: 0.55;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@keyframes flare {
		from {
			opacity: 1;
			scale: 0.35;
		}
		to {
			opacity: 0;
			scale: 1.7;
		}
	}

	@keyframes ring {
		from {
			opacity: 0.95;
			scale: 0.4;
		}
		to {
			opacity: 0;
			scale: 1.85;
		}
	}

	@keyframes spark {
		from {
			opacity: 1;
			transform: translate3d(0, 0, 0) scale(1);
		}
		to {
			opacity: 0;
			transform: translate3d(calc(var(--x) * 38px), calc(var(--y) * 38px), 0) scale(0.35);
		}
	}

	@keyframes crawl {
		to {
			stroke-dashoffset: -14;
		}
	}

	@keyframes whisk {
		50% {
			translate: 0 -0.6px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lamp,
		.lamp .paper,
		.lamp .glow,
		.lamp .tail,
		.peg,
		.scales,
		.whisker,
		.fx .flare,
		.fx .ring,
		.fx i {
			animation: none;
		}

		.fx {
			display: none;
		}
	}
</style>
