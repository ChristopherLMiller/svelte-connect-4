<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { pinballPanel, pinballPrefs, closePinballSettings, persistPinballPrefs } from '../settings.svelte';
	import { DIFFICULTIES } from '../types';

	let { playing = false }: { playing?: boolean } = $props();

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));
	const canRumble = typeof navigator !== 'undefined' && 'vibrate' in navigator;
	const canSpeak = typeof speechSynthesis !== 'undefined';

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

	function close() {
		persistAudio();
		closePinballSettings();
	}
</script>

{#if pinballPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={close} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="pinball-settings-title">
			<p class="kicker">Behind the glass</p>
			<h2 id="pinball-settings-title">Settings</h2>

			<div class="cols">
				<section class="col" aria-label="Table">
					<p class="label">Difficulty</p>
					<div class="seg" role="radiogroup" aria-label="Table">
						{#each DIFFICULTIES as item (item.id)}
							<button
								type="button"
								role="radio"
								aria-checked={pinballPrefs.difficulty === item.id}
								class:on={pinballPrefs.difficulty === item.id}
								onclick={() => {
									pinballPrefs.difficulty = item.id;
									persistPinballPrefs();
								}}>{item.name}</button
							>
						{/each}
					</div>
					<p class="note">
						{DIFFICULTIES.find((d) => d.id === pinballPrefs.difficulty)?.note}.{playing ? ' Takes effect from your next game.' : ''}
					</p>

					{#if canRumble}
						<label class="row">
							<input type="checkbox" bind:checked={pinballPrefs.rumble} onchange={persistPinballPrefs} />
							<span>
								<strong>Rumble</strong>
								<small>The phone buzzes on bumpers, slingshots, jackpots and drains</small>
							</span>
						</label>
					{/if}

					{#if canSpeak}
						<label class="row">
							<input type="checkbox" bind:checked={pinballPrefs.voice} onchange={persistPinballPrefs} />
							<span>
								<strong>Voice</strong>
								<small>Tables with a talking computer read out jackpots, modes and extra balls</small>
							</span>
						</label>
					{/if}
				</section>

				<section class="col" aria-label="Sound">
					<label class="row">
						<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={toggled} />
						<span>
							<strong>Sound</strong>
							<small>Flippers, bumpers, chimes and each table's own fanfares</small>
						</span>
					</label>
					<label class="slider">
						<span>SFX · {sfxPct}</span>
						<input type="range" min="0" max="1" step="0.01" value={audioSettings.sfxVolume} disabled={!audioSettings.sfxOn} oninput={(event) => setSfx(Number(event.currentTarget.value))} />
					</label>

					<label class="row">
						<input type="checkbox" bind:checked={audioSettings.musicOn} onchange={toggled} />
						<span>
							<strong>Music</strong>
							<small>Every table has its own tune, from a calliope waltz to a space-age synth</small>
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
							<small>Echoes, drones and glints around each table's tune</small>
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

			<button class="done" onclick={close}>Done</button>
			<p class="build">Silverball · v{APP_VERSION}</p>
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
		padding: 20px;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(6, 2, 10, 0.66);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
		border-radius: 20px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-bg) 80%, #ffffff 6%), var(--sb-bg));
		color: var(--sb-ink);
		border: 1px solid color-mix(in srgb, var(--sb-accent) 32%, transparent);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	h2 {
		margin: 2px 0 6px;
		font-family: var(--sb-display);
		font-weight: 400;
		letter-spacing: 0.05em;
		font-size: 2rem;
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

	.row strong {
		font-size: 1.05rem;
	}

	.row small,
	.note {
		display: block;
		color: var(--sb-muted);
		font-size: 0.92rem;
		font-weight: 500;
		line-height: 1.35;
	}

	.note {
		margin: 8px 0 0;
	}

	.slider input,
	.row input {
		accent-color: var(--sb-accent);
	}

	.label {
		margin: 14px 0 6px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	.seg {
		display: flex;
		gap: 6px;
	}

	.seg button {
		flex: 1;
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--sb-accent) 30%, transparent);
		background: rgba(255, 242, 220, 0.05);
		border-radius: 999px;
		padding: 8px 10px;
		font: inherit;
		font-weight: 700;
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		color: inherit;
		cursor: pointer;
	}

	.seg button.on {
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-hot) 80%, #fff), color-mix(in srgb, var(--sb-hot) 60%, #000));
		border-color: transparent;
	}

	.done {
		appearance: none;
		width: 100%;
		margin-top: 12px;
		border: 0;
		border-radius: 999px;
		padding: 12px;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-hot) 80%, #fff), color-mix(in srgb, var(--sb-hot) 60%, #000));
		color: #fff;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.78rem;
		color: var(--sb-muted);
		opacity: 0.7;
	}
</style>
