<script lang="ts">
	import type { Opponent } from '../types';

	let { opponent, size = 44 }: { opponent: Opponent; size?: number } = $props();
</script>

<span class="seal" style:--hue={opponent.hue} style:width="{size}px" style:height="{size}px" aria-hidden="true">
	<svg viewBox="0 0 40 40">
		<circle cx="20" cy="20" r="18.5" class="disc" />
		<circle cx="20" cy="20" r="15.5" class="rim" />
		<g class="mark">
			{#if opponent.glyph === 'page'}
				<circle cx="20" cy="13" r="4.6" />
				<path d="M14.5 30 C15.5 24 17.5 21.5 17.5 18.5 L22.5 18.5 C22.5 21.5 24.5 24 25.5 30 Z" />
				<rect x="12" y="29" width="16" height="3.6" rx="1.4" />
			{:else if opponent.glyph === 'footman'}
				<path d="M20 6 C23 10 22.5 13.5 20 13.5 C17.5 13.5 17 10 20 6 Z" class="flame" />
				<rect x="18" y="14.5" width="4" height="12" rx="1" />
				<ellipse cx="20" cy="28" rx="7" ry="2.2" />
				<rect x="18.6" y="27" width="2.8" height="5" />
				<ellipse cx="20" cy="32.5" rx="5" ry="1.6" />
			{:else if opponent.glyph === 'wren'}
				<ellipse cx="21" cy="22" rx="8.5" ry="6" />
				<circle cx="14" cy="17.5" r="4.4" />
				<path d="M27 20 L34 11.5 L30.5 22 Z" />
				<path d="M10 17 L6.5 18.2 L10 19.4 Z" />
				<path d="M19 27.5 L18 32 M23 27.5 L22.5 32" class="line" />
				<circle cx="13.2" cy="16.6" r="0.9" class="eye" />
			{:else if opponent.glyph === 'monk'}
				<path d="M20 6 C11.5 6 9.5 15 10.5 23 L9.5 33 L30.5 33 L29.5 23 C30.5 15 28.5 6 20 6 Z" />
				<ellipse cx="20" cy="17" rx="4.8" ry="6" class="hollow" />
				<path d="M20 24 V31 M17 27 H23" class="line dark" />
			{:else if opponent.glyph === 'captain'}
				<path d="M9 31 L29 9 M11 9 L31 31" class="line thick" />
				<path d="M7 27 L13 33 M27 33 L33 27" class="line thick" />
				<circle cx="20" cy="20" r="2.4" />
			{:else if opponent.glyph === 'dowager'}
				<path d="M8 26 L12 14 L16 22 L20 9 L24 22 L28 14 L32 26 Z" />
				<rect x="8" y="26" width="24" height="4" rx="1.2" />
				<circle cx="20" cy="9" r="1.8" class="gem" />
				<circle cx="12" cy="14" r="1.4" class="gem" />
				<circle cx="28" cy="14" r="1.4" class="gem" />
			{:else if opponent.glyph === 'archivist'}
				<path d="M6 12 L20 15 L34 12 L34 29 L20 32 L6 29 Z" />
				<path d="M20 15 V32" class="line dark" />
				<path d="M9 17 L17 18.6 M9 21 L17 22.6 M9 25 L17 26.6 M23 18.6 L31 17 M23 22.6 L31 21 M23 26.6 L31 25" class="line dark thin" />
			{:else}
				<path d="M8 28 L8 14 L14 20 L20 9 L26 20 L32 14 L32 28 Z" />
				<rect x="7" y="27.5" width="26" height="4.5" rx="1.2" />
				<circle cx="20" cy="9" r="2" class="gem" />
				<circle cx="14" cy="29.7" r="1.2" class="gem red" />
				<circle cx="20" cy="29.7" r="1.2" class="gem red" />
				<circle cx="26" cy="29.7" r="1.2" class="gem red" />
			{/if}
		</g>
	</svg>
</span>

<style>
	.seal {
		display: inline-grid;
		place-items: center;
		flex-shrink: 0;
	}

	svg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
	}

	.disc {
		fill: color-mix(in srgb, var(--hue) 22%, #1a0d08);
		stroke: color-mix(in srgb, var(--hue) 75%, #f0d9a0);
		stroke-width: 1.4;
	}

	.rim {
		fill: none;
		stroke: color-mix(in srgb, var(--hue) 40%, transparent);
		stroke-width: 0.8;
		stroke-dasharray: 1.6 1.4;
	}

	.mark {
		fill: color-mix(in srgb, var(--hue) 60%, #fff2d6);
	}

	.line {
		fill: none;
		stroke: color-mix(in srgb, var(--hue) 60%, #fff2d6);
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.line.thick {
		stroke-width: 2.6;
	}

	.line.thin {
		stroke-width: 0.9;
	}

	.line.dark {
		stroke: color-mix(in srgb, var(--hue) 25%, #1a0d08);
	}

	.hollow,
	.eye {
		fill: color-mix(in srgb, var(--hue) 20%, #120804);
	}

	.flame {
		fill: #ffd27a;
	}

	.gem {
		fill: #fff2c0;
	}

	.gem.red {
		fill: #e0505a;
	}
</style>
