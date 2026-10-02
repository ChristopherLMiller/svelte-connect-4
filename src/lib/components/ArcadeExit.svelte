<script lang="ts">
	import ArcadeTile from './ArcadeTile.svelte';

	let {
		tone,
		size = 'chip'
	}: {
		tone: 'space' | 'shore' | 'night' | 'ash' | 'orrery';
		size?: 'chip' | 'banner' | 'tile';
	} = $props();
</script>

<ArcadeTile {tone} {size} kicker="Exit" label="AI Arcade" href="/" class="exit">
	{#snippet glyph()}
		<i class="bar left"></i>
		<i class="bar right"></i>
		<b class="arrow"></b>
	{/snippet}
</ArcadeTile>

<style>
	.bar,
	.arrow {
		position: absolute;
		display: block;
	}

	.bar {
		width: 5px;
		border-radius: 1px 1px 0 0;
		bottom: 5px;
		background: var(--ink);
	}

	.left {
		left: 6px;
		height: 14px;
	}

	.right {
		right: 6px;
		height: 11px;
	}

	.arrow {
		left: 50%;
		top: 7px;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 5px 7px 5px 0;
		border-color: transparent var(--accent) transparent transparent;
		translate: -70% 0;
	}
</style>
