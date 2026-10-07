<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { apoPanel, closeApoSettings } from '../settings.svelte';
	import { REAGENTS, valueOf } from '../types';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));
	const ladder = REAGENTS.slice(1, 12).map((r, i) => ({ ...r, tier: i + 1 }));

	function setSfx(value: number) {
		audioSettings.sfxVolume = value;
		if (value > 0) audioSettings.sfxOn = true;
		syncAudio();
	}

	function setMusic(value: number) {
		audioSettings.musicVolume = value;
		if (value > 0) audioSettings.musicOn = true;
		syncAudio();
	}
</script>

{#if apoPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeApoSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="apo-settings-title">
			<p class="kicker">This bench</p>
			<h2 id="apo-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Apothecary keeps its own glass harmonica and bubbling cellar.</p>

			<div class="cols">
				<section class="col" aria-label="Sound">
					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.sfxOn}
							onchange={() => {
								primeAudio();
								syncAudio();
							}}
						/>
						<span>
							<strong>Sound</strong>
							<small>Sloshing glass, glugs, and a chime that climbs with every rarer pour</small>
						</span>
					</label>
					<label class="slider">
						<span>SFX · {sfxPct}</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioSettings.sfxVolume}
							disabled={!audioSettings.sfxOn}
							oninput={(event) => setSfx(Number(event.currentTarget.value))}
						/>
					</label>
					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.musicOn}
							onchange={() => {
								primeAudio();
								syncAudio();
							}}
						/>
						<span>
							<strong>Music</strong>
							<small>Glass harmonica and celesta in a harmonic minor</small>
						</span>
					</label>
					<label class="slider">
						<span>Music · {musicPct}</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioSettings.musicVolume}
							disabled={!audioSettings.musicOn}
							oninput={(event) => setMusic(Number(event.currentTarget.value))}
						/>
					</label>
					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.layersOn}
							onchange={() => {
								primeAudio();
								syncAudio();
							}}
						/>
						<span>
							<strong>Synth layers</strong>
							<small>Glass answers, a dark drone and bell glints · with or without the music</small>
						</span>
					</label>
					<label class="slider">
						<span>Layers · {layersPct}</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioSettings.layersVolume}
							disabled={!audioSettings.layersOn}
							oninput={(event) => setLayersVolume(Number(event.currentTarget.value))}
						/>
					</label>
				</section>

				<section class="col" aria-label="The ladder of reagents">
					<p class="sub">The ladder</p>
					<ol class="ladder">
						{#each ladder as r (r.tier)}
							<li style:--c={r.color}><i></i><b>{valueOf(r.tier)}</b>{r.name}</li>
						{/each}
					</ol>
				</section>
			</div>

			<button
				class="done"
				onclick={() => {
					persistAudio();
					closeApoSettings();
				}}
			>
				Done
			</button>
			<p class="build">Apothecary · v{APP_VERSION}</p>
		</div>
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 24px;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(4, 6, 5, 0.65);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 14px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #1e2a24, #111915);
		color: #f1e6c8;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.65),
			inset 0 1px 0 rgba(255, 240, 200, 0.1);
		border: 1px solid rgba(214, 170, 92, 0.45);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #6fe3b0;
	}

	h2 {
		margin: 2px 0 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1.7rem;
	}

	.lede {
		margin: 6px 0 16px;
		color: #b9ad90;
		font-family: Spectral, Georgia, serif;
		font-size: 1rem;
		line-height: 1.45;
	}

	.col > :last-child {
		margin-bottom: 0;
	}

	.col + .col {
		margin-top: 14px;
	}

	@media (min-width: 760px) {
		.panel {
			width: min(780px, 100%);
		}

		.cols {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 28px;
			margin-bottom: 14px;
		}

		.col + .col {
			margin-top: 0;
		}
	}

	.row,
	.slider {
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 12px 0;
	}

	.row span,
	.slider {
		flex: 1;
		flex-direction: column;
		align-items: stretch;
		gap: 4px;
	}

	.row small {
		display: block;
		color: #b9ad90;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #e0b25c;
	}

	.sub {
		margin: 12px 0 6px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #c9a560;
	}

	.ladder {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
		font-family: Spectral, Georgia, serif;
	}

	.ladder li {
		display: grid;
		grid-template-columns: 14px 3.4em 1fr;
		align-items: center;
		gap: 8px;
		font-size: 0.92rem;
	}

	.ladder i {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 6px color-mix(in srgb, var(--c) 60%, transparent);
	}

	.ladder b {
		font-family: Cinzel, Georgia, serif;
		text-align: right;
		color: #e0b25c;
	}

	.done {
		appearance: none;
		width: 100%;
		margin-top: 8px;
		border: 0;
		border-radius: 999px;
		padding: 12px;
		cursor: pointer;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #ff5a78, #a8122f);
		color: #fff4f0;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a8070;
	}
</style>
