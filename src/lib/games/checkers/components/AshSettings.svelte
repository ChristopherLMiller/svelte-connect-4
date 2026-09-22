<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeAshSettings, ashPanel } from '../settings.svelte';

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

{#if ashPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeAshSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="ash-settings-title"
		>
			<p class="kicker">This yard</p>
			<h2 id="ash-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Ashcourt keeps its own noon song.</p>

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
					<small>Ceramic hops, cinderfall, and the kindling crown</small>
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
					<small>Glaze over a sunlit kiln</small>
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
					closeAshSettings();
				}}
			>
				Done
			</button>
			<p class="build">Ashcourt · v{APP_VERSION}</p>
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
		background: rgba(70, 50, 30, 0.35);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		border-radius: 24px;
		padding: 22px 22px 18px;
		background: #fffaf2;
		color: #2a221c;
		box-shadow: 0 24px 60px rgba(70, 50, 30, 0.28);
		border: 1px solid rgba(158, 27, 42, 0.22);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #9e1b2a;
	}

	h2 {
		margin: 4px 0 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
	}

	.lede {
		margin: 8px 0 18px;
		color: #5a4e42;
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
		color: #5a4e42;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #9e1b2a;
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
		background: linear-gradient(180deg, #c43b4a, #9e1b2a);
		color: #fff8f2;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a7a6c;
	}
</style>
