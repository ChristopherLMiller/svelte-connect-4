<script lang="ts">
	import { page } from '$app/state';
	import { layoutLoader } from '$lib/games/catalog';

	let { children } = $props();
	const id = $derived(page.params.game);
	const load = $derived(layoutLoader(id));

	$effect(() => {
		const root = document.documentElement;
		root.classList.add('in-game');
		return () => root.classList.remove('in-game');
	});
</script>

{#key id}
	{#if load}
		{#await load() then mod}
			{@const Layout = mod.default}
			<Layout>{@render children()}</Layout>
		{/await}
	{:else}
		{@render children()}
	{/if}
{/key}
