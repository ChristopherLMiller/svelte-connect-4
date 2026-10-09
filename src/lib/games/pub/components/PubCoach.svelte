<script lang="ts">
	import Rosie from './Rosie.svelte';
	import { TIPS } from '../coach/tips';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	let tick = $state(0);

	$effect(() => {
		const id = setInterval(() => tick++, 15000);
		return () => clearInterval(id);
	});

	const tips = $derived(TIPS[session.variant]);
	const tip = $derived(tips[(tick + (session.state?.handNo ?? 0)) % tips.length]);
	$effect(() => {
		if (session.myTurn && !session.advice) session.ensureAdvice();
	});

	const advice = $derived(session.myTurn ? session.advice : null);
	const looking = $derived(session.myTurn && !session.advice);
</script>

<aside class="coach" class:turn={session.myTurn} aria-live="polite" aria-label="Rosie, your coach">
	<Rosie />
	<div class="text">
		{#if session.note}
			<p class="note"><b>About that last move:</b> {session.note}</p>
		{/if}
		{#if advice}
			{#key advice}
				<p class="title">{advice.title}</p>
				<p class="why">{advice.why}</p>
			{/key}
		{:else if looking}
			<p class="title muted">Let me have a look<span class="dots"><i></i><i></i><i></i></span></p>
		{:else if !session.note}
			{#key tip}
				<p class="why tip"><b>Rosie:</b> {tip}</p>
			{/key}
		{/if}
	</div>
	{#if !session.lesson}
		<button class="hide" onclick={() => session.toggleCoach()} aria-label="Turn the coach off">Hide</button>
	{/if}
</aside>

<style>
	.coach {
		width: min(980px, 100%);
		margin: 0 auto;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px 8px 10px;
		border-radius: 18px;
		background: linear-gradient(180deg, rgba(22, 38, 36, 0.9), rgba(12, 20, 19, 0.92));
		border: 1px solid rgba(80, 230, 215, 0.22);
		color: #e8f4ee;
		transition:
			border-color 240ms ease,
			box-shadow 240ms ease;
	}

	.coach.turn {
		border-color: rgba(80, 230, 215, 0.6);
		box-shadow: 0 0 22px rgba(80, 230, 215, 0.14);
	}

	.text {
		flex: 1 1 auto;
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	p {
		margin: 0;
		animation: rise 260ms ease both;
	}

	.title {
		font: 700 1rem Spectral, Georgia, serif;
		color: #8ff0e2;
	}

	.why {
		font-size: 0.88rem;
		line-height: 1.38;
		color: #d6e6df;
	}

	.tip {
		color: #b5c9c1;
	}

	.tip b {
		color: #8ff0e2;
	}

	.note {
		font-size: 0.86rem;
		line-height: 1.35;
		color: #ffd9a0;
	}

	.note b {
		color: #ffc46a;
	}

	.muted {
		color: #9fbdb4;
	}

	.dots {
		display: inline-flex;
		gap: 3px;
		margin-left: 6px;
	}

	.dots i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: currentColor;
		animation: blink 1s ease-in-out infinite;
	}

	.dots i:nth-child(2) {
		animation-delay: 0.15s;
	}

	.dots i:nth-child(3) {
		animation-delay: 0.3s;
	}

	.hide {
		appearance: none;
		flex: none;
		align-self: flex-start;
		border: 1px solid rgba(80, 230, 215, 0.3);
		border-radius: 999px;
		padding: 5px 12px;
		font: inherit;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #9fdcd2;
		background: transparent;
		cursor: pointer;
	}

	@keyframes rise {
		from {
			opacity: 0;
			translate: 0 4px;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.25;
		}
	}

	@media (max-width: 640px) {
		.coach {
			gap: 8px;
			padding: 6px 8px;
			border-radius: 14px;
		}

		.coach :global(.rosie) {
			width: 34px;
			height: 34px;
		}

		.title {
			font-size: 0.9rem;
		}

		.why,
		.note {
			font-size: 0.78rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		p,
		.dots i {
			animation: none;
		}
	}
</style>
