<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeSeedSettings, persistSeedView, seedPanel, seedView } from '../settings.svelte';

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

{#if seedPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeSeedSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="seed-settings-title">
			<p class="kicker">By the river</p>
			<h2 id="seed-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Seedkeeper hums its own kalimba tune by the water.</p>

			<div class="cols">
				<section class="col" aria-label="Board">
					<label class="row">
						<input
							type="checkbox"
							checked={seedView.trail}
							onchange={(event) => {
								seedView.trail = event.currentTarget.checked;
								persistSeedView();
							}}
						/>
						<span>
							<strong>Show where seeds will fall</strong>
							<small>Hover or hold a pit to light every pit it reaches, and see captures before you sow</small>
						</span>
					</label>
					<label class="row">
						<input
							type="checkbox"
							checked={seedView.counts}
							onchange={(event) => {
								seedView.counts = event.currentTarget.checked;
								persistSeedView();
							}}
						/>
						<span>
							<strong>Count the seeds</strong>
							<small>Carved numbers beside every pit and store</small>
						</span>
					</label>
					<div class="tip">
						<strong>Keeper's note</strong>
						<p>
							Count from a pit to your store: if the seeds match the distance exactly, the last one drops home and you sow
							again. Play those first, starting from the pit nearest your store.
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
							<small>Stone clacks that climb as you sow, and a ripple for every capture</small>
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
							<small>Kalimba, hand drum and a running brook</small>
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
							<small>A marimba echo, a reedy hum and dripping glints · with or without the music</small>
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
					closeSeedSettings();
				}}
			>
				Done
			</button>
			<p class="build">Seedkeeper · v{APP_VERSION}</p>
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
		background: rgba(4, 8, 4, 0.65);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 18px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #1c2a1a, #0f170e);
		color: #f3ecd6;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(230, 255, 190, 0.08);
		border: 1px solid rgba(184, 240, 106, 0.22);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 800;
		color: #c8f06a;
	}

	h2 {
		margin: 2px 0 0;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: 1.8rem;
	}

	.lede {
		margin: 6px 0 16px;
		color: #bdb79c;
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
		color: #bdb79c;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #f6c453;
	}

	.tip {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px dashed rgba(184, 240, 106, 0.3);
		background: rgba(184, 240, 106, 0.05);
	}

	.tip strong {
		font-family: Fraunces, Georgia, serif;
	}

	.tip p {
		margin: 4px 0 0;
		color: #d9d3b8;
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
		font-weight: 800;
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #ffd56e, #d69a22);
		color: #1c1406;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8f8b74;
	}
</style>
