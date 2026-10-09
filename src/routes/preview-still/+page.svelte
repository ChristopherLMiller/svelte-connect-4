<script lang="ts">
	import { page } from '$app/state';
	import { LIBRARY_GAMES, takePreview } from '$lib/games/catalog';

	const requested = $derived(page.url.searchParams.get('game'));
	const games = $derived(
		requested ? LIBRARY_GAMES.filter((game) => game.id === requested) : LIBRARY_GAMES
	);
	const cells = $derived(games.map((game) => ({ id: game.id, pending: takePreview(game) })));

	let ready = $state(0);

	function markReady() {
		ready += 1;
		return () => {
			ready -= 1;
		};
	}
</script>

<svelte:head>
	<style>
		html,
		body {
			margin: 0;
			overflow: hidden;
			background: #070014;
		}
	</style>
</svelte:head>

<div class="sheet" data-ready={ready} data-total={games.length}>
	{#each cells as cell (cell.id)}
		<section class="cell" data-id={cell.id}>
			{#await cell.pending then Preview}
				<div class="fit" {@attach markReady}>
					<Preview />
				</div>
			{/await}
		</section>
	{/each}
</div>

<style>
	:global(.fps) {
		display: none !important;
	}

	.sheet {
		width: 960px;
	}

	.cell {
		width: 960px;
		height: 720px;
		overflow: hidden;
		background: #070014;
	}

	.fit {
		width: 100%;
		height: 100%;
		container-type: size;
	}

	.fit > :global(:first-child) {
		height: 100%;
	}
</style>
