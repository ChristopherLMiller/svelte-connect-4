<script lang="ts">
	let {
		mood = 'play',
		heat = 0,
		kindle = 0
	}: {
		mood?: 'menu' | 'play' | 'won';
		heat?: number;
		kindle?: number;
	} = $props();

	const glints = Array.from({ length: 16 }, (_, i) => ({
		i,
		x: ((i * 29) % 100) + (i % 2),
		delay: (i * 0.41) % 5,
		dur: 7 + (i % 4),
		size: 2 + (i % 2)
	}));

	const clouds = [
		{ id: 0, y: 8, s: 1, d: 0, dur: 48 },
		{ id: 1, y: 14, s: 0.7, d: 12, dur: 62 },
		{ id: 2, y: 6, s: 0.5, d: 22, dur: 54 }
	];

	const birds = [
		{ id: 0, y: 16, d: 0, dur: 18 },
		{ id: 1, y: 22, d: 6, dur: 22 },
		{ id: 2, y: 11, d: 11, dur: 16 }
	];

	const flies = Array.from({ length: 6 }, (_, i) => ({
		id: i,
		x: 12 + ((i * 17) % 72),
		y: 36 + ((i * 13) % 28),
		d: i * 0.7,
		ox: i % 2 === 0
	}));

	const leaves = Array.from({ length: 8 }, (_, i) => ({
		id: i,
		x: 8 + ((i * 13) % 84),
		d: (i * 0.9) % 7,
		dur: 9 + (i % 4),
		ox: i % 3 === 0
	}));

	function flare(pulse: number) {
		return (node: HTMLElement) => {
			if (!pulse) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			for (const anim of node.getAnimations()) anim.cancel();
			node.animate(
				[
					{ opacity: 0.25, transform: 'scale(1)' },
					{ opacity: 0.85, transform: 'scale(1.1)' },
					{ opacity: 0.4, transform: 'scale(1)' }
				],
				{ duration: 820, easing: 'ease-out' }
			);
		};
	}
</script>

