<script lang="ts">
	import { playHallPoke } from '$lib/library/sfx';
	import { primeAudio } from '$lib/audio/prefs.svelte';

	let cat = $state(false);
	let ghost = $state(false);
	let moth = $state(false);
	let token = $state(false);
	let balloon = $state(false);
	let janitor = $state(false);

	function poke(kind: 'cat' | 'ghost' | 'moth' | 'token' | 'balloon' | 'janitor') {
		primeAudio();
		if (kind === 'cat') {
			playHallPoke('mew');
			cat = true;
			window.setTimeout(() => (cat = false), 1600);
			return;
		}
		if (kind === 'ghost') {
			playHallPoke('buzz');
			ghost = true;
			window.setTimeout(() => (ghost = false), 1800);
			return;
		}
		if (kind === 'moth') {
			playHallPoke('buzz');
			moth = true;
			window.setTimeout(() => (moth = false), 900);
			return;
		}
		if (kind === 'token') {
			playHallPoke('coin');
			token = true;
			window.setTimeout(() => (token = false), 900);
			return;
		}
		if (kind === 'balloon') {
			playHallPoke('pop');
			balloon = true;
			window.setTimeout(() => (balloon = false), 1200);
			return;
		}
		playHallPoke('soft');
		janitor = true;
		window.setTimeout(() => (janitor = false), 2200);
	}
</script>

