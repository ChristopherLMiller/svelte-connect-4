<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeLightSettings, lightPanel, lightView, persistLightView } from '../settings.svelte';
	import { WEATHER_INFO, WEATHERS } from '../types';

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

{#if lightPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeLightSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="light-settings-title">
			<p class="kicker">In the lamp room</p>
			<h2 id="light-settings-title">Settings</h2>
			<p class="lede">Volumes are global. The headland plays concertina and fiddle over the surf.</p>

			<div class="cols">
				<section class="col" aria-label="Battle">
					<div class="weather" role="radiogroup" aria-label="Weather">
						{#each WEATHERS as weather (weather)}
							<button
								role="radio"
								aria-checked={lightView.weather === weather}
								class:on={lightView.weather === weather}
								style:--hue={WEATHER_INFO[weather].hue}
								onclick={() => {
									lightView.weather = weather;
									persistLightView();
								}}
							>
								<strong>{WEATHER_INFO[weather].name}</strong>
								<small>{WEATHER_INFO[weather].blurb}</small>
							</button>
						{/each}
					</div>
					<label class="row">
						<input
							type="checkbox"
							checked={lightView.chain}
							onchange={(event) => {
								lightView.chain = event.currentTarget.checked;
								persistLightView();
							}}
						/>
						<span>
							<strong>Fire again on a hit</strong>
							<small>Keep the gun while you keep hitting · applies from the next battle</small>
						</span>
					</label>
					<div class="tip">
						<strong>The keeper's note</strong>
						<p>
							The smallest hull is two squares long, so you only need to search every other square, like the dark squares of a
							chessboard. Once you hit, try the four squares around it, then follow the line.
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
							<small>Cannon, splashes, timber cracking and the foghorn</small>
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
							<small>A sea shanty in 6/8: concertina, fiddle, frame drum and a bell buoy</small>
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
							<small>A far flute, a low drone and glints of bell · with or without the music</small>
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
					closeLightSettings();
				}}
			>
				Done
			</button>
			<p class="build">Lighthouse · v{APP_VERSION}</p>
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
		background: rgba(2, 6, 10, 0.6);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 12px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #16283a, #0a1520);
		color: #f2e8d5;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 230, 180, 0.1);
		border: 1px solid rgba(232, 176, 90, 0.3);
		border-top: 4px solid #e8b05a;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #e8b05a;
	}

	h2 {
		margin: 2px 0 0;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.9rem;
	}

	.lede {
		margin: 6px 0 16px;
		color: #b3ab9a;
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
		color: #b3ab9a;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #e8b05a;
	}

	.weather {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		margin: 0 0 12px;
	}

	.weather button {
		appearance: none;
		border: 1px solid rgba(232, 176, 90, 0.2);
		background: rgba(255, 255, 255, 0.04);
		border-radius: 10px;
		padding: 8px;
		font: inherit;
		color: inherit;
		cursor: pointer;
		display: grid;
		gap: 2px;
		text-align: left;
	}

	.weather strong {
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.05rem;
		color: var(--hue);
	}

	.weather small {
		font-size: 0.72rem;
		color: #b3ab9a;
		line-height: 1.3;
	}

	.weather button.on {
		border-color: var(--hue);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--hue) 45%, transparent);
	}

	.tip {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px dashed rgba(232, 176, 90, 0.35);
		background: rgba(232, 176, 90, 0.05);
	}

	.tip strong {
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.05rem;
	}

	.tip p {
		margin: 4px 0 0;
		color: #cfc6b4;
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
		background: linear-gradient(180deg, #ffd27a, #c58a2c);
		color: #1a1206;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #7d8790;
	}
</style>
