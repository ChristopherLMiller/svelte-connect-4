<script lang="ts">
	import { playPoke } from '../audio';

	let { celebrating = false }: { celebrating?: boolean } = $props();

	const glints = [12, 41, 67, 91, 28, 73];
	let bottle = $state(false);
	let hermit = $state(false);
	let wiggle = $state(false);
	let bolt = $state(false);
	let heart = $state(false);
	let relic = $state(false);

	function poke(which: 'bottle' | 'hermit' | 'star' | 'crab' | 'heart' | 'relic') {
		playPoke();
		if (which === 'bottle') {
			bottle = !bottle;
			return;
		}
		if (which === 'hermit') {
			hermit = true;
			window.setTimeout(() => (hermit = false), 1400);
			return;
		}
		if (which === 'star') {
			wiggle = true;
			window.setTimeout(() => (wiggle = false), 700);
			return;
		}
		if (which === 'crab') {
			bolt = true;
			window.setTimeout(() => (bolt = false), 1600);
			return;
		}
		if (which === 'heart') {
			heart = true;
			window.setTimeout(() => (heart = false), 900);
			return;
		}
		relic = !relic;
	}
</script>

<div class="shore" class:hot={celebrating}>
	<div class="life" aria-hidden="true">
		<div class="glare"></div>
		<div class="sheen"></div>
		<div class="haze"></div>
		<div class="ripples a"></div>
		<div class="ripples b"></div>
		<div class="gull a"></div>
		<div class="gull b"></div>
		<div class="gull c"></div>
		<div class="wood"></div>
		<div class="kelp a"></div>
		<div class="kelp b"></div>
		<div class="kelp c"></div>
		<div class="pebble a"></div>
		<div class="pebble b"></div>
		<div class="pebble c"></div>
		<div class="dollar"></div>
		<div class="flop"></div>
		<div class="stick"></div>
		<div class="hopper a"></div>
		<div class="hopper b"></div>
		<div class="hopper c"></div>
		<div class="print a"></div>
		<div class="print b"></div>
		<div class="print c"></div>
		<div class="print d"></div>
		<div class="print e"></div>
		<div class="print f"></div>
		<div class="bubble a"></div>
		<div class="bubble b"></div>
		<div class="bubble c"></div>
		<div class="shell d"></div>
		<div class="shell e"></div>
		<div class="shell f"></div>
		<div class="shell g"></div>
		{#each glints as x, i (i)}
			<span class="glint" style:--x="{x}%" style:--d="{i * 0.55}s"></span>
		{/each}
	</div>

	<button type="button" class="egg bottle" class:open={bottle} aria-label="A glass bottle in the sand" onclick={() => poke('bottle')}>
		<i></i>
		{#if bottle}
			<span class="scrap">The tide always plays last.</span>
		{/if}
	</button>

	<button type="button" class="egg star" class:wiggle aria-label="A starfish" onclick={() => poke('star')}></button>

	<button type="button" class="egg nest" class:peek={hermit} aria-label="A hermit crab in a shell" onclick={() => poke('hermit')}>
		<i class="house"></i>
		<i class="claws"></i>
	</button>

	<button type="button" class="egg crab" class:bolt aria-label="A crab on the wet sand" onclick={() => poke('crab')}></button>

	<button type="button" class="egg heart" class:beat={heart} aria-label="A heart scratched in the sand" onclick={() => poke('heart')}>
		XO
	</button>

	<button type="button" class="egg relic" class:found={relic} aria-label="A leftover game the tide missed" onclick={() => poke('relic')}>
		<svg viewBox="0 0 40 40" aria-hidden="true">
			<path d="M13 6v28 M27 6v28 M6 14h28 M6 26h28" />
			<path class="x" d="M8 8l6 6 M14 8l-6 6" />
			<path class="x" d="M22 8l6 6 M28 8l-6 6" />
			<path class="x" d="M8 20l6 6 M14 20l-6 6" />
			<path class="o" d="M30 24a4.2 4.2 0 1 1-8.4 0a4.2 4.2 0 1 1 8.4 0" />
		</svg>
		{#if relic}
			<span class="scrap small">Someone already lost this one.</span>
		{/if}
	</button>
</div>

<style>
	.shore {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		overflow: hidden;
		contain: layout paint;
		transform: translateZ(0);
	}

	.life {
		position: absolute;
		inset: 0;
	}

	.glare {
		position: absolute;
		top: 10%;
		left: 8%;
		width: 84%;
		height: 52%;
		border-radius: 50%;
		background: radial-gradient(ellipse at 42% 38%, rgba(255, 248, 226, 0.28), rgba(255, 230, 186, 0.08) 42%, transparent 74%);
		opacity: 0.7;
		mix-blend-mode: screen;
		isolation: isolate;
		transform: translateZ(0);
	}

	.sheen {
		position: absolute;
		left: 8%;
		right: 8%;
		bottom: 18vh;
		height: 18vh;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(255, 255, 255, 0.08) 40%,
			rgba(210, 236, 240, 0.16) 70%,
			transparent 100%
		);
		opacity: 0.8;
	}

	.haze {
		position: absolute;
		inset: 18% 12% 36%;
		background: radial-gradient(ellipse at 50% 40%, rgba(255, 248, 230, 0.22), transparent 70%);
		animation: breathe 9s ease-in-out infinite;
	}

	.ripples {
		position: absolute;
		border-radius: 50%;
		opacity: 0.35;
		background: repeating-linear-gradient(
			18deg,
			transparent 0 7px,
			rgba(90, 58, 36, 0.14) 7px 9px
		);
		-webkit-mask-image: radial-gradient(circle, #000 20%, transparent 72%);
		mask-image: radial-gradient(circle, #000 20%, transparent 72%);
	}

	.ripples.a {
		left: 4%;
		top: 46%;
		width: 110px;
		height: 70px;
	}

	.ripples.b {
		right: 6%;
		top: 52%;
		width: 90px;
		height: 58px;
		rotate: -12deg;
	}

	.gull {
		position: absolute;
		width: 22px;
		height: 10px;
		border-radius: 50%;
		background: rgba(58, 38, 24, 0.22);
		box-shadow:
			-9px 1px 0 -3px rgba(58, 38, 24, 0.18),
			9px 1px 0 -3px rgba(58, 38, 24, 0.18);
		opacity: 0.55;
		animation: fly 22s linear infinite;
		will-change: transform;
	}

	.gull.a {
		top: 9%;
		animation-duration: 26s;
	}

	.gull.b {
		top: 16%;
		scale: 0.7;
		animation-duration: 34s;
		animation-delay: -12s;
	}

	.gull.c {
		top: 22%;
		scale: 0.55;
		animation-duration: 41s;
		animation-delay: -22s;
	}

	.wood {
		position: absolute;
		left: 7%;
		bottom: 34vh;
		width: 74px;
		height: 14px;
		border-radius: 40px;
		rotate: -18deg;
		background: linear-gradient(90deg, #8a5a3a, #c4a07a 40%, #6e442c);
		box-shadow: inset 0 -3px 4px rgba(60, 30, 12, 0.25);
		opacity: 0.7;
	}

	.kelp {
		position: absolute;
		height: 9px;
		border-radius: 40px;
		background: linear-gradient(90deg, #5a7a42, #334d2c 70%, #6a8a4a);
		opacity: 0.58;
		transform-origin: left center;
		animation: drift 6s ease-in-out infinite;
	}

	.kelp.a {
		right: 8%;
		bottom: 28vh;
		width: 54px;
		rotate: 16deg;
	}

	.kelp.b {
		right: 11%;
		bottom: 26vh;
		width: 38px;
		rotate: -12deg;
		animation-delay: -2s;
	}

	.kelp.c {
		right: 16%;
		bottom: 29vh;
		width: 28px;
		rotate: 28deg;
		animation-delay: -3.4s;
	}

	.pebble {
		position: absolute;
		border-radius: 50%;
		background: #8a6a52;
		box-shadow: inset 0 -2px 3px rgba(40, 24, 12, 0.25);
		opacity: 0.7;
	}

	.pebble.a {
		left: 11%;
		top: 18%;
		width: 9px;
		height: 7px;
	}

	.pebble.b {
		right: 12%;
		top: 24%;
		width: 7px;
		height: 6px;
	}

	.pebble.c {
		left: 16%;
		bottom: 32vh;
		width: 11px;
		height: 8px;
		rotate: 20deg;
	}

	.dollar {
		position: absolute;
		right: 9%;
		top: 58%;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #f3ead8, #d4c09a 70%);
		box-shadow: inset 0 0 0 3px rgba(180, 150, 110, 0.35);
		opacity: 0.8;
	}

	.flop {
		position: absolute;
		right: 5%;
		bottom: 38vh;
		width: 28px;
		height: 14px;
		border-radius: 40% 60% 50% 50%;
		rotate: -28deg;
		background: #3aa0b8;
		box-shadow: inset 10px 0 0 #2b7a8c;
		opacity: 0.72;
	}

	.stick {
		position: absolute;
		left: 14%;
		top: 26%;
		width: 52px;
		height: 5px;
		border-radius: 4px;
		rotate: 38deg;
		background: linear-gradient(90deg, #6e442c, #c4a06a 55%, #8a5a3a);
		opacity: 0.7;
	}

	.hopper {
		position: absolute;
		width: 5px;
		height: 4px;
		border-radius: 50%;
		background: #4a3220;
		opacity: 0.55;
		animation: hop 2.8s ease-in-out infinite;
	}

	.hopper.a {
		left: 18%;
		bottom: 30vh;
	}

	.hopper.b {
		left: 22%;
		bottom: 33vh;
		animation-delay: -0.8s;
	}

	.hopper.c {
		right: 22%;
		bottom: 31vh;
		animation-delay: -1.6s;
	}

	.shell {
		position: absolute;
		width: 26px;
		height: 18px;
		border-radius: 70% 70% 40% 40%;
		background: radial-gradient(circle at 30% 30%, #f7efe2, #d9b08c 60%, #b07a52);
		box-shadow: inset 0 -4px 6px rgba(90, 50, 30, 0.25);
		opacity: 0.82;
	}

	.shell.d {
		top: 12%;
		left: 4%;
		rotate: 32deg;
		width: 20px;
	}

	.shell.e {
		top: 48%;
		right: 4%;
		rotate: -22deg;
	}

	.shell.f {
		bottom: 31vh;
		left: 4%;
		width: 16px;
		rotate: 8deg;
	}

	.shell.g {
		top: 20%;
		right: 8%;
		width: 14px;
		rotate: -40deg;
		background: radial-gradient(circle at 30% 30%, #f4e0d0, #c47a5a 70%);
	}

	.print {
		position: absolute;
		width: 11px;
		height: 16px;
		border-radius: 50% 50% 40% 40%;
		border: 2px solid rgba(90, 60, 40, 0.16);
		opacity: 0.4;
	}

	.print.a {
		top: 28%;
		left: 3%;
		rotate: 18deg;
	}

	.print.b {
		top: 33%;
		left: 5.5%;
		rotate: 24deg;
	}

	.print.c {
		top: 38%;
		left: 3.5%;
		rotate: 14deg;
	}

	.print.d {
		top: 62%;
		right: 7%;
		rotate: -22deg;
	}

	.print.e {
		top: 66%;
		right: 10%;
		rotate: -16deg;
	}

	.print.f {
		top: 70%;
		right: 7.5%;
		rotate: -28deg;
	}

	.bubble {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.45);
		background: rgba(255, 255, 255, 0.12);
		animation: pop 4.8s ease-in-out infinite;
	}

	.bubble.a {
		left: 24%;
		bottom: 22vh;
		width: 8px;
		height: 8px;
	}

	.bubble.b {
		left: 28%;
		bottom: 24vh;
		width: 5px;
		height: 5px;
		animation-delay: -1.4s;
	}

	.bubble.c {
		right: 26%;
		bottom: 21vh;
		width: 6px;
		height: 6px;
		animation-delay: -2.6s;
	}

	.glint {
		position: absolute;
		left: var(--x);
		bottom: 22vh;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.7);
		animation: wink 3.4s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.egg {
		appearance: none;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		pointer-events: auto;
		position: absolute;
		z-index: 4;
	}

	.bottle {
		right: 4.5%;
		top: 38%;
		width: 18px;
		height: 42px;
		rotate: 22deg;
	}

	.bottle i {
		display: block;
		width: 14px;
		height: 36px;
		margin: 0 auto;
		border-radius: 6px 6px 8px 8px;
		background:
			linear-gradient(180deg, #8fd3c8 0 8px, transparent 8px),
			linear-gradient(180deg, rgba(180, 230, 230, 0.55), rgba(40, 90, 90, 0.35));
		box-shadow: inset 2px 0 0 rgba(255, 255, 255, 0.35);
	}

	.star {
		right: 3.5%;
		top: 28%;
		width: 24px;
		height: 24px;
		background: #c47a5a;
		clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
		filter: drop-shadow(0 2px 0 rgba(90, 50, 30, 0.2));
	}

	.star.wiggle {
		animation: wiggle 0.6s ease-in-out;
	}

	.nest {
		left: 3%;
		top: 42%;
		width: 34px;
		height: 24px;
	}

	.house {
		position: absolute;
		inset: 4px 2px 0 8px;
		border-radius: 70% 70% 35% 40%;
		background: radial-gradient(circle at 30% 30%, #f7efe2, #c48a5a 62%, #8a4e2c);
		box-shadow: inset 0 -4px 6px rgba(90, 50, 30, 0.25);
	}

	.claws {
		position: absolute;
		left: 0;
		top: 8px;
		width: 10px;
		height: 8px;
		border-radius: 40%;
		background: #c45a3a;
		opacity: 0;
		translate: 8px 0;
	}

	.nest.peek .claws {
		opacity: 1;
		animation: pinch 0.7s ease-in-out 2;
	}

	.crab {
		bottom: 24vh;
		left: 8%;
		width: 22px;
		height: 12px;
		border-radius: 40%;
		background: #c45a3a;
		box-shadow:
			-10px 1px 0 -3px #c45a3a,
			10px 1px 0 -3px #c45a3a;
		animation: scuttle 18s linear infinite;
	}

	.crab.bolt {
		animation: bolt 1.5s ease-in-out;
	}

	.heart {
		left: 4%;
		top: 58%;
		rotate: -18deg;
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		color: rgba(90, 50, 30, 0.38);
		text-shadow: 0 1px 0 rgba(255, 244, 220, 0.3);
	}

	.heart.beat {
		animation: beat 0.8s ease-in-out;
		color: rgba(140, 58, 58, 0.7);
	}

	.relic {
		left: 3%;
		top: 70%;
		width: 54px;
		height: 54px;
		opacity: 0.55;
	}

	.relic svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.relic path {
		fill: none;
		stroke: #7a4f36;
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.relic.found {
		opacity: 0.9;
	}

	.scrap {
		position: absolute;
		width: max-content;
		max-width: 160px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #f4ead2;
		color: #5a3a22;
		font-size: 0.62rem;
		line-height: 1.3;
		box-shadow: 0 6px 16px rgba(60, 30, 12, 0.18);
		pointer-events: none;
		white-space: normal;
		z-index: 5;
	}

	.relic .scrap {
		left: 108%;
		top: 0;
		translate: 0 0;
		rotate: 6deg;
	}

	.bottle .scrap {
		rotate: -28deg;
		left: -8px;
		top: 0;
		translate: -100% 0;
	}

	.scrap.small {
		top: -2px;
		font-size: 0.58rem;
	}

	.hot .glare,
	.hot .sheen {
		opacity: 1;
	}

	.hot .glint {
		animation-duration: 1.4s;
	}

	@keyframes breathe {
		50% {
			opacity: 0.55;
		}
	}

	@keyframes fly {
		0% {
			translate: -8vw 0;
		}
		50% {
			translate: 60vw -18px;
		}
		100% {
			translate: 110vw 8px;
		}
	}

	@keyframes drift {
		50% {
			translate: 4px 2px;
			rotate: 8deg;
		}
	}

	@keyframes hop {
		0%,
		100% {
			translate: 0 0;
		}
		40% {
			translate: 6px -10px;
		}
		70% {
			translate: 10px 0;
		}
	}

	@keyframes scuttle {
		0% {
			left: 8%;
			rotate: 0deg;
		}
		40% {
			left: 28%;
			rotate: 8deg;
		}
		70% {
			left: 16%;
			rotate: -12deg;
		}
		100% {
			left: 8%;
			rotate: 0deg;
		}
	}

	@keyframes bolt {
		0% {
			left: 8%;
		}
		50% {
			left: 46%;
			rotate: 18deg;
		}
		100% {
			left: 8%;
		}
	}

	@keyframes wiggle {
		25% {
			rotate: -16deg;
		}
		75% {
			rotate: 18deg;
		}
	}

	@keyframes pinch {
		50% {
			translate: -2px 0;
		}
	}

	@keyframes beat {
		40% {
			scale: 1.18;
		}
	}

	@keyframes pop {
		0%,
		100% {
			opacity: 0.15;
			scale: 0.7;
		}
		50% {
			opacity: 0.7;
			scale: 1;
		}
	}

	@keyframes wink {
		0%,
		100% {
			opacity: 0.15;
			scale: 0.6;
		}
		50% {
			opacity: 0.85;
			scale: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.haze,
		.gull,
		.kelp,
		.hopper,
		.crab,
		.glint,
		.bubble {
			animation: none;
		}
	}
</style>
