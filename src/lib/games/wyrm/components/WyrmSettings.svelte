<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeWyrmSettings, wyrmPanel } from '../settings.svelte';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));

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

{#if wyrmPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeWyrmSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="wyrm-settings-title"
		>
			<p class="kicker">This market</p>
			<h2 id="wyrm-settings-title">Settings</h2>
			<p class="lede">Volumes are global. The stalls keep their own song.</p>

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
					<small>Paper lanterns, silk turns, and the stall that stops you</small>
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
					<small>Plucked night and a distant gong</small>
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

			<button
				class="done"
				onclick={() => {
					persistAudio();
					closeWyrmSettings();
				}}
			>
				Done
			</button>
			<p class="build">Lantern Wyrm · v{APP_VERSION}</p>
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
		background: rgba(8, 6, 18, 0.55);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		border-radius: 24px;
		padding: 22px 22px 18px;
		background: #16122c;
		color: #f7ead2;
		border: 1px solid rgba(240, 196, 92, 0.28);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #f0c45c;
	}

	h2 {
		margin: 4px 0 0;
		font-family: Cinzel, Palatino, serif;
		font-weight: 600;
	}

	.lede {
		margin: 8px 0 18px;
		color: #c4b08a;
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
		color: #c4b08a;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #f0c45c;
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
		background: linear-gradient(180deg, #ffe08a, #e24a3d);
		color: #1a0c12;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a7a62;
	}
</style>
