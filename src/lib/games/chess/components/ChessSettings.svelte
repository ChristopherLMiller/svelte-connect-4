<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, setLayersVolume, syncAudio } from '$lib/audio/prefs.svelte';
	import { chessPanel, chessPanels, chessView, persistChessView } from '../settings.svelte';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));

	const BOARD: Array<['coords' | 'hints' | 'autoFlip' | 'evalBar', string, string]> = [
		['hints', 'Show legal moves', 'Dots on the squares a lifted piece can reach'],
		['coords', 'Coordinates', 'Files and ranks carved into the frame'],
		['evalBar', 'Evaluation bar', "The Count's opinion of the position, beside the board"],
		['autoFlip', 'Turn the board in hotseat', 'Whoever is to move sits at the bottom']
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
</script>

{#if chessPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={chessPanels.closeSettings} aria-label="Close settings"></button>
		<div class="panel" transition:scale={{ start: 0.96, duration: 180 }} role="dialog" aria-modal="true" aria-labelledby="chess-settings-title">
			<p class="kicker">By the fireside</p>
			<h2 id="chess-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Someone at the grand piano plays a nocturne by candlelight.</p>

			<div class="cols">
				<section class="col" aria-label="Board">
					{#each BOARD as [key, title, blurb] (key)}
						<label class="row">
							<input
								type="checkbox"
								checked={chessView[key]}
								onchange={(event) => {
									chessView[key] = event.currentTarget.checked;
									persistChessView();
								}}
							/>
							<span>
								<strong>{title}</strong>
								<small>{blurb}</small>
							</span>
						</label>
					{/each}
					<div class="tip">
						<strong>From the Count's notebook</strong>
						<p>
							In the opening: a centre pawn, knights before bishops, castle early, and don't move the queen out to be chased. Before every
							move, ask what your opponent's last move threatens.
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
							<small>Pieces on marble, the clock, and thunder at the windows</small>
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
							<small>A slow piano nocturne in E-flat, with a C minor middle</small>
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
							<small>Soft echoing keys, a warm low fifth and glass glints · with or without the music</small>
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
					chessPanels.closeSettings();
				}}
			>
				Done
			</button>
			<p class="build">Chess · v{APP_VERSION}</p>
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
		background: rgba(8, 4, 2, 0.62);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 12px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #2a1610, #120a07);
		color: #f3e7cf;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 230, 180, 0.1);
		border: 1px solid rgba(217, 178, 94, 0.3);
		border-top: 4px solid #d9b25e;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #d9b25e;
	}

	h2 {
		margin: 2px 0 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 1.8rem;
		letter-spacing: 0.04em;
	}

	.lede {
		margin: 6px 0 16px;
		color: #bba88a;
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

	.row strong {
		font-size: 1.06rem;
	}

	.row small {
		display: block;
		color: #bba88a;
		font-size: 0.9rem;
	}

	.slider input,
	.row input {
		accent-color: #d9b25e;
	}

	.tip {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px dashed rgba(217, 178, 94, 0.35);
		background: rgba(217, 178, 94, 0.05);
	}

	.tip strong {
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 0.98rem;
	}

	.tip p {
		margin: 4px 0 0;
		color: #e2d4b8;
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
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: linear-gradient(180deg, #f2d27e, #b8862e);
		color: #1c1107;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #8a7a62;
	}
</style>
