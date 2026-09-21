<script lang="ts">
	let {
		tone,
		size = 'chip'
	}: {
		tone: 'space' | 'shore';
		size?: 'chip' | 'banner';
	} = $props();
</script>

<a class="exit" class:space={tone === 'space'} class:shore={tone === 'shore'} class:banner={size === 'banner'} href="/">
	<span class="glyph" aria-hidden="true">
		<i></i>
		<i></i>
		<b></b>
	</span>
	<span class="copy">
		<small>Exit</small>
		<strong>AI Arcade</strong>
	</span>
</a>

<style>
	.exit {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		border-radius: 16px;
		padding: 8px 14px 8px 10px;
		flex-shrink: 0;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.exit:hover {
		transform: translateY(-1px);
	}

	.glyph {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		position: relative;
		flex-shrink: 0;
	}

	.glyph i,
	.glyph b {
		position: absolute;
		display: block;
	}

	.glyph i:first-child,
	.glyph i:last-child {
		width: 5px;
		border-radius: 1px 1px 0 0;
		bottom: 5px;
	}

	.glyph i:first-child {
		left: 6px;
		height: 14px;
	}

	.glyph i:last-child {
		right: 6px;
		height: 11px;
	}

	.glyph b {
		left: 50%;
		top: 7px;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 5px 7px 5px 0;
		translate: -70% 0;
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

	.banner .copy strong {
		font-size: 1.05rem;
	}

	.space {
		border: 1px solid rgba(92, 225, 230, 0.55);
		background:
			linear-gradient(180deg, rgba(92, 225, 230, 0.16), rgba(16, 18, 36, 0.72));
		color: #f4f1ff;
		box-shadow:
			0 0 0 1px rgba(92, 225, 230, 0.12),
			0 10px 28px rgba(0, 0, 0, 0.35),
			0 0 22px rgba(92, 225, 230, 0.18);
		font-family: var(--font-display, Orbitron, sans-serif);
	}

	.space:hover {
		border-color: #5ce1e6;
		box-shadow:
			0 0 0 1px rgba(92, 225, 230, 0.35),
			0 12px 32px rgba(0, 0, 0, 0.4),
			0 0 28px rgba(92, 225, 230, 0.32);
	}

	.space .glyph {
		background: #07060d;
		box-shadow: inset 0 0 0 1px rgba(92, 225, 230, 0.35);
	}

	.space .glyph i {
		background: #5ce1e6;
	}

	.space .glyph b {
		border-color: transparent #ff335c transparent transparent;
	}

	.space .copy small {
		color: #5ce1e6;
	}

	.shore {
		border: 2px solid #1d6d86;
		background: rgba(255, 248, 236, 0.88);
		color: #2a1a12;
		box-shadow: 0 10px 24px rgba(62, 40, 22, 0.16);
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}

	.shore:hover {
		background: #fffaf1;
		border-color: #15586c;
	}

	.shore .glyph {
		background: #1d6d86;
	}

	.shore .glyph i {
		background: #f4ead2;
	}

	.shore .glyph b {
		border-color: transparent #f8ead8 transparent transparent;
	}

	.shore .copy small {
		color: #1d6d86;
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.exit,
		.exit:hover {
			transition: none;
			transform: none;
		}
	}
</style>
