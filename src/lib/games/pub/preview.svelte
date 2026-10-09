<script lang="ts">
	import { backUrl, faceUrl } from '../kit/cards/faces';
	import { ACE, CLUBS, DIAMONDS, HEARTS, JACK, KING, QUEEN, SPADES, card, type Suit } from '../kit/cards/deck';
	import { PUB_BACK } from './back';

	/** A number card by its face value; ranks count from the two. */
	const pip = (suit: Suit, n: number) => card(suit, n - 2);

	/** A hearts trick in the middle, the queen of spades just dropped on it. */
	const TRICK = [
		{ c: pip(HEARTS, 9), x: 50, y: 60, r: 4 },
		{ c: pip(HEARTS, 4), x: 41, y: 47, r: -12 },
		{ c: card(SPADES, QUEEN), x: 50, y: 36, r: 9 },
		{ c: card(HEARTS, KING), x: 59, y: 47, r: 16 }
	];
	const HAND = [card(CLUBS, ACE), card(DIAMONDS, JACK), pip(SPADES, 6), pip(HEARTS, 2), pip(CLUBS, 8)];

	let faces = $state<string[]>([]);
	let hand = $state<string[]>([]);
	let back = $state('');

	$effect(() => {
		faces = TRICK.map((t) => faceUrl(t.c));
		hand = HAND.map((c) => faceUrl(c));
		back = backUrl(PUB_BACK);
	});
</script>

<div class="shot" aria-hidden="true">
	<div class="wall"></div>
	<div class="beam"></div>
	<div class="hearth"><i></i></div>
	<div class="window"></div>
	<div class="felt">
		{#if back}
			{#each [0, 1, 2] as k (k)}
				<img class="card back top" src={back} alt="" style:left="{44 + k * 6}%" style:rotate="{(k - 1) * 6 + 180}deg" />
			{/each}
			{#each [0, 1, 2] as k (k)}
				<img class="card back side" src={back} alt="" style:left="6%" style:top="{38 + k * 9}%" style:rotate="{90 + (k - 1) * 6}deg" />
				<img class="card back side" src={back} alt="" style:left="94%" style:top="{38 + k * 9}%" style:rotate="{-90 + (k - 1) * 6}deg" />
			{/each}
			{#each TRICK as t, i (i)}
				<img class="card" src={faces[i]} alt="" style:left="{t.x}%" style:top="{t.y}%" style:rotate="{t.r}deg" />
			{/each}
			{#each hand as src, i (i)}
				<img class="card mine" {src} alt="" style:left="{34 + i * 8}%" style:rotate="{(i - 2) * 7}deg" style:--lift="{Math.abs(i - 2) * 3}%" />
			{/each}
		{/if}
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: #1a0f08;
	}

	.wall {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(40% 50% at 12% 78%, rgba(255, 140, 50, 0.45), transparent 70%),
			radial-gradient(50% 40% at 50% 12%, rgba(255, 200, 120, 0.25), transparent 70%),
			linear-gradient(180deg, #2a1a0e 0%, #5a4430 18%, #4a3725 52%, #2a170a 54%, #1e1007 100%);
	}

	.beam {
		position: absolute;
		left: 0;
		right: 0;
		top: 6%;
		height: 7%;
		background: linear-gradient(180deg, #3c2412, #23140a);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
	}

	.hearth {
		position: absolute;
		left: 2%;
		bottom: 8%;
		width: 20%;
		height: 46%;
		border-radius: 50% 50% 4px 4px / 22% 22% 4px 4px;
		background: #0f0805;
		box-shadow:
			0 0 0 2cqh #5b4636,
			0 0 40px rgba(255, 120, 40, 0.4);
	}

	.hearth i {
		position: absolute;
		left: 20%;
		right: 20%;
		bottom: 6%;
		height: 46%;
		border-radius: 50% 50% 30% 30%;
		background: radial-gradient(ellipse at 50% 90%, #fff1b8, #ffb347 30%, #e2561c 60%, transparent 75%);
		filter: blur(1px);
		animation: lick 1.6s ease-in-out infinite;
	}

	.window {
		position: absolute;
		right: 3%;
		top: 20%;
		width: 16%;
		height: 34%;
		background:
			repeating-linear-gradient(56deg, transparent 0 9px, rgba(20, 20, 24, 0.9) 9px 11px),
			repeating-linear-gradient(-56deg, transparent 0 9px, rgba(20, 20, 24, 0.9) 9px 11px),
			linear-gradient(180deg, #0d1626, #1a2738);
		box-shadow: 0 0 0 1.5cqh #5b4636;
	}

	.felt {
		position: absolute;
		left: 50%;
		top: 52%;
		width: 64%;
		height: 78%;
		translate: -50% -50%;
		border-radius: 6cqh;
		background:
			radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255, 214, 140, 0.18), transparent 70%),
			radial-gradient(ellipse 120% 90% at 50% 50%, #24603f 0%, #184631 55%, #0e2b1e 100%);
		box-shadow:
			inset 0 0 0 1.6cqh #3a2414,
			inset 0 0 0 2cqh #6b4524,
			inset 0 0 40px rgba(0, 0, 0, 0.55),
			0 20px 40px rgba(0, 0, 0, 0.5);
	}

	.card {
		position: absolute;
		top: 50%;
		width: 13cqh;
		translate: -50% -50%;
		border-radius: 0.9cqh;
		box-shadow: 0 0.6cqh 1.4cqh rgba(0, 0, 0, 0.45);
	}

	.card.back.top {
		top: 12%;
		width: 10cqh;
	}

	.card.back.side {
		width: 10cqh;
	}

	.card.mine {
		top: calc(90% + var(--lift));
		width: 15cqh;
	}

	@keyframes lick {
		50% {
			scale: 1.04 0.92;
			opacity: 0.85;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hearth i {
			animation: none;
		}
	}
</style>
