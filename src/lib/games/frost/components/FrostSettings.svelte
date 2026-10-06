<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeFrostSettings, frostPanel, frostPrefs, persistFrostPrefs } from '../settings.svelte';

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

	function toggled() {
		primeAudio();
		syncAudio();
	}
</script>

{#if frostPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeFrostSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="frost-settings-title"
		>
			<p class="kicker">This lake</p>
			<h2 id="frost-settings-title">Settings</h2>

			<div class="cols">
				<div>
					<p class="sub">The ice</p>
					<label class="row">
						<input type="checkbox" bind:checked={frostPrefs.sure} onchange={persistFrostPrefs} />
						<span>
							<strong>Sure footing</strong>
							<small>Deal only lakes the cracks can solve without a guess. Applies from the next lake.</small>
						</span>
					</label>
					<label class="row">
						<input type="checkbox" bind:checked={frostPrefs.holdFlag} onchange={persistFrostPrefs} />
						<span>
							<strong>Hold to flag</strong>
							<small>Press and hold a tile, with a finger or the mouse, to plant a flag (or dig, in flag mode)</small>
						</span>
					</label>
				</div>

				<div>
					<p class="sub">Sound</p>
					<label class="row">
						<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={toggled} />
						<span>
							<strong>Sound</strong>
							<small>Crunching frost, glass tinkles, tip-up flags and the crack</small>
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
						<input type="checkbox" bind:checked={audioSettings.musicOn} onchange={toggled} />
						<span>
							<strong>Music</strong>
							<small>Glass bells over a soft morning pad, and the lake singing far off</small>
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
						<input type="checkbox" bind:checked={audioSettings.layersOn} onchange={toggled} />
						<span>
							<strong>Synth layers</strong>
							<small>Glass answers, a thin open-fifth swell and frost glints</small>
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
				</div>
			</div>

			<button
				class="done"
				onclick={() => {
					persistAudio();
					closeFrostSettings();
				}}
			>
				Done
			</button>
			<p class="build">Frostline · v{APP_VERSION}</p>
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
		padding: 16px;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(20, 26, 52, 0.45);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(440px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
		border-radius: 22px;
		padding: 20px 20px 16px;
		background: linear-gradient(180deg, #f8fcff, #e2eef8);
		color: #1d2b47;
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 24px 60px rgba(16, 22, 48, 0.4);
	}

	.kicker,
	.sub {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #2f7fb0;
	}

	.sub {
		margin: 14px 0 2px;
		color: #d4562f;
	}

	h2 {
		margin: 4px 0 4px;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.7rem;
	}

	.row,
	.slider {
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 10px 0;
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
		color: #4d5f7a;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #e8573a;
	}

	.done {
		appearance: none;
		width: 100%;
		margin-top: 10px;
		border: 0;
		border-radius: 999px;
		padding: 12px;
		cursor: pointer;
		font: inherit;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #ff9a6e, #e8573a);
		color: #fff8f2;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #6a7c96;
	}

	@media (min-width: 760px) {
		.panel {
			width: min(780px, 100%);
		}

		.cols {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 28px;
		}
	}

	@media (max-height: 640px) {
		.row small {
			display: none;
		}

		.row,
		.slider {
			margin: 6px 0;
		}
	}
</style>
