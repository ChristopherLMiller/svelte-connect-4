<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeReefSettings, HANDLING, persistReefPrefs, reefPanel, reefPrefs } from '../settings.svelte';
	import type { Handling } from '../persist';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));
	const handlings = Object.keys(HANDLING) as Handling[];

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

{#if reefPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeReefSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="reef-settings-title"
		>
			<p class="kicker">This reef</p>
			<h2 id="reef-settings-title">Settings</h2>

			<label class="row">
				<input type="checkbox" bind:checked={reefPrefs.ghost} onchange={persistReefPrefs} />
				<span>
					<strong>Ghost piece</strong>
					<small>A faint outline where the piece will land</small>
				</span>
			</label>

			<div class="handling" role="radiogroup" aria-label="Key repeat">
				<span>
					<strong>Key repeat</strong>
					<small>How soon a held arrow starts sliding, and how fast</small>
				</span>
				<div class="seg">
					{#each handlings as id (id)}
						<button
							type="button"
							role="radio"
							aria-checked={reefPrefs.handling === id}
							class:on={reefPrefs.handling === id}
							onclick={() => {
								reefPrefs.handling = id;
								persistReefPrefs();
							}}
						>
							{HANDLING[id].label}
						</button>
					{/each}
				</div>
			</div>

			<label class="row">
				<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={toggled} />
				<span>
					<strong>Sound</strong>
					<small>Bubbles, coral clicks, the plankton bloom and a passing whale</small>
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
					<small>Sonar pings and whale-song pads; the pulse quickens as you sink</small>
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
					<small>Keys answering through long echoes, a low swell and glass glints</small>
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
					closeReefSettings();
				}}
			>
				Done
			</button>
			<p class="build">Lumen Reef · v{APP_VERSION}</p>
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
		background: rgba(0, 3, 10, 0.64);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(430px, 100%);
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
		border-radius: 22px;
		padding: 20px 20px 16px;
		background: linear-gradient(180deg, #0a2036, #030a16);
		color: #d8f4ff;
		border: 1px solid rgba(63, 233, 255, 0.26);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #3fe9ff;
	}

	h2 {
		margin: 4px 0 8px;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: 1.6rem;
	}

	.row,
	.slider {
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 10px 0;
	}

	.row span,
	.slider,
	.handling > span {
		flex: 1;
		flex-direction: column;
		align-items: stretch;
		gap: 4px;
	}

	.row small,
	.handling small {
		display: block;
		color: #8fb4c8;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #3fe9ff;
	}

	.handling {
		display: grid;
		gap: 8px;
		margin: 12px 0 14px;
	}

	.seg {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		padding: 3px;
		border-radius: 999px;
		background: rgba(63, 233, 255, 0.06);
		border: 1px solid rgba(63, 233, 255, 0.18);
	}

	.seg button {
		appearance: none;
		border: 0;
		border-radius: 999px;
		padding: 7px 8px;
		background: transparent;
		color: #8fb4c8;
		font: inherit;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.seg button.on {
		background: linear-gradient(180deg, #7ff3ff, #2a8fd8);
		color: #021020;
		font-weight: 700;
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
		background: linear-gradient(180deg, #7ff3ff, #2a8fd8);
		color: #021020;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #5f8296;
	}

	@media (max-height: 640px) {
		.row small,
		.handling small {
			display: none;
		}

		.row,
		.slider {
			margin: 6px 0;
		}
	}
</style>
