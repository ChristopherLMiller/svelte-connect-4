<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { cartPanel, cartView, closeCartSettings, persistCartView } from '../settings.svelte';

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

{#if cartPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeCartSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="cart-settings-title">
			<p class="kicker">This study</p>
			<h2 id="cart-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Cartographer keeps its own candlelit consort.</p>

			<div class="cols">
				<section class="col" aria-label="Chart">
					<label class="row">
						<input
							type="checkbox"
							checked={cartView.warn}
							onchange={(event) => {
								cartView.warn = event.currentTarget.checked;
								persistCartView();
							}}
						/>
						<span>
							<strong>Warn before a giveaway</strong>
							<small>A small red mark on any line that would hand the other side a square</small>
						</span>
					</label>
					<div class="tip">
						<strong>Mapmaker's note</strong>
						<p>
							Late in the game every line opens a chain. Sometimes the best play is to take all but two squares of a
							chain and leave them, so your rival has to open the next one.
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
							<small>Quill scratches and the chime of a claimed square</small>
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
							<small>Lute and harpsichord in an old dorian mode</small>
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
							<small>A recorder, a soft drone and the odd candle crackle · with or without the music</small>
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
					closeCartSettings();
				}}
			>
				Done
			</button>
			<p class="build">Cartographer · v{APP_VERSION}</p>
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
		background: rgba(18, 10, 4, 0.6);
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
		background: linear-gradient(180deg, #f6ead0, #e8d3a6);
		color: #2e2014;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 248, 228, 0.9);
		border: 1px solid rgba(107, 72, 36, 0.5);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #a33a1f;
	}

	h2 {
		margin: 2px 0 0;
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.8rem;
	}

	.lede {
		margin: 6px 0 16px;
		color: #6b5238;
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.02rem;
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
		color: #6b5238;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #a33a1f;
	}

	.tip {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: 6px;
		border: 1px dashed rgba(107, 72, 36, 0.45);
		background: rgba(255, 248, 228, 0.45);
	}

	.tip strong {
		font-family: Almendra, 'EB Garamond', Georgia, serif;
	}

	.tip p {
		margin: 4px 0 0;
		font-family: 'EB Garamond', Georgia, serif;
		color: #4e3a24;
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
		font-weight: 700;
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #d0553a, #8e2a14);
		color: #fbefd6;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a6e4c;
	}
</style>
