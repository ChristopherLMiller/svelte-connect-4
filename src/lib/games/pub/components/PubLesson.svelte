<script lang="ts">
	import Rosie from './Rosie.svelte';
	import { faceUrl } from '../../kit/cards/faces';
	import { longName } from '../../kit/cards/deck';
	import { LESSONS, conceptBody } from '../lessons';
	import { VARIANT_INFO } from '../types';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	const lesson = $derived(session.lesson);
	const concept = $derived(session.concept);
	const wrap = $derived(lesson?.wrap ? LESSONS[lesson.variant].wrap : null);
	const step = $derived(lesson ? lesson.seen.length + 1 : 0);
	const body = $derived(concept && session.state ? conceptBody(concept, { s: session.state, viewer: session.viewer, names: session.names }) : (wrap?.body ?? []));

	let go = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		if ((concept || wrap) && go) go.focus({ preventScroll: true });
	});
</script>

{#if lesson && (concept || wrap)}
	<div class="veil">
		{#key concept?.id ?? 'wrap'}
			<div class="card" role="dialog" aria-modal="true" aria-labelledby="pub-lesson-title">
				<header>
					<Rosie size={52} />
					<div>
						<p class="kicker">{VARIANT_INFO[lesson.variant].title} lesson{concept ? ` · step ${step}` : ''}</p>
						<h2 id="pub-lesson-title">{concept?.title ?? wrap?.title}</h2>
					</div>
				</header>
				{#each body as line, i (i)}
					<p>{#each line.split('**') as part, j (j)}{#if j % 2}<strong>{part}</strong>{:else}{part}{/if}{/each}</p>
				{/each}
				{#if concept?.example}
					<div class="example" aria-label="Example cards">
						{#each concept.example as c (c)}
							<img src={faceUrl(c)} alt={longName(c)} />
						{/each}
					</div>
				{/if}
				<div class="actions">
					{#if concept}
						<button class="go" bind:this={go} onclick={() => session.understood()}>Got it</button>
					{:else}
						<button class="soft" onclick={() => session.endLesson(false)}>Back to the bar</button>
						<button class="go" bind:this={go} onclick={() => session.endLesson(true)}>Keep playing</button>
					{/if}
				</div>
			</div>
		{/key}
	</div>
{/if}

<style>
	.veil {
		position: absolute;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: 14px;
		box-sizing: border-box;
		background: radial-gradient(ellipse at center, rgba(8, 5, 2, 0.5), rgba(8, 5, 2, 0.72));
		border-radius: 28px;
		overflow: auto;
	}

	.card {
		width: min(520px, 100%);
		max-height: 100%;
		overflow: auto;
		box-sizing: border-box;
		padding: 18px 20px 16px;
		border-radius: 20px;
		background:
			radial-gradient(circle at 20% 0%, rgba(255, 220, 160, 0.12), transparent 60%),
			linear-gradient(180deg, #2b1c10, #170f08);
		border: 1px solid rgba(224, 165, 72, 0.5);
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 220, 160, 0.12);
		color: #f4e6c8;
		animation: pop 280ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
	}

	header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.kicker {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #8ff0e2;
	}

	h2 {
		margin: 2px 0 0;
		font: 700 1.45rem 'Playfair Display SC', Georgia, serif;
		color: #ffc46a;
		line-height: 1.1;
	}

	p {
		margin: 8px 0 0;
		font-family: Spectral, Georgia, serif;
		font-size: 1rem;
		line-height: 1.45;
	}

	.example {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin-top: 12px;
	}

	.example img {
		width: 46px;
		height: auto;
		border-radius: 4px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 14px;
	}

	button {
		appearance: none;
		border: 0;
		border-radius: 999px;
		padding: 10px 20px;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.go {
		color: #1c1107;
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
	}

	.soft {
		color: #f4e6c8;
		background: rgba(244, 230, 200, 0.08);
		box-shadow: inset 0 0 0 1px rgba(224, 165, 72, 0.4);
	}

	@keyframes pop {
		from {
			opacity: 0;
			scale: 0.94;
			translate: 0 8px;
		}
	}

	@media (max-width: 640px) {
		.card {
			padding: 14px 14px 12px;
		}

		h2 {
			font-size: 1.2rem;
		}

		p {
			font-size: 0.9rem;
		}

		.example img {
			width: 36px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			animation: none;
		}
	}
</style>
