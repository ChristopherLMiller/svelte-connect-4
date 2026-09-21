<script lang="ts">
	import { page } from '$app/state';
	import { pageLoader } from '$lib/games/catalog';

	const id = $derived(page.params.game);
	const load = $derived(pageLoader(id));
</script>

{#key id}
	{#if load}
		{#await load() then mod}
			{@const Page = mod.default}
			<Page />
		{/await}
	{:else}
		<main class="miss">
			<p>Cabinet offline.</p>
			<a href="/">Back to AI Arcade</a>
		</main>
	{/if}
{/key}

<style>
	.miss {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 12px;
		background: #070014;
		color: #f7f1ff;
		font-family: 'Exo 2', ui-sans-serif, system-ui, sans-serif;
	}

	a {
		color: #00f0ff;
	}
</style>
