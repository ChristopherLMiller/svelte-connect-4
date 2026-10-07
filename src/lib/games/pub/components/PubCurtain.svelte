<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();
</script>

{#if session.curtain}
	{@const who = session.names[session.curtain.for]}
	<div class="curtain" transition:fade={{ duration: 220 }}>
		<div class="card" in:fly={{ y: 16, duration: 300 }}>
			<p class="kicker">Pass the cards</p>
			<h2>{who}, your turn</h2>
			<p>Everyone else, look into your pint. {who}, tap when nobody can see your hand.</p>
			<button onclick={() => session.liftCurtain()}>I'm {who}, show my cards</button>
		</div>
	</div>
{/if}

<style>
	.curtain {
		position: absolute;
		inset: 0;
		z-index: 8;
		display: grid;
		place-items: center;
		padding: 20px;
		background:
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0 18px, transparent 18px 40px),
			linear-gradient(180deg, rgba(70, 18, 16, 0.96), rgba(38, 10, 9, 0.98));
	}

	.card {
		width: min(420px, 100%);
		padding: 26px 24px 22px;
		border-radius: 18px;
		text-align: center;
		background: linear-gradient(180deg, rgba(42, 28, 16, 0.95), rgba(18, 12, 7, 0.96));
		border: 1px solid rgba(224, 165, 72, 0.45);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
		color: #f4e6c8;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #e0a548;
	}

	h2 {
		margin: 6px 0 8px;
		font: 700 clamp(1.6rem, 5vw, 2.2rem) 'Playfair Display SC', Georgia, serif;
		color: #ffd48a;
	}

	p {
		margin: 0 0 18px;
		color: #d8c6a2;
		line-height: 1.5;
	}

	button {
		appearance: none;
		border: 0;
		border-radius: 999px;
		padding: 13px 24px;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		cursor: pointer;
		color: #1c1107;
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
	}
</style>
