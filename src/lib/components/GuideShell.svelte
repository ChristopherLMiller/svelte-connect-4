<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	let {
		open,
		onclose,
		tone,
		kicker,
		title = 'How to play',
		children
	}: {
		open: boolean;
		onclose: () => void;
		tone: 'shore' | 'night' | 'ash' | 'orrery' | 'chapel' | 'reef' | 'frost' | 'ink' | 'brew' | 'moss' | 'zen' | 'beacon' | 'regal' | 'tavern';
		kicker: string;
		title?: string;
		children: Snippet;
	} = $props();

	const uid = $props.id();
</script>

{#if open}
	<div class={['veil', tone]} transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={onclose} aria-label="Close how to play"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.94, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="{uid}-title"
		>
			<p class="kicker">{kicker}</p>
			<h2 id="{uid}-title">{title}</h2>
			{@render children()}
			<button class="done" onclick={onclose}>Got it</button>
		</div>
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 20px;
	}

	.shore {
		--g-bg: #fff8ec;
		--g-text: #3b2a1c;
		--g-muted: #6a5340;
		--g-accent: #1d6d86;
		--g-line: rgba(90, 64, 42, 0.2);
		--g-scrim: rgba(40, 26, 14, 0.4);
		--g-head: Fraunces, Georgia, serif;
		--g-head-style: italic;
		--g-done: linear-gradient(180deg, #f8ead8, #e0b07a);
		--g-done-ink: #2a1a12;
		--g-kbd: rgba(29, 109, 134, 0.08);
	}

	.night {
		--g-bg: rgba(16, 12, 34, 0.97);
		--g-text: #f7ead2;
		--g-muted: #c4b08a;
		--g-accent: #f0c45c;
		--g-line: rgba(240, 196, 92, 0.28);
		--g-scrim: rgba(4, 3, 12, 0.6);
		--g-head: Cinzel, Palatino, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #ffe08a, #e24a3d);
		--g-done-ink: #1a0c12;
		--g-kbd: rgba(240, 196, 92, 0.08);
	}

	.ash {
		--g-bg: #fffaf2;
		--g-text: #2a221c;
		--g-muted: #5a4e42;
		--g-accent: #9e1b2a;
		--g-line: rgba(158, 27, 42, 0.22);
		--g-scrim: rgba(70, 50, 30, 0.35);
		--g-head: 'Cormorant Garamond', Palatino, serif;
		--g-head-style: italic;
		--g-done: linear-gradient(180deg, #c43b4a, #9e1b2a);
		--g-done-ink: #fff8f2;
		--g-kbd: rgba(158, 27, 42, 0.06);
	}

	.orrery {
		--g-bg: linear-gradient(180deg, rgba(20, 22, 44, 0.97), rgba(12, 12, 28, 0.98));
		--g-text: #f1e6cf;
		--g-muted: #b9b2c8;
		--g-accent: #e8b85a;
		--g-line: rgba(232, 184, 90, 0.26);
		--g-scrim: rgba(4, 5, 14, 0.62);
		--g-head: 'Cormorant Garamond', Palatino, serif;
		--g-head-style: italic;
		--g-done: linear-gradient(180deg, #f4d58a, #c8903a);
		--g-done-ink: #1a1224;
		--g-kbd: rgba(232, 184, 90, 0.08);
	}

	.chapel {
		--g-bg: linear-gradient(180deg, rgba(36, 34, 44, 0.98), rgba(18, 17, 24, 0.98));
		--g-text: #f4e8d0;
		--g-muted: #bdb2a0;
		--g-accent: #f2c46b;
		--g-line: rgba(242, 196, 107, 0.26);
		--g-scrim: rgba(4, 4, 8, 0.62);
		--g-head: 'IM Fell English SC', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #f6d48a, #c8243c);
		--g-done-ink: #1a0c10;
		--g-kbd: rgba(242, 196, 107, 0.08);
	}

	.reef {
		--g-bg: linear-gradient(180deg, rgba(8, 26, 46, 0.97), rgba(2, 8, 20, 0.98));
		--g-text: #d8f4ff;
		--g-muted: #8fb4c8;
		--g-accent: #3fe9ff;
		--g-line: rgba(63, 233, 255, 0.24);
		--g-scrim: rgba(0, 3, 10, 0.66);
		--g-head: Syne, ui-sans-serif, system-ui, sans-serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #7ff3ff, #2a8fd8);
		--g-done-ink: #021020;
		--g-kbd: rgba(63, 233, 255, 0.08);
	}

	.frost {
		--g-bg: linear-gradient(180deg, rgba(248, 252, 255, 0.97), rgba(226, 238, 248, 0.98));
		--g-text: #1d2b47;
		--g-muted: #4d5f7a;
		--g-accent: #2f7fb0;
		--g-line: rgba(47, 127, 176, 0.22);
		--g-scrim: rgba(20, 26, 52, 0.45);
		--g-head: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #ff9a6e, #e8573a);
		--g-done-ink: #fff8f2;
		--g-kbd: rgba(47, 127, 176, 0.08);
	}

	.ink {
		--g-bg: linear-gradient(180deg, #f6ead0, #ead7ad);
		--g-text: #2e2014;
		--g-muted: #6b5238;
		--g-accent: #a33a1f;
		--g-line: rgba(107, 72, 36, 0.24);
		--g-scrim: rgba(18, 10, 4, 0.6);
		--g-head: Almendra, 'EB Garamond', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #c4482a, #8e2a14);
		--g-done-ink: #fbefd6;
		--g-kbd: rgba(107, 72, 36, 0.1);
	}

	.brew {
		--g-bg: linear-gradient(180deg, #1e2a24, #111915);
		--g-text: #f1e6c8;
		--g-muted: #b9ad90;
		--g-accent: #6fe3b0;
		--g-line: rgba(214, 170, 92, 0.26);
		--g-scrim: rgba(4, 6, 5, 0.65);
		--g-head: Cinzel, Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #ff5a78, #a8122f);
		--g-done-ink: #fff4f0;
		--g-kbd: rgba(214, 170, 92, 0.12);
	}

	.moss {
		--g-bg: linear-gradient(180deg, #1c2a1a, #0f170e);
		--g-text: #f3ecd6;
		--g-muted: #b8b49a;
		--g-accent: #b8f06a;
		--g-line: rgba(184, 240, 106, 0.2);
		--g-scrim: rgba(4, 8, 4, 0.65);
		--g-head: Fraunces, Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #ffd56e, #d69a22);
		--g-done-ink: #1c1406;
		--g-kbd: rgba(184, 240, 106, 0.1);
	}

	.zen {
		--g-bg: linear-gradient(180deg, #fbf7ee, #efe6d4);
		--g-text: #2b2622;
		--g-muted: #6b5f52;
		--g-accent: #c8321f;
		--g-line: rgba(60, 40, 25, 0.18);
		--g-scrim: rgba(20, 14, 8, 0.5);
		--g-head: 'Shippori Mincho', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #d8442c, #a8261a);
		--g-done-ink: #fff6ec;
		--g-kbd: rgba(60, 40, 25, 0.08);
	}

	.beacon {
		--g-bg: linear-gradient(180deg, #14222e, #0a121a);
		--g-text: #f2e8d5;
		--g-muted: #b3ab9a;
		--g-accent: #e8b05a;
		--g-line: rgba(232, 176, 90, 0.22);
		--g-scrim: rgba(2, 5, 9, 0.65);
		--g-head: 'IM Fell English', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #f2c26e, #c58a2c);
		--g-done-ink: #1a1206;
		--g-kbd: rgba(232, 176, 90, 0.12);
	}

	.regal {
		--g-bg: linear-gradient(180deg, #24140f, #120a08);
		--g-text: #f3e7cf;
		--g-muted: #bba88a;
		--g-accent: #d9b25e;
		--g-line: rgba(217, 178, 94, 0.22);
		--g-scrim: rgba(6, 3, 2, 0.66);
		--g-head: 'Cinzel', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #ecc874, #b8862e);
		--g-done-ink: #1c1107;
		--g-kbd: rgba(217, 178, 94, 0.12);
	}

	.tavern {
		--g-bg: linear-gradient(180deg, #2a1c12, #140d08);
		--g-text: #f4e6c8;
		--g-muted: #bfa985;
		--g-accent: #e0a548;
		--g-line: rgba(224, 165, 72, 0.22);
		--g-scrim: rgba(6, 4, 2, 0.66);
		--g-head: 'Playfair Display SC', Georgia, serif;
		--g-head-style: normal;
		--g-done: linear-gradient(180deg, #f0be66, #b97a26);
		--g-done-ink: #1c1107;
		--g-kbd: rgba(224, 165, 72, 0.12);
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: var(--g-scrim);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(820px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 26px 24px 22px;
		border-radius: 24px;
		background: var(--g-bg);
		color: var(--g-text);
		border: 1px solid var(--g-line);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
		text-align: left;
	}

	.kicker,
	.panel :global(.sub) {
		margin: 0 0 6px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: var(--g-accent);
	}

	.panel :global(.sub) {
		margin: 18px 0 8px;
	}

	h2 {
		margin: 0 0 16px;
		font-family: var(--g-head);
		font-style: var(--g-head-style);
		font-weight: 700;
		font-size: 1.8rem;
	}

	.panel :global(.goal) {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 16px;
		align-items: center;
	}

	.panel :global(.goal p) {
		margin: 0;
		line-height: 1.5;
	}

	.panel :global(.cols) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 28px;
	}

	.panel :global(ul) {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 8px;
	}

	.panel :global(li) {
		position: relative;
		padding-left: 16px;
		color: var(--g-muted);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.panel :global(li::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0.6em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--g-accent);
	}

	.panel :global(li strong),
	.panel :global(li em) {
		color: var(--g-text);
		font-style: normal;
	}

	.panel :global(dl) {
		margin: 0;
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 8px 14px;
		align-items: center;
	}

	.panel :global(dt),
	.panel :global(dd) {
		margin: 0;
	}

	.panel :global(dd) {
		color: var(--g-muted);
		font-size: 0.88rem;
	}

	.panel :global(kbd) {
		display: inline-block;
		min-width: 1.6em;
		padding: 3px 8px;
		border-radius: 8px;
		border: 1px solid var(--g-line);
		border-bottom-width: 2px;
		background: var(--g-kbd);
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-align: center;
		color: var(--g-text);
	}

	.done {
		appearance: none;
		margin-top: 22px;
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 12px 16px;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: var(--g-done);
		color: var(--g-done-ink);
	}

	@media (max-width: 700px) {
		.panel {
			width: min(480px, 100%);
		}

		.panel :global(.cols) {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 420px) {
		.panel :global(.goal) {
			grid-template-columns: 1fr;
			justify-items: center;
			text-align: center;
		}
	}
</style>
