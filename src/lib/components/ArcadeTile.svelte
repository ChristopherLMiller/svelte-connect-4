<script lang="ts">
	import type { Snippet } from 'svelte';

	type ArcadeTone = 'space' | 'shore' | 'night' | 'ash' | 'orrery' | 'chapel' | 'reef' | 'frost' | 'ink' | 'brew' | 'moss' | 'zen' | 'beacon' | 'regal' | 'tavern';

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

	.chapel {
		--ink: #f2c46b;
		--accent: #ff8c9c;
		border: 1px solid rgba(242, 196, 107, 0.4);
		background: linear-gradient(180deg, rgba(52, 50, 62, 0.88), rgba(20, 19, 26, 0.92));
		color: #f4e8d0;
		box-shadow:
			inset 0 1px 0 rgba(255, 236, 200, 0.14),
			0 10px 28px rgba(0, 0, 0, 0.42);
		font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.chapel:hover {
			border-color: #f2c46b;
			box-shadow:
				inset 0 1px 0 rgba(255, 236, 200, 0.24),
				0 12px 32px rgba(0, 0, 0, 0.46),
				0 0 24px rgba(203, 163, 255, 0.22);
		}
	}

	.chapel .glyph {
		background: linear-gradient(180deg, #2c2a36, #121118);
		box-shadow: inset 0 0 0 1px rgba(242, 196, 107, 0.45);
	}

	.chapel .copy small {
		color: #f2c46b;
		opacity: 1;
	}

	.reef {
		--ink: #3fe9ff;
		--accent: #ff4fd8;
		border: 1px solid rgba(63, 233, 255, 0.34);
		background: linear-gradient(180deg, rgba(8, 28, 48, 0.86), rgba(2, 8, 20, 0.92));
		color: #d8f4ff;
		box-shadow:
			inset 0 1px 0 rgba(160, 240, 255, 0.12),
			0 10px 28px rgba(0, 0, 0, 0.45);
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.reef:hover {
			border-color: #3fe9ff;
			box-shadow:
				inset 0 1px 0 rgba(160, 240, 255, 0.22),
				0 12px 32px rgba(0, 0, 0, 0.5),
				0 0 24px rgba(63, 233, 255, 0.24);
		}
	}

	.reef .glyph {
		background: radial-gradient(circle at 50% 30%, #0c2c48, #020814);
		box-shadow: inset 0 0 0 1px rgba(63, 233, 255, 0.45);
	}

	.reef .copy small {
		color: #3fe9ff;
		opacity: 1;
	}

	.frost {
		--ink: #eaf7ff;
		--accent: #ff6a3d;
		border: 1px solid rgba(255, 255, 255, 0.7);
		background: linear-gradient(180deg, rgba(246, 251, 255, 0.82), rgba(214, 232, 246, 0.78));
		color: #1d2b47;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 10px 26px rgba(30, 40, 80, 0.22);
		backdrop-filter: blur(8px);
		font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.frost:hover {
			border-color: #fff;
			box-shadow:
				inset 0 1px 0 #fff,
				0 12px 30px rgba(30, 40, 80, 0.28),
				0 0 22px rgba(255, 190, 160, 0.4);
		}
	}

	.frost .glyph {
		background: linear-gradient(180deg, #2a4b72, #13253f);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
	}

	.frost .copy small {
		color: #2f7fb0;
		opacity: 1;
	}

	.ink {
		--ink: #f6e8c8;
		--accent: #c4482a;
		border: 1px solid rgba(107, 72, 36, 0.45);
		background: linear-gradient(180deg, rgba(246, 234, 208, 0.94), rgba(230, 210, 168, 0.92));
		color: #2e2014;
		box-shadow:
			inset 0 1px 0 rgba(255, 248, 228, 0.8),
			0 10px 26px rgba(10, 4, 0, 0.45);
		font-family: 'EB Garamond', Georgia, serif;
	}

	@media (hover: hover) {
		.ink:hover {
			border-color: rgba(163, 58, 31, 0.7);
			box-shadow:
				inset 0 1px 0 rgba(255, 248, 228, 0.9),
				0 12px 30px rgba(10, 4, 0, 0.5),
				0 0 24px rgba(255, 170, 80, 0.3);
		}
	}

	.ink .glyph {
		background: linear-gradient(180deg, #5a3a20, #2e1d10);
		box-shadow: inset 0 0 0 1px rgba(246, 222, 170, 0.35);
	}

	.ink .copy small {
		color: #a33a1f;
		opacity: 1;
	}

	.brew {
		--ink: #f1e6c8;
		--accent: #ff5a78;
		border: 1px solid rgba(214, 170, 92, 0.4);
		background: linear-gradient(180deg, rgba(30, 42, 36, 0.94), rgba(14, 20, 17, 0.95));
		color: #f1e6c8;
		box-shadow:
			inset 0 1px 0 rgba(255, 240, 200, 0.1),
			0 10px 26px rgba(0, 0, 0, 0.5);
		font-family: Spectral, Georgia, serif;
	}

	@media (hover: hover) {
		.brew:hover {
			border-color: #e0b25c;
			box-shadow:
				inset 0 1px 0 rgba(255, 240, 200, 0.14),
				0 12px 30px rgba(0, 0, 0, 0.55),
				0 0 24px rgba(111, 227, 176, 0.2);
		}
	}

	.brew .glyph {
		background: linear-gradient(180deg, #2a3a32, #0e1411);
		box-shadow: inset 0 0 0 1px rgba(214, 170, 92, 0.45);
	}

	.brew .copy small {
		color: #6fe3b0;
		opacity: 1;
	}

	.moss {
		--ink: #f3ecd6;
		--accent: #f6c453;
		border: 1px solid rgba(184, 240, 106, 0.28);
		background: linear-gradient(180deg, rgba(28, 40, 26, 0.92), rgba(12, 20, 12, 0.94));
		color: #f3ecd6;
		box-shadow:
			inset 0 1px 0 rgba(230, 255, 190, 0.08),
			0 10px 26px rgba(0, 0, 0, 0.5);
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.moss:hover {
			border-color: #f6c453;
			box-shadow:
				inset 0 1px 0 rgba(230, 255, 190, 0.12),
				0 12px 30px rgba(0, 0, 0, 0.55),
				0 0 24px rgba(200, 240, 106, 0.25);
		}
	}

	.moss .glyph {
		background: linear-gradient(180deg, #3a4636, #161d14);
		box-shadow: inset 0 0 0 1px rgba(184, 240, 106, 0.35);
	}

	.moss .copy small {
		color: #b8f06a;
		opacity: 1;
	}

	.zen {
		--ink: #2b2622;
		--accent: #c8321f;
		border: 1px solid rgba(60, 40, 25, 0.28);
		background: linear-gradient(180deg, rgba(252, 248, 239, 0.95), rgba(238, 229, 212, 0.95));
		color: #2b2622;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			0 10px 24px rgba(40, 25, 10, 0.25);
		font-family: 'Zen Kaku Gothic New', ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.zen:hover {
			border-color: #c8321f;
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.8),
				0 12px 28px rgba(40, 25, 10, 0.3),
				0 0 0 2px rgba(200, 50, 31, 0.18);
		}
	}

	.zen .glyph {
		background: linear-gradient(180deg, #4a3a2c, #2b2017);
		box-shadow: inset 0 0 0 1px rgba(200, 50, 31, 0.45);
	}

	.zen .copy small {
		color: #c8321f;
		opacity: 1;
	}

	.beacon {
		--ink: #f2e8d5;
		--accent: #e8b05a;
		border: 1px solid rgba(232, 176, 90, 0.32);
		background: linear-gradient(180deg, rgba(20, 34, 46, 0.94), rgba(9, 17, 24, 0.95));
		color: #f2e8d5;
		box-shadow:
			inset 0 1px 0 rgba(255, 230, 180, 0.08),
			0 10px 26px rgba(0, 0, 0, 0.5);
		font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
	}

	@media (hover: hover) {
		.beacon:hover {
			border-color: #e8b05a;
			box-shadow:
				inset 0 1px 0 rgba(255, 230, 180, 0.12),
				0 12px 30px rgba(0, 0, 0, 0.55),
				0 0 24px rgba(255, 198, 90, 0.25);
		}
	}

	.beacon .glyph {
		background: linear-gradient(180deg, #24384a, #0c161f);
		box-shadow: inset 0 0 0 1px rgba(232, 176, 90, 0.45);
	}

	.beacon .copy small {
		color: #e8b05a;
		opacity: 1;
	}

	.regal {
		--ink: #f3e7cf;
		--accent: #d9b25e;
		border: 1px solid rgba(217, 178, 94, 0.34);
		background: linear-gradient(180deg, rgba(42, 22, 16, 0.94), rgba(18, 10, 8, 0.95));
		color: #f3e7cf;
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.08),
			0 10px 26px rgba(0, 0, 0, 0.5);
		font-family: 'Cormorant Garamond', Georgia, serif;
	}

	@media (hover: hover) {
		.regal:hover {
			border-color: #d9b25e;
			box-shadow:
				inset 0 1px 0 rgba(255, 226, 170, 0.12),
				0 12px 30px rgba(0, 0, 0, 0.55),
				0 0 24px rgba(240, 190, 90, 0.25);
		}
	}

	.regal .glyph {
		background: linear-gradient(180deg, #4a2418, #1a0d08);
		box-shadow: inset 0 0 0 1px rgba(217, 178, 94, 0.45);
	}

	.regal .copy small {
		color: #d9b25e;
		opacity: 1;
	}

	.tavern {
		--ink: #f4e6c8;
		--accent: #e0a548;
		border: 1px solid rgba(224, 165, 72, 0.34);
		background: linear-gradient(180deg, rgba(46, 30, 18, 0.94), rgba(20, 13, 8, 0.95));
		color: #f4e6c8;
		box-shadow:
			inset 0 1px 0 rgba(255, 220, 160, 0.08),
			0 10px 26px rgba(0, 0, 0, 0.5);
		font-family: Spectral, Georgia, serif;
	}

	@media (hover: hover) {
		.tavern:hover {
			border-color: #e0a548;
			box-shadow:
				inset 0 1px 0 rgba(255, 220, 160, 0.12),
				0 12px 30px rgba(0, 0, 0, 0.55),
				0 0 24px rgba(255, 180, 80, 0.25);
		}
	}

	.tavern .glyph {
		background: linear-gradient(180deg, #2a4a36, #10221a);
		box-shadow: inset 0 0 0 1px rgba(224, 165, 72, 0.45);
	}

	.tavern .copy small {
		color: #e0a548;
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
