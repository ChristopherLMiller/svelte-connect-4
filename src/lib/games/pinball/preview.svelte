<script lang="ts">
	import Thumb from './components/Thumb.svelte';
	import { TABLES } from './tables';
	import type { TableId } from './types';

	const fan = (['deepsea', 'woodrail', 'dragon', 'space', 'western'] satisfies TableId[]).map((id) => TABLES[id]);
</script>

<div class="shot" aria-hidden="true">
	<div class="fan">
		{#each fan as spec, i (i)}
			<div class="cab" style:--i={i - 2} style:--rim={spec.meta.skin.accent}>
				<Thumb {spec} />
			</div>
		{/each}
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(60% 50% at 50% 100%, rgba(255, 160, 80, 0.2), transparent 70%),
			radial-gradient(40% 30% at 50% 0%, rgba(160, 120, 255, 0.18), transparent 70%),
			linear-gradient(180deg, #0c0714 0%, #1c1028 60%, #24122e 100%);
	}

	.fan {
		position: absolute;
		inset: 0;
	}

	.cab {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 90%;
		aspect-ratio: 20 / 36;
		translate: calc(-50% + var(--i) * 30cqh) calc(-50% + var(--i) * var(--i) * 3cqh);
		rotate: calc(var(--i) * 8deg);
		scale: calc(1 - var(--i) * var(--i) * 0.07);
		z-index: calc(4 - var(--i) * var(--i));
		border-radius: 1.6cqh;
		overflow: hidden;
		box-shadow:
			0 0 0 0.5cqh var(--rim),
			0 2cqh 5cqh rgba(0, 0, 0, 0.6);
	}
</style>