<div class="life back">
	<span class="drone a" aria-hidden="true"></span>
	<span class="drone b" aria-hidden="true"></span>
	<span class="roach" aria-hidden="true"></span>

	<button type="button" class="egg janitor" class:wave={janitor} aria-label="A night janitor walking past the cabinets" onclick={() => poke('janitor')}>
		<i class="hat"></i>
		<i class="body"></i>
		<i class="mop"></i>
		{#if janitor}
			<span class="say">Always open.</span>
		{/if}
	</button>

	<button type="button" class="egg ghost" class:seen={ghost} aria-label="A house ghost drifting behind the machines" onclick={() => poke('ghost')}>
		<i></i>
		{#if ghost}
			<span class="say">The house thinks back.</span>
		{/if}
	</button>
</div>

<div class="life front">
	<button type="button" class="egg cat" class:sit={cat} aria-label="A hall cat prowling past the machines" onclick={() => poke('cat')}>
		<i class="ear l"></i>
		<i class="ear r"></i>
		<i class="tail"></i>
		{#if cat}
			<span class="say mew">mrrp</span>
		{/if}
	</button>

	<button type="button" class="egg token" class:hop={token} aria-label="A rolling token" onclick={() => poke('token')}></button>

	<button type="button" class="egg moth" class:scatter={moth} aria-label="A moth on the neon" onclick={() => poke('moth')}></button>

	<button type="button" class="egg balloon" class:popped={balloon} aria-label="A balloon stuck in the rafters" onclick={() => poke('balloon')}>
		<i></i>
	</button>
</div>

<style>
	.life {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.life.back {
		z-index: 1;
	}

	.life.front {
		z-index: 3;
	}

	.drone,
	.roach {
		position: absolute;
		display: block;
	}

	.egg {
		position: absolute;
	}

	.drone {
		width: 18px;
		height: 10px;
		border-radius: 6px 6px 4px 4px;
		background: #2a2038;
		box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
		animation: drone 22s linear infinite;
	}

	.drone::before,
	.drone::after {
		content: '';
		position: absolute;
		top: -3px;
		width: 10px;
		height: 3px;
		background: rgba(0, 240, 255, 0.7);
		border-radius: 2px;
	}

	.drone::before {
		left: -6px;
	}

	.drone::after {
		right: -6px;
	}

	.drone.a {
		top: 42%;
		animation-duration: 28s;
	}

	.drone.b {
		top: 58%;
		animation-direction: reverse;
		animation-duration: 34s;
		animation-delay: -12s;
		scale: 0.75;
		opacity: 0.65;
	}

	.roach {
		width: 10px;
		height: 5px;
		bottom: 16%;
		border-radius: 40%;
		background: #3a2418;
		box-shadow: 2px 0 0 #2a1810;
		animation: scurry 11s linear infinite;
	}

	.egg {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 0;
		cursor: pointer;
		pointer-events: auto;
		z-index: 3;
	}

	.egg:focus-visible {
		outline: 2px solid #00f0ff;
		outline-offset: 3px;
	}

	.janitor {
		left: 0;
		top: 46%;
		width: 34px;
		height: 58px;
		animation: cross 36s linear infinite;
		will-change: transform;
		z-index: 1;
		opacity: 0.88;
	}

	.janitor .hat,
	.janitor .body,
	.janitor .mop {
		position: absolute;
		display: block;
	}

	.janitor .hat {
		left: 8px;
		top: 0;
		width: 16px;
		height: 8px;
		border-radius: 4px 4px 0 0;
		background: #1d6d86;
	}

	.janitor .body {
		left: 9px;
		top: 8px;
		width: 14px;
		height: 28px;
		border-radius: 6px 6px 2px 2px;
		background: linear-gradient(#3a3358, #1a1428);
	}

	.janitor .body::after {
		content: '';
		position: absolute;
		left: 2px;
		bottom: -16px;
		width: 4px;
		height: 16px;
		transform-origin: 50% 0;
		background: #1a1428;
		box-shadow: 6px 0 0 #1a1428;
		animation: walk 0.5s steps(2) infinite;
	}

	.janitor .mop {
		right: -6px;
		top: 12px;
		width: 3px;
		height: 40px;
		background: #8a7048;
	}

	.janitor .mop::after {
		content: '';
		position: absolute;
		bottom: -4px;
		left: -6px;
		width: 16px;
		height: 8px;
		border-radius: 0 0 8px 8px;
		background: #c4b48a;
	}

	.janitor.wave {
		animation-play-state: paused;
	}

	.ghost {
		left: 0;
		top: 38%;
		width: 28px;
		height: 36px;
		animation: cross 44s linear infinite reverse;
		animation-delay: -18s;
		z-index: 1;
		opacity: 0.45;
		will-change: transform;
	}

	.ghost i {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 14px 14px 4px 4px;
		background: rgba(180, 220, 255, 0.55);
		box-shadow: 0 0 16px rgba(0, 240, 255, 0.35);
	}

	.ghost i::before {
		content: '';
		position: absolute;
		left: 6px;
		top: 12px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #070014;
		box-shadow: 11px 0 0 #070014;
	}

	.ghost.seen {
		opacity: 1;
		animation-play-state: paused;
	}

	.cat {
		left: 1.5%;
		top: 28%;
		width: 34px;
		height: 20px;
		border-radius: 10px 14px 8px 8px;
		background: #2a101c;
		box-shadow: 0 0 0 1px #ff2bd6, 0 0 14px rgba(255, 43, 214, 0.5);
		animation: prowls 18s ease-in-out infinite;
		z-index: 3;
		will-change: transform;
	}

	.cat::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 7px;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #00f0ff;
		box-shadow: 9px 0 0 #00f0ff, 0 0 6px #00f0ff;
	}

	.cat .ear {
		position: absolute;
		top: -6px;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0 5px 8px;
		border-color: transparent transparent #1a0c18;
	}

	.cat .ear.l {
		left: 3px;
	}

	.cat .ear.r {
		right: 6px;
	}

	.cat .tail {
		position: absolute;
		right: -10px;
		top: 4px;
		width: 12px;
		height: 3px;
		border-radius: 3px;
		background: #1a0c18;
		transform-origin: left center;
		animation: tail 0.7s ease-in-out infinite;
	}

	.cat.sit {
		animation-play-state: paused;
		border-radius: 12px;
	}

	.token {
		bottom: 11%;
		left: 0;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ffe98a, #c88814 62%, #8a5a10);
		box-shadow: 0 0 10px rgba(255, 225, 74, 0.55);
		animation: roll 14s linear infinite;
		z-index: 3;
		will-change: transform;
	}

	.token.hop {
		animation: hop 0.7s ease;
	}

	.moth {
		top: 18%;
		right: 7%;
		width: 14px;
		height: 8px;
		border-radius: 50%;
		background: #f4ead2;
		box-shadow: -5px 0 0 1px rgba(244, 234, 210, 0.55), 5px 0 0 1px rgba(244, 234, 210, 0.55);
		animation: flutter 3.4s ease-in-out infinite;
		z-index: 3;
	}

	.moth.scatter {
		animation: scatter 0.8s ease;
	}

	.balloon {
		top: 6%;
		left: 22%;
		width: 16px;
		height: 22px;
		animation: bob 7s ease-in-out infinite;
		z-index: 3;
	}

	.balloon i {
		position: relative;
		display: block;
		width: 16px;
		height: 20px;
		border-radius: 50% 50% 45% 45%;
		background: radial-gradient(circle at 30% 30%, #ff8ad8, #ff2bd6);
		box-shadow: 0 0 12px rgba(255, 43, 214, 0.45);
	}

	.balloon i::after {
		content: '';
		position: absolute;
		left: 7px;
		top: 20px;
		width: 1px;
		height: 28px;
		background: rgba(247, 241, 255, 0.4);
	}

	.balloon.popped i {
		visibility: hidden;
	}

	.balloon.popped i::after {
		height: 8px;
	}

	.say {
		position: absolute;
		left: 50%;
		bottom: 110%;
		translate: -50% 0;
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 8px;
		background: #12081f;
		color: #00f0ff;
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
		pointer-events: none;
	}

	.say.mew {
		color: #ff2bd6;
		text-transform: none;
		letter-spacing: 0.04em;
		font-size: 0.72rem;
	}

	@keyframes cross {
		0% {
			translate: -8vw 0;
		}
		100% {
			translate: 108vw 0;
		}
	}

	@keyframes drone {
		0% {
			translate: -6vw 0;
		}
		25% {
			translate: 28vw -18px;
		}
		55% {
			translate: 62vw 12px;
		}
		100% {
			translate: 110vw -8px;
		}
	}

	@keyframes scurry {
		0% {
			translate: -4vw 0;
		}
		8% {
			translate: 12vw -3px;
		}
		12% {
			translate: 18vw 0;
		}
		100% {
			translate: 110vw 0;
		}
	}

	@keyframes prowls {
		0%,
		100% {
			translate: 0 0;
		}
		22% {
			translate: 6px 38vh;
		}
		48% {
			translate: 10px 18vh;
		}
		72% {
			translate: 4px 46vh;
		}
	}

	@keyframes tail {
		50% {
			rotate: 22deg;
		}
	}

	@keyframes roll {
		0% {
			translate: -4vw 0;
			rotate: 0deg;
		}
		100% {
			translate: 108vw 0;
			rotate: 720deg;
		}
	}

	@keyframes hop {
		40% {
			translate: 0 -18px;
		}
	}

	@keyframes flutter {
		0%,
		100% {
			translate: 0 0;
		}
		40% {
			translate: -18px 10px;
		}
		70% {
			translate: 8px -14px;
		}
	}

	@keyframes scatter {
		60% {
			translate: 40px -28px;
			opacity: 0.2;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes bob {
		50% {
			translate: 10px 12px;
		}
	}

	@keyframes walk {
		50% {
			transform: scaleY(0.75);
		}
	}

	@media (max-width: 860px) {
		.janitor,
		.ghost,
		.drone,
		.roach,
		.balloon {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.janitor,
		.ghost,
		.cat,
		.token,
		.moth,
		.balloon,
		.drone,
		.roach,
		.janitor .body::after,
		.cat .tail {
			animation: none;
		}

		.janitor {
			left: 6%;
		}

		.ghost {
			right: 10%;
			left: auto;
		}

		.token {
			left: 40%;
		}
	}
</style>
