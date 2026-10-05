<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { chapelPanel, closeChapelSettings } from '../settings.svelte';

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

{#if chapelPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeChapelSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="chapel-settings-title"
		>
			<p class="kicker">This nave</p>
			<h2 id="chapel-settings-title">Settings</h2>
			<p class="lede">Volumes are global. The vault keeps its own echo.</p>

			<label class="row">
				<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={toggled} />
				<span>
					<strong>Sound</strong>
					<small>Falling stones and glass, the oak beam, tracery and the toll for a lost light</small>
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
					<small>Rolling organ, a far choir and plainchant under the vault</small>
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
					<small>Glass answers, a reed-organ drone and bell glints · with or without the music</small>
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

			<button
				class="done"
				onclick={() => {
					persistAudio();
					closeChapelSettings();
				}}
			>
				Done
			</button>
			<p class="build">Chapel Glass · v{APP_VERSION}</p>
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
		background: rgba(4, 4, 8, 0.6);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(430px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 22px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #282632, #17161d);
		color: #f4e8d0;
		border: 1px solid rgba(242, 196, 107, 0.28);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #f2c46b;
	}

	h2 {
		margin: 4px 0 0;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: 1.7rem;
	}

	.lede {
		margin: 8px 0 18px;
		color: #c9bda8;
		line-height: 1.45;
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
		color: #c9bda8;
		font-size: 0.84rem;
	}

	.slider input,
	.row input {
		accent-color: #f2c46b;
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
		text-transform: uppercase;
		background: linear-gradient(180deg, #f6d48a, #c8243c);
		color: #1a0c10;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a8070;
	}
</style>
