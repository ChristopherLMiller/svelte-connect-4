<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeZenSettings, persistZenView, zenPanel, zenView } from '../settings.svelte';
	import { SEASON_INFO, SEASONS } from '../types';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));

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

{#if zenPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeZenSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="zen-settings-title">
			<p class="kicker">At the garden gate</p>
			<h2 id="zen-settings-title">Settings</h2>
			<p class="lede">Volumes are global. The garden plays koto and shakuhachi over running water.</p>

			<div class="cols">
				<section class="col" aria-label="Garden">
					<label class="row">
						<input
							type="checkbox"
							checked={zenView.warn}
							onchange={(event) => {
								zenView.warn = event.currentTarget.checked;
								persistZenView();
							}}
						/>
						<span>
							<strong>Point out fours</strong>
							<small>A red ring where your rival would finish five, a gold ring where you would</small>
						</span>
					</label>
					<label class="row">
						<input
							type="checkbox"
							checked={zenView.ghost}
							onchange={(event) => {
								zenView.ghost = event.currentTarget.checked;
								persistZenView();
							}}
						/>
						<span>
							<strong>Ghost stone</strong>
							<small>Show a pale stone where you are pointing before you place it</small>
						</span>
					</label>
					<div class="seasons" role="radiogroup" aria-label="Season">
						{#each SEASONS as season (season)}
							<button
								role="radio"
								aria-checked={zenView.season === season}
								class:on={zenView.season === season}
								style:--hue={SEASON_INFO[season].hue}
								onclick={() => {
									zenView.season = season;
									persistZenView();
								}}
							>
								{SEASON_INFO[season].name}
							</button>
						{/each}
					</div>
					<div class="tip">
						<strong>The monk's note</strong>
						<p>
							An open three (three in a row with room on both ends) must be answered at once, or it becomes an open four that no
							single stone can stop. Make two threats with one stone and the garden is yours.
						</p>
					</div>
				</section>

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
							<small>Stones on gravel, wooden clappers for a four, the bamboo deer-scarer</small>
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
							<small>Koto, shakuhachi, singing bowls and a trickling basin</small>
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
							<small>A distant flute, a low hum and wind-bell glints · with or without the music</small>
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
			</div>

			<button
				class="done"
				onclick={() => {
					persistAudio();
					closeZenSettings();
				}}
			>
				Done
			</button>
			<p class="build">Zen Garden · v{APP_VERSION}</p>
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
		background: rgba(20, 14, 8, 0.5);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 8px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #fbf7ee, #efe6d4);
		color: #2b2622;
		box-shadow:
			0 24px 60px rgba(30, 18, 8, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(60, 40, 25, 0.22);
		border-top: 6px solid #5a3a24;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #b22a18;
	}

	h2 {
		margin: 2px 0 0;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 800;
		font-size: 1.8rem;
	}

	.lede {
		margin: 6px 0 16px;
		color: #6b5f52;
		font-size: 0.98rem;
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
		color: #6b5f52;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #c8321f;
	}

	.seasons {
		display: flex;
		gap: 6px;
		margin: 12px 0;
	}

	.seasons button {
		flex: 1;
		appearance: none;
		border: 1px solid rgba(60, 40, 25, 0.22);
		background: rgba(255, 255, 255, 0.5);
		border-radius: 999px;
		padding: 7px 10px;
		font: inherit;
		font-weight: 700;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
	}

	.seasons button.on {
		border-color: var(--hue);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--hue) 55%, transparent);
	}

	.tip {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: 6px;
		border: 1px dashed rgba(200, 50, 31, 0.35);
		background: rgba(200, 50, 31, 0.04);
	}

	.tip strong {
		font-family: 'Shippori Mincho', Georgia, serif;
	}

	.tip p {
		margin: 4px 0 0;
		color: #4a4038;
		line-height: 1.45;
	}

	.done {
		appearance: none;
		width: 100%;
		margin-top: 8px;
		border: 0;
		border-radius: 999px;
		padding: 12px;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #d8442c, #a8261a);
		color: #fff6ec;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a7d70;
	}
</style>