<div class={['yard', mood]} style:--heat={Math.min(1, heat / 8)} aria-hidden="true">
	<div class="sky"></div>
	<div class="clouds">
		{#each clouds as cloud (cloud.id)}
			<i
				style:top="{cloud.y}%"
				style:--s={cloud.s}
				style:--d="{cloud.d}s"
				style:--dur="{cloud.dur}s"
			></i>
		{/each}
	</div>
	<div class="sun">
		<b></b>
		<i></i>
		<span class="ray r1"></span>
		<span class="ray r2"></span>
		<span class="ray r3"></span>
	</div>
	<div class="haze"></div>
	<div class="birds">
		{#each birds as bird (bird.id)}
			<i style:top="{bird.y}%" style:--d="{bird.d}s" style:--dur="{bird.dur}s"></i>
		{/each}
	</div>
	<div class="wall west">
		<span class="niche a"></span>
		<span class="niche b"></span>
		<span class="glare"></span>
	</div>
	<div class="wall east">
		<span class="niche a"></span>
		<span class="glare"></span>
	</div>
	<div class="line">
		<span class="sheet"></span>
		<span class="sheet"></span>
		<span class="sheet"></span>
	</div>
	<div class="ware west">
		<b></b><b></b><b></b>
	</div>
	<div class="ware east">
		<b></b><b></b>
	</div>
	<div class="tree a"></div>
	<div class="tree b"></div>
	<div class="tree c"></div>
	<div class="tree d"></div>
	<div class="stack">
		<span class="flue"></span>
		<span class="smoke s1"></span>
		<span class="smoke s2"></span>
		<span class="smoke s3"></span>
	</div>
	<div class="floor"></div>
	<div class="shadows"></div>
	<div class="hearth" {@attach flare(kindle)}></div>
	<div class="flies">
		{#each flies as fly (fly.id)}
			<i
				class={fly.ox ? 'ox' : ''}
				style:left="{fly.x}%"
				style:top="{fly.y}%"
				style:--d="{fly.d}s"
			></i>
		{/each}
	</div>
	<div class="leaves">
		{#each leaves as leaf (leaf.id)}
			<i
				class={leaf.ox ? 'ox' : ''}
				style:--x="{leaf.x}%"
				style:--d="{leaf.d}s"
				style:--dur="{leaf.dur}s"
			></i>
		{/each}
	</div>
	<div class="glints">
		{#each glints as glint (glint.i)}
			<i
				style:--x="{glint.x}%"
				style:--delay="{glint.delay}s"
				style:--dur="{glint.dur}s"
				style:--size="{glint.size}px"
			></i>
		{/each}
	</div>
</div>

<style>
	.yard {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background: #efe6d6;
	}

	.sky,
	.clouds,
	.sun,
	.haze,
	.birds,
	.wall,
	.line,
	.ware,
	.tree,
	.stack,
	.floor,
	.shadows,
	.hearth,
	.flies,
	.leaves,
	.glints {
		position: absolute;
	}

	.sky {
		inset: 0;
		background:
			radial-gradient(720px 280px at 68% -6%, #fffdf6, transparent 58%),
			linear-gradient(180deg, #e7eef0 0%, #e9e2d2 42%, #d7cbb8 100%);
	}

	.won .sky {
		background:
			radial-gradient(820px 340px at 68% 0%, #fff6ea, transparent 55%),
			linear-gradient(180deg, #ead9c8 0%, #d7b8a4 55%, #c4a090 100%);
	}

	.clouds {
		inset: 0 0 55%;
	}

	.clouds i {
		position: absolute;
		left: -20%;
		width: calc(var(--s) * 180px);
		height: calc(var(--s) * 36px);
		border-radius: 40px;
		background: rgba(255, 255, 255, 0.38);
		box-shadow: 48px 8px 0 rgba(255, 255, 255, 0.22);
		animation: drift var(--dur) linear infinite;
		animation-delay: var(--d);
	}

	.sun {
		left: 68%;
		top: 6%;
		width: 180px;
		height: 180px;
		translate: -50% 0;
	}

	.sun b,
	.sun i {
		position: absolute;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
	}

	.ray {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 4px;
		height: 88px;
		translate: -50% 0;
		background: linear-gradient(180deg, rgba(255, 252, 240, 0.55), transparent);
		transform-origin: 50% 0;
		opacity: 0.35;
		animation: ray 6.4s ease-in-out infinite;
	}

	.sun b {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: radial-gradient(circle at 38% 36%, #ffffff, #fff4d2 62%, #f0d9a0 100%);
		box-shadow: 0 0 40px rgba(255, 248, 230, 0.9);
		animation: sun-hard 7s ease-in-out infinite;
		z-index: 1;
	}

	.sun i {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 252, 240, 0.55), transparent 68%);
		animation: sun-hard 7s ease-in-out infinite reverse;
	}

	.ray.r1 {
		rotate: -22deg;
	}

	.ray.r2 {
		rotate: 8deg;
		animation-delay: 0.8s;
		height: 102px;
	}

	.ray.r3 {
		rotate: 28deg;
		animation-delay: 1.6s;
	}

	.haze {
		inset: 28% 0 22%;
		background: repeating-linear-gradient(
			180deg,
			transparent 0 10px,
			rgba(255, 252, 245, 0.14) 10px 12px
		);
		opacity: 0.5;
		animation: shimmer 9s linear infinite;
	}

	.birds {
		inset: 0 0 50%;
	}

	.birds i {
		position: absolute;
		left: -8%;
		width: 16px;
		height: 7px;
		background: #2a221c;
		clip-path: polygon(0 60%, 48% 0, 52% 38%, 100% 55%, 52% 62%, 48% 100%);
		opacity: 0.55;
		animation: flock var(--dur) linear infinite;
		animation-delay: var(--d);
	}

	.wall {
		bottom: 18%;
		width: 28%;
		height: 46%;
		background:
			linear-gradient(90deg, rgba(90, 70, 50, 0.08), transparent 18%),
			linear-gradient(180deg, #f4eadc, #e2d3bf 70%, #cbbba4);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
	}

	.wall.west {
		left: 0;
		clip-path: polygon(0 12%, 100% 22%, 100% 100%, 0 100%);
	}

	.wall.east {
		right: 0;
		clip-path: polygon(0 22%, 100% 10%, 100% 100%, 0 100%);
	}

	.niche,
	.glare {
		position: absolute;
	}

	.niche {
		width: 22%;
		height: 26%;
		border-radius: 40% 40% 4px 4px;
		background: linear-gradient(180deg, rgba(61, 107, 92, 0.18), rgba(42, 34, 28, 0.22));
		box-shadow: inset 0 10px 12px rgba(42, 34, 28, 0.12);
	}

	.wall.west .niche.a {
		left: 28%;
		top: 36%;
	}

	.wall.west .niche.b {
		left: 58%;
		top: 48%;
		height: 20%;
	}

	.wall.east .niche.a {
		left: 42%;
		top: 40%;
	}

	.glare {
		inset: 0;
		background: linear-gradient(
			105deg,
			transparent 40%,
			rgba(255, 255, 255, 0.22) 50%,
			transparent 60%
		);
		background-size: 220% 100%;
		animation: wash 11s ease-in-out infinite;
	}

	.line {
		left: 4%;
		bottom: 36%;
		width: 18%;
		height: 16%;
	}

	.sheet {
		position: absolute;
		top: 0;
		width: 28%;
		height: 100%;
		background: linear-gradient(180deg, #fffdf8, #e8dcc8);
		transform-origin: 50% 0;
		animation: linen 3.6s ease-in-out infinite;
		box-shadow: 0 8px 12px rgba(70, 50, 30, 0.08);
	}

	.sheet:nth-child(1) {
		left: 8%;
	}

	.sheet:nth-child(2) {
		left: 40%;
		animation-delay: 0.5s;
		height: 86%;
	}

	.sheet:nth-child(3) {
		left: 70%;
		animation-delay: 1s;
		height: 92%;
		background: linear-gradient(180deg, #f4efe6, #d8cbb8);
	}

	.ware {
		bottom: 22%;
		width: 10%;
		height: 10%;
	}

	.ware.west {
		left: 8%;
	}

	.ware.east {
		right: 10%;
	}

	.ware b {
		position: absolute;
		bottom: 0;
		border-radius: 50% 50% 8% 8%;
		background: radial-gradient(circle at 40% 30%, #c43b4a, #9e1b2a 60%, #4a1018);
	}

	.ware.west b:nth-child(1) {
		left: 8%;
		width: 38%;
		height: 70%;
	}

	.ware.west b:nth-child(2) {
		left: 36%;
		width: 30%;
		height: 52%;
		background: radial-gradient(circle at 40% 30%, #f7f4ee, #b7c9be);
	}

	.ware.west b:nth-child(3) {
		left: 58%;
		width: 34%;
		height: 86%;
		animation: pot-gleam 3.2s ease-in-out infinite;
	}

	.ware.east b:nth-child(1) {
		left: 20%;
		width: 36%;
		height: 64%;
		background: radial-gradient(circle at 40% 30%, #f7f4ee, #b7c9be);
	}

	.ware.east b:nth-child(2) {
		left: 48%;
		width: 32%;
		height: 80%;
		animation: pot-gleam 3.2s ease-in-out infinite 0.6s;
	}

	.tree {
		bottom: 26%;
		width: 46px;
		background: #2f4a3c;
		clip-path: polygon(50% 0, 92% 100%, 8% 100%);
		opacity: 0.88;
		transform-origin: 50% 100%;
		animation: sway 5.4s ease-in-out infinite;
	}

	.tree.a {
		left: 6%;
		height: 34%;
	}

	.tree.b {
		left: 14%;
		height: 26%;
		opacity: 0.7;
		animation-delay: 0.8s;
		animation-duration: 6.2s;
	}

	.tree.c {
		right: 8%;
		height: 38%;
		animation-delay: 0.3s;
	}

	.tree.d {
		right: 16%;
		height: 22%;
		opacity: 0.72;
		animation-delay: 1.1s;
		animation-duration: 4.8s;
	}

	.stack {
		left: 78%;
		bottom: 34%;
		width: 36px;
		height: 22%;
	}

	.flue,
	.smoke {
		position: absolute;
	}

	.flue {
		left: 10px;
		bottom: 0;
		width: 16px;
		height: 100%;
		background: linear-gradient(180deg, #c9b8a4, #8a6e5a);
		border-radius: 2px 2px 0 0;
	}

	.smoke {
		left: 4px;
		bottom: 92%;
		width: 28px;
		height: 78px;
		background: radial-gradient(ellipse at 50% 80%, rgba(255, 255, 255, 0.5), transparent 70%);
		animation: smoke 4.8s ease-in-out infinite;
	}

	.smoke.s2 {
		left: 12px;
		width: 22px;
		height: 96px;
		animation-delay: 1.2s;
		opacity: 0.7;
	}

	.smoke.s3 {
		left: 0;
		width: 20px;
		height: 64px;
		animation-delay: 2.2s;
	}

	.won .smoke {
		opacity: 0.95;
		scale: 1.15;
	}

	.floor {
		left: 0;
		right: 0;
		bottom: 0;
		height: 32%;
		background:
			repeating-linear-gradient(
				90deg,
				rgba(255, 248, 236, 0.18) 0 28px,
				rgba(90, 70, 50, 0.06) 28px 56px
			),
			linear-gradient(180deg, #d8cbb8 0%, #c4b49a 100%);
	}

	.shadows {
		left: 4%;
		right: 4%;
		bottom: 18%;
		height: 12%;
		background:
			radial-gradient(ellipse at 12% 80%, rgba(47, 74, 60, 0.16), transparent 42%),
			radial-gradient(ellipse at 88% 80%, rgba(47, 74, 60, 0.14), transparent 40%);
		animation: shade 5.4s ease-in-out infinite;
	}

	.hearth {
		left: 18%;
		right: 18%;
		bottom: -12%;
		height: 28%;
		border-radius: 50%;
		background: radial-gradient(
			circle at 50% 60%,
			rgba(158, 27, 42, calc(0.12 + var(--heat) * 0.28)),
			transparent 70%
		);
		opacity: 0.7;
		animation: kindle 3.4s ease-in-out infinite;
	}

	.flies {
		inset: 0;
	}

	.flies i {
		position: absolute;
		width: 9px;
		height: 3px;
		border-radius: 2px;
		background: #3d6b5c;
		box-shadow: -5px 0 0 1px rgba(255, 255, 255, 0.45);
		opacity: 0.55;
		animation: dart 5.2s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.flies i.ox {
		background: #9e1b2a;
		box-shadow: -5px 0 0 1px rgba(244, 196, 200, 0.5);
		animation-duration: 4.4s;
	}

	.leaves {
		inset: 0;
	}

	.leaves i {
		position: absolute;
		left: var(--x);
		top: -6%;
		width: 7px;
		height: 10px;
		border-radius: 0 70% 0 70%;
		background: #2f4a3c;
		opacity: 0;
		animation: fall var(--dur) linear infinite;
		animation-delay: var(--d);
	}

	.leaves i.ox {
		background: #9e1b2a;
		width: 6px;
		height: 8px;
	}

	.glints {
		inset: 0;
	}

	.glints i {
		position: absolute;
		left: var(--x);
		bottom: 8%;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: #ffffff;
		opacity: 0;
		animation: lift var(--dur) linear infinite;
		animation-delay: var(--delay);
	}

	.menu .wall,
	.menu .line,
	.menu .ware {
		opacity: 0.98;
	}

	@keyframes sun-hard {
		0%,
		100% {
			opacity: 0.82;
			scale: 1;
		}
		50% {
			opacity: 1;
			scale: 1.04;
		}
	}

	@keyframes ray {
		0%,
		100% {
			opacity: 0.18;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes shimmer {
		from {
			translate: 0 0;
		}
		to {
			translate: 0 -12px;
		}
	}

	@keyframes drift {
		from {
			translate: -10vw 0;
		}
		to {
			translate: 120vw 6px;
		}
	}

	@keyframes flock {
		0% {
			translate: -8vw 0;
			opacity: 0;
		}
		8% {
			opacity: 0.6;
		}
		50% {
			translate: 50vw 10px;
		}
		92% {
			opacity: 0.5;
		}
		100% {
			translate: 112vw 4px;
			opacity: 0;
		}
	}

	@keyframes wash {
		from {
			background-position: 120% 0;
		}
		to {
			background-position: -20% 0;
		}
	}

	@keyframes linen {
		0%,
		100% {
			rotate: -4deg;
		}
		50% {
			rotate: 5deg;
		}
	}

	@keyframes pot-gleam {
		0%,
		100% {
			opacity: 0.85;
			scale: 1;
		}
		50% {
			opacity: 1;
			scale: 1.04;
		}
	}

	@keyframes sway {
		0%,
		100% {
			rotate: -1.8deg;
		}
		50% {
			rotate: 2.2deg;
		}
	}

	@keyframes smoke {
		0%,
		100% {
			opacity: 0.28;
			translate: 0 0;
			scale: 1;
		}
		50% {
			opacity: 0.7;
			translate: 10px -14px;
			scale: 1.16;
		}
	}

	@keyframes shade {
		0%,
		100% {
			opacity: 0.7;
			scale: 1;
		}
		50% {
			opacity: 1;
			scale: 1.04;
		}
	}

	@keyframes kindle {
		0%,
		100% {
			opacity: 0.45;
			scale: 1;
		}
		50% {
			opacity: 0.8;
			scale: 1.04;
		}
	}

	@keyframes dart {
		0%,
		100% {
			translate: 0 0;
			opacity: 0.25;
		}
		30% {
			translate: 22px -16px;
			opacity: 0.8;
		}
		58% {
			translate: -10px -6px;
			opacity: 0.45;
		}
		80% {
			translate: 14px -22px;
			opacity: 0.7;
		}
	}

	@keyframes fall {
		0% {
			translate: 0 0;
			rotate: 0deg;
			opacity: 0;
		}
		10% {
			opacity: 0.7;
		}
		100% {
			translate: 40px 110vh;
			rotate: 180deg;
			opacity: 0;
		}
	}

	@keyframes lift {
		0% {
			translate: 0 0;
			opacity: 0;
		}
		16% {
			opacity: 0.45;
		}
		100% {
			translate: 18px -90vh;
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sun b,
		.sun i,
		.ray,
		.haze,
		.clouds i,
		.birds i,
		.glare,
		.sheet,
		.tree,
		.smoke,
		.shadows,
		.hearth,
		.flies i,
		.leaves i,
		.glints i,
		.ware b {
			animation: none;
		}
	}
</style>
