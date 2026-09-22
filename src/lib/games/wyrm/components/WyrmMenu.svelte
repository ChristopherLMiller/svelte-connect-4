<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import WyrmIcon from './WyrmIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { persistWyrmPlay, wyrmBest, wyrmPlay, openWyrmSettings } from '../settings.svelte';
	import type { WyrmSession } from '../session.svelte';
	import type { Difficulty } from '../types';

	let { session }: { session: WyrmSession } = $props();
	const uid = $props.id();

	const difficulty = $derived(wyrmPlay.difficulty);
	const record = $derived(wyrmBest[difficulty]);
	const saved = $derived(peekSaved());

	const lanes: Array<{ id: Difficulty; tag: string; title: string; body: string; hue: string }> = [
		{
			id: 'easy',
			tag: 'Dusk',
			title: 'Dusk stroll',
			body: 'Wide silk, slow lanterns. Learn the stalls before the market thickens.',
			hue: 'gold'
		},
		{
			id: 'medium',
			tag: 'Night',
			title: 'Night market',
			body: 'The proper coil. Lanterns drift, the wyrm hungers, the aisles stay honest.',
			hue: 'red'
		},
		{
			id: 'hard',
			tag: 'Fever',
			title: 'Lantern fever',
			body: 'The silk runs hot. One late turn and the night swallows you.',
			hue: 'jade'
		}
	];

	const orbit = [
		{ id: 1, x: 8, y: 6, hue: 'gold', s: 0.9, d: 0 },
		{ id: 2, x: 92, y: 10, hue: 'red', s: 0.75, d: 0.8 },
		{ id: 3, x: 4, y: 58, hue: 'rose', s: 0.7, d: 1.4 },
		{ id: 4, x: 96, y: 52, hue: 'jade', s: 0.85, d: 0.4 }
	];

	function choose(next: Difficulty) {
		wyrmPlay.difficulty = next;
		session.difficulty = next;
		persistWyrmPlay();
		playSelect();
	}

	function launch() {
		playSelect();
		session.start(difficulty);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="orbit" aria-hidden="true">
		{#each orbit as lamp (lamp.id)}
			<span
				class={['float', lamp.hue]}
				style:left="{lamp.x}%"
				style:top="{lamp.y}%"
				style:--s={lamp.s}
				style:--d="{lamp.d}s"
			>
				<b></b>
				<i></i>
			</span>
		{/each}
	</div>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<svg class="coil" viewBox="0 0 220 70" aria-hidden="true">
			<defs>
				<linearGradient id="{uid}-silk" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#fff6d2" />
					<stop offset="0.5" stop-color="#f0c45c" />
					<stop offset="1" stop-color="#e24a3d" />
				</linearGradient>
			</defs>
			<path
				d="M10 48 C 34 12 52 62 78 28 C 96 8 112 8 132 22 C 154 38 164 58 210 30"
				fill="none"
				stroke="url(#{uid}-silk)"
				stroke-width="8"
				stroke-linecap="round"
			/>
		</svg>
		<WyrmIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A silk dragon in the stalls</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Lantern Wyrm</h1>
	<p class="lede">
		Steer with arrows or WASD. Swallow every lantern you can. Grow. The stalls do not yield, and neither
		does your own tail.
	</p>

	<div class="modes">
		{#each lanes as lane (lane.id)}
			<button class={['card', lane.hue]} class:on={difficulty === lane.id} onclick={() => choose(lane.id)}>
				<span class="lamp" aria-hidden="true"><b></b></span>
				<span class="tag">{lane.tag}</span>
				<strong>{lane.title}</strong>
				<small>{lane.body}</small>
			</button>
		{/each}
	</div>

	<p class="ledger">
		Best on this night
		<strong>{record} lanterns</strong>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the coil</button>
		{/if}
		<button class="go" onclick={launch}>Enter the market</button>
		<button class="ghost" onclick={() => openWyrmSettings()}>Settings</button>
	</div>
	<ArcadeExit tone="night" size="banner" />
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(860px, 100%);
		text-align: center;
		color: #f7ead2;
		padding-bottom: 4vh;
	}

	.orbit {
		position: absolute;
		inset: -8% -4% auto;
		height: 70%;
		pointer-events: none;
	}

	.float {
		position: absolute;
		width: 16px;
		translate: -50% 0;
		scale: var(--s);
		animation: drift 5.6s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.float b {
		display: block;
		width: 14px;
		height: 18px;
		border-radius: 40% 40% 36% 36%;
		box-shadow: 0 0 16px currentColor;
	}

	.float i {
		display: block;
		width: 1px;
		height: 8px;
		margin: 0 auto;
		background: currentColor;
	}

	.gold {
		color: #f0c45c;
	}

	.gold b,
	.card.gold .lamp b {
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #c4892a);
	}

	.red {
		color: #e24a3d;
	}

	.red b,
	.card.red .lamp b {
		background: radial-gradient(circle at 35% 30%, #ffd0c4, #e24a3d 58%, #8a1820);
	}

	.jade {
		color: #7dffc2;
	}

	.jade b,
	.card.jade .lamp b {
		background: radial-gradient(circle at 35% 30%, #e8fff4, #7dffc2 58%, #1f8a68);
	}

	.rose {
		color: #ff9bb8;
	}

	.rose b {
		background: radial-gradient(circle at 35% 30%, #ffe4ee, #ff9bb8 58%, #c45a78);
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 10px;
		position: relative;
	}

	.coil {
		position: absolute;
		width: min(320px, 80%);
		opacity: 0.55;
		filter: drop-shadow(0 0 12px rgba(240, 196, 92, 0.4));
		animation: coil 6s ease-in-out infinite;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #f0c45c;
	}

	h1 {
		margin: 8px 0 0;
		font-family: Cinzel, Palatino, serif;
		font-weight: 600;
		font-size: clamp(2.4rem, 7vw, 4.2rem);
		letter-spacing: 0.02em;
		line-height: 0.95;
		background: linear-gradient(90deg, #fff6d2, #f0c45c, #e24a3d, #f0c45c, #fff6d2);
		background-size: 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: shimmer 7s linear infinite;
		filter: drop-shadow(0 8px 18px rgba(226, 74, 61, 0.28));
	}

	.lede {
		margin: 14px auto 0;
		max-width: 32rem;
		color: #c4b08a;
		line-height: 1.5;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 28px;
	}

	.card,
	.go,
	.ghost {
		appearance: none;
		border: 1px solid rgba(240, 196, 92, 0.22);
		background: rgba(12, 10, 28, 0.48);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		text-align: left;
		border-radius: 18px;
		padding: 16px 18px 18px;
		backdrop-filter: blur(8px);
		overflow: hidden;
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card .lamp {
		position: absolute;
		top: 10px;
		right: 12px;
		width: 12px;
		animation: sway 3s ease-in-out infinite;
	}

	.card .lamp b {
		display: block;
		width: 11px;
		height: 14px;
		border-radius: 40% 40% 36% 36%;
		box-shadow: 0 0 12px currentColor;
	}

	.card.on {
		border-color: rgba(240, 196, 92, 0.7);
		background: rgba(24, 16, 40, 0.82);
		box-shadow: 0 10px 28px rgba(226, 74, 61, 0.16);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #e24a3d;
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-family: Cinzel, Palatino, serif;
		font-size: 1.12rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #c4b08a;
		line-height: 1.4;
	}

	.ledger {
		margin: 22px 0 0;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #c4b08a;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1.15rem;
		letter-spacing: 0;
		text-transform: none;
		color: #ffd97a;
		font-family: Cinzel, Palatino, serif;
	}

	.cta {
		margin-top: 22px;
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.go,
	.ghost {
		border-radius: 999px;
		padding: 14px 28px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #ffe08a, #e24a3d);
		color: #1a0c12;
		box-shadow:
			0 10px 24px rgba(226, 74, 61, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.ghost {
		padding: 14px 22px;
		background: rgba(12, 10, 28, 0.48);
	}

	.go:hover,
	.ghost:hover,
	.card:hover {
		transform: translateY(-2px);
	}

	@keyframes drift {
		0%,
		100% {
			translate: -50% 0;
		}
		50% {
			translate: calc(-50% + 8px) -10px;
		}
	}

	@keyframes coil {
		50% {
			opacity: 0.85;
			filter: drop-shadow(0 0 18px rgba(240, 196, 92, 0.65));
		}
	}

	@keyframes shimmer {
		to {
			background-position: -220% 0;
		}
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

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}

		.float,
		.coil,
		h1,
		.card .lamp {
			animation: none;
		}

		h1 {
			color: #f7ead2;
			background: none;
		}
	}

	@media (max-width: 760px) {
		.modes {
			grid-template-columns: 1fr;
		}
	}
</style>
