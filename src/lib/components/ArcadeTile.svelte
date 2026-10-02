<script lang="ts">
	import type { Snippet } from 'svelte';

	type ArcadeTone = 'space' | 'shore' | 'night' | 'ash' | 'orrery';

	let {
		tone,
		size = 'chip',
		kicker,
		label,
		href,
		onclick,
		class: extra = '',
		glyph
	}: {
		tone: ArcadeTone;
		size?: 'chip' | 'banner' | 'tile';
		kicker: string;
		label: string;
		href?: string;
		onclick?: () => void;
		class?: string;
		glyph?: Snippet;
	} = $props();

	const classes = $derived(['arcade', tone, size, extra]);
</script>

{#snippet body()}
	{#if glyph}
		<span class="glyph" aria-hidden="true">{@render glyph()}</span>
	{/if}
	<span class="copy">
		<small>{kicker}</small>
		<strong>{label}</strong>
	</span>
{/snippet}

{#if href}
	<a class={classes} {href}>{@render body()}</a>
{:else}
	<button type="button" class={classes} {onclick}>{@render body()}</button>
{/if}

<style>
	.arcade {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		border-radius: 16px;
		padding: 8px 14px 8px 10px;
		flex-shrink: 0;
		cursor: pointer;
		font: inherit;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	@media (hover: hover) {
		.arcade:hover {
			transform: translateY(-1px);
		}
	}

	.glyph {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		position: relative;
		flex-shrink: 0;
	}

	.copy {
		display: grid;
		line-height: 1.05;
		text-align: left;
	}

	.copy small {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.58rem;
		opacity: 0.72;
	}

	.copy strong {
		font-size: 0.92rem;
		letter-spacing: 0.04em;
		font-weight: 800;
	}

	.banner {
		width: min(760px, 100%);
		justify-content: center;
		padding: 14px 22px;
		margin: 18px auto 0;
		border-radius: 18px;
		gap: 12px;
	}

	.tile {
		box-sizing: border-box;
		min-width: 0;
		justify-content: center;
		padding: 14px 18px;
		border-radius: 18px;
		gap: 12px;
	}

	.banner .copy strong,
	.tile .copy strong {
		font-size: 1.05rem;
	}

	.tile .copy strong {
		white-space: nowrap;
	}

	@media (max-width: 560px) {
		.tile {
			padding: 12px 10px;
			gap: 9px;
		}

		.tile .copy strong {
			font-size: 0.92rem;
		}
	}

	.space {
		--ink: #5ce1e6;
		--accent: #ff335c;
		border: 1px solid rgba(92, 225, 230, 0.55);
		background: linear-gradient(180deg, rgba(92, 225, 230, 0.16), rgba(16, 18, 36, 0.72));
		color: #f4f1ff;
		box-shadow:
			0 0 0 1px rgba(92, 225, 230, 0.12),
			0 10px 28px rgba(0, 0, 0, 0.35),
			0 0 22px rgba(92, 225, 230, 0.18);
		font-family: var(--font-display, Orbitron, sans-serif);
	}

	@media (hover: hover) {
		.space:hover {
			border-color: #5ce1e6;
			box-shadow:
				0 0 0 1px rgba(92, 225, 230, 0.35),
				0 12px 32px rgba(0, 0, 0, 0.4),
				0 0 28px rgba(92, 225, 230, 0.32);
		}
	}

	.space .glyph {
		background: #07060d;
		box-shadow: inset 0 0 0 1px rgba(92, 225, 230, 0.35);
	}

	.space .copy small {
		color: #5ce1e6;
	}

	.shore {
		--ink: #f4ead2;
		--accent: #f8ead8;
		border: 2px solid #1d6d86;
		background: rgba(255, 248, 236, 0.88);
		color: #2a1a12;
		box-shadow: 0 10px 24px rgba(62, 40, 22, 0.16);
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.shore:hover {
			background: #fffaf1;
			border-color: #15586c;
		}
	}

	.shore .glyph {
		background: #1d6d86;
	}

	.shore .copy small {
		color: #1d6d86;
		opacity: 1;
	}

	.night {
		--ink: #f0c45c;
		--accent: #e24a3d;
		border: 1px solid rgba(240, 196, 92, 0.55);
		background: linear-gradient(180deg, rgba(240, 196, 92, 0.18), rgba(12, 10, 28, 0.78));
		color: #f7ead2;
		box-shadow:
			0 0 0 1px rgba(240, 196, 92, 0.12),
			0 10px 28px rgba(0, 0, 0, 0.35),
			0 0 22px rgba(226, 74, 61, 0.18);
		font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.night:hover {
			border-color: #f0c45c;
			box-shadow:
				0 0 0 1px rgba(240, 196, 92, 0.32),
				0 12px 32px rgba(0, 0, 0, 0.4),
				0 0 28px rgba(240, 196, 92, 0.28);
		}
	}

	.night .glyph {
		background: #140e28;
		box-shadow: inset 0 0 0 1px rgba(240, 196, 92, 0.4);
	}

	.night .copy small {
		color: #f0c45c;
		opacity: 1;
	}

	.ash {
		--ink: #fff8f2;
		--accent: #fff8f2;
		border: 1px solid rgba(158, 27, 42, 0.4);
		background: linear-gradient(180deg, rgba(255, 250, 242, 0.92), rgba(232, 220, 204, 0.94));
		color: #2a221c;
		box-shadow:
			0 0 0 1px rgba(158, 27, 42, 0.08),
			0 10px 28px rgba(70, 50, 30, 0.16);
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.ash:hover {
			border-color: #9e1b2a;
			box-shadow:
				0 0 0 1px rgba(158, 27, 42, 0.18),
				0 12px 32px rgba(70, 50, 30, 0.2);
		}
	}

	.ash .glyph {
		background: #9e1b2a;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
	}

	.ash .copy small {
		color: #9e1b2a;
		opacity: 1;
	}

	.orrery {
		--ink: #f4d58a;
		--accent: #9fb8e8;
		border: 1px solid rgba(232, 184, 90, 0.5);
		background: linear-gradient(180deg, rgba(36, 34, 66, 0.86), rgba(14, 14, 32, 0.9));
		color: #f1e6cf;
		box-shadow:
			inset 0 1px 0 rgba(244, 213, 138, 0.18),
			0 10px 28px rgba(0, 0, 0, 0.38);
		font-family: Jost, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.orrery:hover {
			border-color: #e8b85a;
			box-shadow:
				inset 0 1px 0 rgba(244, 213, 138, 0.3),
				0 12px 32px rgba(0, 0, 0, 0.42),
				0 0 24px rgba(232, 184, 90, 0.22);
		}
	}

	.orrery .glyph {
		background: radial-gradient(circle at 50% 50%, #1a1838, #0b0b1c);
		box-shadow: inset 0 0 0 1px rgba(232, 184, 90, 0.5);
	}

	.orrery .copy small {
		color: #e8b85a;
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.arcade,
		.arcade:hover {
			transition: none;
			transform: none;
		}
	}
</style>
