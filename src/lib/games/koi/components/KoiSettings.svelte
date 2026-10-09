<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeKoiSettings, koiPanel, koiPrefs, persistKoiPrefs } from '../settings.svelte';
	import type { Aim } from '../persist';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));

	const AIMS: Array<{ id: Aim; name: string }> = [
		{ id: 'full', name: 'Full path' },
		{ id: 'short', name: 'Short' }
	];

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
		closeKoiSettings();
	}
</script>

{#if koiPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={close} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="koi-settings-title">
			<p class="kicker">By the water</p>
			<h2 id="koi-settings-title">Settings</h2>

			<div class="cols">
				<section class="col" aria-label="Play">
					<p class="label">Ripples · aim guide</p>
					<div class="seg" role="radiogroup" aria-label="Aim guide">
						{#each AIMS as aim (aim.id)}
							<button
								type="button"
								role="radio"
								aria-checked={koiPrefs.aim === aim.id}
								class:on={koiPrefs.aim === aim.id}
								onclick={() => {
									koiPrefs.aim = aim.id;
									persistKoiPrefs();
								}}>{aim.name}</button
							>
						{/each}
					</div>
					<p class="note">The full path shows every bounce off the banks. Short shows just the first stretch, for more of a challenge.</p>

					<p class="label">Currents</p>
					<label class="row">
						<input type="checkbox" bind:checked={koiPrefs.hints} onchange={persistKoiPrefs} />
						<span>
							<strong>Hints</strong>
							<small>If you pause for a while, two blooms that would make a match bob gently</small>
						</span>
					</label>
				</section>

				<section class="col" aria-label="Sound">
					<label class="row">
						<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={toggled} />
						<span>
							<strong>Sound</strong>
							<small>Plops, hang-drum chimes, splashes and the golden koi's leap</small>
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
							<small>A hang drum wandering the pentatonic over soft keys, with water dripping in time</small>
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
							<small>Marimba answers, a warm low fifth and glass glints like sun on the water</small>
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
			<p class="build">Koi Pond · v{APP_VERSION}</p>
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
		background: rgba(3, 18, 16, 0.58);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
		border-radius: 22px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #154a43, #0a2a26);
		color: #f6f1e4;
		border: 1px solid rgba(255, 179, 71, 0.3);
		box-shadow: 0 24px 60px rgba(0, 20, 16, 0.55);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #ffb347;
	}

	h2 {
		margin: 2px 0 6px;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: 1.8rem;
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

	.row small,
	.note {
		display: block;
		color: #b6d2c5;
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1.4;
	}

	.note {
		margin: 8px 0 0;
	}

	.slider input,
	.row input {
		accent-color: #ffb347;
	}

	.label {
		margin: 14px 0 6px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #ffb347;
	}

	.seg {
		display: flex;
		gap: 6px;
	}

	.seg button {
		flex: 1;
		appearance: none;
		border: 1px solid rgba(255, 179, 71, 0.3);
		background: rgba(246, 241, 228, 0.05);
		border-radius: 999px;
		padding: 8px 10px;
		font: inherit;
		font-weight: 700;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
	}

	.seg button.on {
		background: linear-gradient(180deg, #ffc36b, #f07a2c);
		border-color: transparent;
		color: #2a1206;
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
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #ffc36b, #f07a2c);
		color: #2a1206;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #7fa597;
	}
</style>
