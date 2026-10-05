<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { cycleMusicTrack, getMusicTrackIndex, getMusicTrackName, onMusicTrack } from '../audio';
	import {
		audioSettings,
		closeSettings,
		lookSettings,
		panel,
		persistSettings,
		setBoardSkin,
		setPieceStyle,
		setThreatAlerts,
		syncAudio
	} from '../settings.svelte';
	import { setLayersVolume } from '$lib/audio/prefs.svelte';
	import { APP_VERSION } from '$lib/version';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const layersPct = $derived(Math.round(audioSettings.layersVolume * 100));
	let trackName = $state(getMusicTrackName());
	const minis = Array.from({ length: 15 }, (_, i) => i);

	onMount(() =>
		onMusicTrack((name) => {
			trackName = name;
		})
	);

	function setSfxVolume(value: number) {
		audioSettings.sfxVolume = value;
		if (value > 0) audioSettings.sfxOn = true;
		syncAudio();
	}

	function setMusicVolume(value: number) {
		audioSettings.musicVolume = value;
		if (value > 0) audioSettings.musicOn = true;
		syncAudio();
	}
</script>

{#if panel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.94, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
		>
			<p class="kicker">This match</p>
			<h2 id="settings-title">Settings</h2>
			<p class="lede">Volumes are global. The grid, pieces and score below belong to Connect 4.</p>
			<div class="cols">
				<section class="col" aria-label="Look and play">
					<p class="kicker sub">Grid skin</p>
					<div class="skins grids" role="radiogroup" aria-label="Board look">
						<button
							type="button"
							role="radio"
							class:on={lookSettings.skin === 'protocol'}
							aria-checked={lookSettings.skin === 'protocol'}
							onclick={() => setBoardSkin('protocol')}
						>
							<span class="mini protocol" aria-hidden="true">
								{#each minis as i (i)}<i></i>{/each}
							</span>
							<strong>Protocol</strong>
							<small>Hololith hull with lit sockets</small>
						</button>
						<button
							type="button"
							role="radio"
							class:on={lookSettings.skin === 'classic'}
							aria-checked={lookSettings.skin === 'classic'}
							onclick={() => setBoardSkin('classic')}
						>
							<span class="mini classic" aria-hidden="true">
								{#each minis as i (i)}<i></i>{/each}
							</span>
							<strong>Arcade</strong>
							<small>Original blue plastic board</small>
						</button>
					</div>

					<p class="kicker sub">Pieces</p>
					<div class="skins pieces" role="radiogroup" aria-label="Piece look">
						<button
							type="button"
							role="radio"
							class:on={lookSettings.pieces === 'protocol'}
							aria-checked={lookSettings.pieces === 'protocol'}
							onclick={() => setPieceStyle('protocol')}
						>
							<span class="pair protocol" aria-hidden="true"><i class="p1"></i><i class="p2"></i></span>
							<strong>Energy cells</strong>
							<small>Ringed cores with a hex iris</small>
						</button>
						<button
							type="button"
							role="radio"
							class:on={lookSettings.pieces === 'classic'}
							aria-checked={lookSettings.pieces === 'classic'}
							onclick={() => setPieceStyle('classic')}
						>
							<span class="pair classic" aria-hidden="true"><i class="p1"></i><i class="p2"></i></span>
							<strong>Arcade</strong>
							<small>Glossy red and yellow plastic</small>
						</button>
					</div>

					<label class="row">
						<input
							type="checkbox"
							checked={lookSettings.threatAlerts}
							onchange={(event) => setThreatAlerts(event.currentTarget.checked)}
						/>
						<span>
							<strong>Threat detection</strong>
							<small>Warn when a four is open or you're about to be finished</small>
						</span>
					</label>

				</section>

				<section class="col" aria-label="Sound">
					<p class="kicker sub">Sound</p>
					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.sfxOn}
							onchange={() => syncAudio()}
						/>
						<span>
							<strong>Sound effects</strong>
							<small>Drops, bounces, blocks — volume is shared with the library</small>
						</span>
					</label>
					<label class="slider">
						<span>SFX volume · {sfxPct}</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioSettings.sfxVolume}
							disabled={!audioSettings.sfxOn}
							oninput={(event) => setSfxVolume(Number(event.currentTarget.value))}
						/>
					</label>

					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.musicOn}
							onchange={() => syncAudio()}
						/>
						<span>
							<strong>Background score</strong>
							<small>This game's transmissions · {trackName}</small>
						</span>
					</label>
					<label class="slider">
						<span>Music volume · {musicPct}</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioSettings.musicVolume}
							disabled={!audioSettings.musicOn}
							oninput={(event) => setMusicVolume(Number(event.currentTarget.value))}
						/>
					</label>
					<button
						type="button"
						class="next-tx"
						disabled={!audioSettings.musicOn && !audioSettings.layersOn}
						onclick={() => {
							trackName = cycleMusicTrack();
							persistSettings({ musicTrack: getMusicTrackIndex() });
						}}
					>
						Next transmission
					</button>

					<label class="row">
						<input
							type="checkbox"
							bind:checked={audioSettings.layersOn}
							onchange={() => syncAudio()}
						/>
						<span>
							<strong>Synth layers</strong>
							<small>Pads, arpeggios and echoes arranged for each transmission · play with or without the music</small>
						</span>
					</label>
					<label class="slider">
						<span>Layers volume · {layersPct}</span>
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

			<button class="done" onclick={closeSettings}>Close</button>
			<p class="build">Connect 4 · v{APP_VERSION}</p>
		</div>
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		padding: 20px;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(4, 3, 10, 0.55);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 28px 24px 22px;
		border-radius: 24px;
		background: rgba(14, 12, 24, 0.96);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		text-align: left;
	}

	.col > :last-child {
		margin-bottom: 0;
	}

	.col + .col {
		margin-top: 18px;
	}

	@media (min-width: 760px) {
		.panel {
			width: min(820px, 100%);
		}

		.cols {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 32px;
		}

		.col + .col {
			margin-top: 0;
		}
	}

	.kicker {
		margin: 0 0 6px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	h2 {
		margin: 0 0 14px;
		font-family: var(--font-display);
		font-size: 1.7rem;
	}

	.lede {
		margin: -4px 0 16px;
		color: var(--muted);
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.kicker.sub {
		margin: 4px 0 8px;
	}

	.skins {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 22px;
	}

	.skins button {
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		padding: 12px 10px;
		text-align: left;
		cursor: pointer;
	}

	.skins button.on {
		border-color: var(--cyan);
		background: rgba(92, 225, 230, 0.08);
		box-shadow: 0 0 0 1px rgba(92, 225, 230, 0.35);
	}

	.skins strong {
		display: block;
		font-family: var(--font-display);
		letter-spacing: 0.04em;
	}

	.skins small {
		display: block;
		margin-top: 4px;
		color: var(--muted);
		font-size: 0.75rem;
		line-height: 1.35;
	}

	.skins.pieces {
		margin-top: -10px;
	}

	.mini {
		position: relative;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 3px;
		width: 66px;
		padding: 6px;
		margin-bottom: 7px;
		box-sizing: border-box;
	}

	.mini i {
		aspect-ratio: 1;
		border-radius: 50%;
	}

	.mini.protocol {
		border-radius: 5px;
		background:
			linear-gradient(135deg, rgba(92, 225, 230, 0.18), transparent 40%, rgba(139, 124, 255, 0.14)),
			repeating-linear-gradient(0deg, rgba(92, 225, 230, 0.1) 0 1px, transparent 1px 6px),
			repeating-linear-gradient(90deg, rgba(92, 225, 230, 0.1) 0 1px, transparent 1px 6px),
			linear-gradient(180deg, #2a3348, #121826 28%, #070910);
		box-shadow:
			0 0 0 1px rgba(92, 225, 230, 0.3),
			0 0 12px rgba(92, 225, 230, 0.18),
			0 4px 10px rgba(0, 0, 0, 0.5);
	}

	.mini.protocol i {
		background: radial-gradient(circle at 50% 40%, #1a1030, #07060c);
		box-shadow:
			0 0 0 1px rgba(8, 10, 18, 0.9),
			0 0 0 1.6px rgba(92, 225, 230, 0.5);
	}

	.mini.protocol::before,
	.mini.protocol::after {
		content: '';
		position: absolute;
		width: 7px;
		height: 7px;
		border: 1.5px solid rgba(92, 225, 230, 0.7);
	}

	.mini.protocol::before {
		top: 2px;
		left: 2px;
		border-right: 0;
		border-bottom: 0;
	}

	.mini.protocol::after {
		right: 2px;
		bottom: 2px;
		border-left: 0;
		border-top: 0;
		border-color: rgba(255, 51, 92, 0.6);
	}

	.mini.classic {
		border-radius: 8px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.4), transparent 45%, rgba(92, 225, 230, 0.2)),
			linear-gradient(180deg, #6ea0ff, #1d4ed8 42%, #102f96);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.35),
			0 4px 10px rgba(0, 0, 0, 0.5);
	}

	.mini.classic i {
		background: radial-gradient(circle at 50% 35%, #1a1f3a, #060914);
		box-shadow:
			inset 0 2px 2px rgba(0, 0, 0, 0.7),
			0 1px 0 rgba(255, 255, 255, 0.3);
	}

	.grids button,
	.pieces button {
		display: grid;
		justify-items: center;
		text-align: center;
		padding: 12px 10px 10px;
	}

	.pair {
		display: flex;
		margin-bottom: 6px;
	}

	.pair i {
		position: relative;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		box-shadow: 0 3px 6px rgba(0, 0, 0, 0.45);
	}

	.pair i + i {
		margin-left: -7px;
	}

	.pair .p1 {
		--mid: #ff335c;
		--deep: #5a0820;
		--glow: rgba(255, 51, 92, 0.6);
	}

	.pair .p2 {
		--mid: #ffe38a;
		--deep: #8a5a08;
		--glow: rgba(245, 194, 75, 0.55);
	}

	.pair.protocol i {
		background: radial-gradient(circle, transparent 62%, #0c0a14 63% 76%, #ffffffaa 77% 82%, #161221 83%);
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.45),
			0 0 10px var(--glow);
	}

	.pair.protocol i::after {
		content: '';
		position: absolute;
		inset: 20%;
		border-radius: 50%;
		background:
			radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.95), transparent 30%),
			radial-gradient(circle at 50% 46%, var(--mid), var(--deep) 72%);
	}

	.pair.classic .p1 {
		--mid: #ff4d73;
		--deep: #b50d38;
	}

	.pair.classic .p2 {
		--mid: #ffd56a;
		--deep: #c48a12;
	}

	.pair.classic i {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.78), transparent 34%),
			radial-gradient(circle at 50% 58%, var(--mid), var(--deep) 72%);
	}

	.row,
	.slider {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 14px;
	}

	.row span,
	.slider span {
		display: block;
	}

	.row strong {
		display: block;
	}

	.row small,
	.slider span {
		color: var(--muted);
		font-size: 0.82rem;
	}

	.slider {
		flex-direction: column;
		align-items: stretch;
		padding-left: 28px;
	}

	.next-tx {
		display: block;
		margin: 0 0 12px 28px;
		width: calc(100% - 28px);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 9px 16px;
		cursor: pointer;
		font-family: var(--font-display);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: rgba(92, 225, 230, 0.08);
		color: var(--cyan);
	}

	.next-tx:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--cyan);
		flex-shrink: 0;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--gold);
	}

	.done {
		margin-top: 18px;
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 11px 16px;
		cursor: pointer;
		font-family: var(--font-display);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #ffe38a, #f5c24b 50%, #e08a1a);
		color: #2a1600;
	}

	.build {
		margin: 14px 0 0;
		text-align: center;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: var(--muted);
		font-family: var(--font-display);
	}
</style>
