<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { persistPubView, pubPanelControls, pubPanels, pubView } from '../settings.svelte';
	import type { PubView } from '../persist';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));

	const PACES: Array<{ id: PubView['pace']; name: string }> = [
		{ id: 'brisk', name: 'Brisk' },
		{ id: 'easy', name: 'Easy' },
		{ id: 'slow', name: 'Slow' }
	];
	const TARGETS: PubView['euchreTarget'][] = [5, 10, 11, 15];

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

	function close() {
		persistAudio();
		pubPanelControls.closeSettings();
	}
</script>

{#if pubPanels.panel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={close} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="pub-settings-title">
			<p class="kicker">Behind the bar</p>
			<h2 id="pub-settings-title">Settings</h2>
			<p class="lede">Volumes are global. House rules for euchre take effect on the next new game.</p>

			<div class="cols">
				<section class="col" aria-label="Table">
					<label class="row">
						<input
							type="checkbox"
							checked={pubView.coach}
							onchange={(event) => {
								pubView.coach = event.currentTarget.checked;
								persistPubView();
							}}
						/>
						<span>
							<strong>Coach</strong>
							<small>Rosie suggests a move on your turn, explains why, and mentions it when a play cost you</small>
						</span>
					</label>
					<label class="row">
						<input
							type="checkbox"
							checked={pubView.hints}
							onchange={(event) => {
								pubView.hints = event.currentTarget.checked;
								persistPubView();
							}}
						/>
						<span>
							<strong>Dim cards you can't play</strong>
							<small>Cards that would break suit or the rules fade back in your hand</small>
						</span>
					</label>

					<p class="label">Pace of the regulars</p>
					<div class="seg" role="radiogroup" aria-label="Pace">
						{#each PACES as pace (pace.id)}
							<button
								role="radio"
								aria-checked={pubView.pace === pace.id}
								class:on={pubView.pace === pace.id}
								onclick={() => {
									pubView.pace = pace.id;
									persistPubView();
								}}>{pace.name}</button
							>
						{/each}
					</div>

					<p class="label">Euchre house rules</p>
					<label class="row">
						<input
							type="checkbox"
							checked={pubView.stick}
							onchange={(event) => {
								pubView.stick = event.currentTarget.checked;
								persistPubView();
							}}
						/>
						<span>
							<strong>Stick the dealer</strong>
							<small>If everyone passes twice, the dealer must name trump instead of throwing the hand in</small>
						</span>
					</label>
					<div class="seg" role="radiogroup" aria-label="Euchre game length">
						{#each TARGETS as target (target)}
							<button
								role="radio"
								aria-checked={pubView.euchreTarget === target}
								class:on={pubView.euchreTarget === target}
								onclick={() => {
									pubView.euchreTarget = target;
									persistPubView();
								}}>To {target}</button
							>
						{/each}
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
							<small>Cards on felt, pegs in the board, a knock on the table, the room cheering</small>
						</span>
					</label>
					<label class="slider">
						<span>SFX · {sfxPct}</span>
						<input type="range" min="0" max="1" step="0.01" value={audioSettings.sfxVolume} disabled={!audioSettings.sfxOn} oninput={(event) => setSfx(Number(event.currentTarget.value))} />
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
							<small>A gentle fiddle, concertina and fingerpicked guitar in the corner</small>
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
							<small>A soft whistle, a drone and plucked glints · with or without the music</small>
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
			<p class="build">Lamplight Pub · v{APP_VERSION}</p>
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
		background: rgba(10, 6, 3, 0.6);
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
		background: linear-gradient(180deg, #2e1f12, #170f08);
		color: #f4e6c8;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(224, 165, 72, 0.35);
		border-top: 4px solid #c98d34;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #e0a548;
	}

	h2 {
		margin: 2px 0 0;
		font: 700 1.8rem 'Playfair Display SC', Georgia, serif;
		color: #ffd48a;
	}

	.lede {
		margin: 6px 0 12px;
		color: #bfa985;
		font-size: 0.95rem;
		line-height: 1.45;
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
		color: #bfa985;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #e0a548;
	}

	.label {
		margin: 16px 0 6px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #e0a548;
	}

	.seg {
		display: flex;
		gap: 6px;
	}

	.seg button {
		flex: 1;
		appearance: none;
		border: 1px solid rgba(224, 165, 72, 0.3);
		background: rgba(244, 230, 200, 0.05);
		border-radius: 999px;
		padding: 8px 10px;
		font: inherit;
		font-weight: 700;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
	}

	.seg button.on {
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		border-color: transparent;
		color: #1c1107;
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
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		color: #1c1107;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a7a62;
	}
</style>
