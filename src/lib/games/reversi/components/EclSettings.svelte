<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import { audioSettings, persistAudio, primeAudio, syncAudio } from '$lib/audio/prefs.svelte';
	import { closeEclSettings, eclPanel, eclView, setEclHints, setEclPieces } from '../settings.svelte';

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

{#if eclPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeEclSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="ecl-settings-title"
		>
			<p class="kicker">This dome</p>
			<h2 id="ecl-settings-title">Settings</h2>
			<p class="lede">Volumes are global. Eclipse keeps its own twilight song.</p>

			<div class="pieces" role="radiogroup" aria-label="Piece style">
				<button
					type="button"
					role="radio"
					aria-checked={eclView.pieces === 'celestial'}
					class:on={eclView.pieces === 'celestial'}
					onclick={() => setEclPieces('celestial')}
				>
					<span class="pair"><i class="moon"></i><i class="sun"></i></span>
					<strong>Celestial</strong>
					<small>Silver moons, gilded suns</small>
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={eclView.pieces === 'classic'}
					class:on={eclView.pieces === 'classic'}
					onclick={() => setEclPieces('classic')}
				>
					<span class="pair"><i class="black"></i><i class="white"></i></span>
					<strong>Classic</strong>
					<small>Black for Moon, white for Sun</small>
				</button>
			</div>

			<label class="row">
				<input
					type="checkbox"
					checked={eclView.hints}
					onchange={(event) => setEclHints(event.currentTarget.checked)}
				/>
				<span>
					<strong>Show legal moves</strong>
					<small>Faint brass rings mark every square you can play</small>
				</span>
			</label>

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
					<small>Brass clicks, flip bells, and the corner chime</small>
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
					<small>Celesta over a slow lydian night</small>
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
					closeEclSettings();
				}}
			>
				Done
			</button>
			<p class="build">Eclipse · v{APP_VERSION}</p>
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
		background: rgba(4, 4, 14, 0.55);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(420px, 100%);
		border-radius: 24px;
		padding: 22px 22px 18px;
		background: linear-gradient(180deg, #1e1c3c, #11112a);
		color: #f1e6cf;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(244, 213, 138, 0.14);
		border: 1px solid rgba(232, 184, 90, 0.32);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #e8b85a;
	}

	h2 {
		margin: 4px 0 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		color: #f4d58a;
	}

	.lede {
		margin: 8px 0 18px;
		color: #b8b2c8;
		line-height: 1.45;
	}

	.pieces {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 6px;
	}

	.pieces button {
		appearance: none;
		display: grid;
		justify-items: center;
		gap: 3px;
		padding: 12px 10px 10px;
		border-radius: 16px;
		border: 1px solid rgba(232, 184, 90, 0.22);
		background: rgba(8, 8, 24, 0.45);
		color: inherit;
		font: inherit;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background 160ms ease;
	}

	.pieces button.on {
		border-color: rgba(232, 184, 90, 0.8);
		background: rgba(232, 184, 90, 0.1);
		box-shadow: 0 0 18px rgba(232, 184, 90, 0.16);
	}

	.pieces small {
		color: #a8a2bc;
		font-size: 0.74rem;
	}

	.pair {
		display: flex;
		margin-bottom: 4px;
	}

	.pair i {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.pair i + i {
		margin-left: -6px;
	}

	.pair .moon {
		background: radial-gradient(circle at 35% 30%, #fff, #c4cde0 50%, #5b6582);
	}

	.pair .sun {
		background: radial-gradient(circle at 35% 30%, #fff6d2, #f0c060 50%, #8a5a1c);
	}

	.pair .black {
		background: radial-gradient(circle at 35% 28%, #6a6e78, #1c1e24 45%, #050507);
	}

	.pair .white {
		background: radial-gradient(circle at 35% 28%, #ffffff, #eceae4 50%, #a9a69e);
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
		color: #a8a2bc;
		font-size: 0.82rem;
	}

	.slider input,
	.row input {
		accent-color: #e8b85a;
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
		background: linear-gradient(180deg, #f8e2a2, #d9a24a 55%, #a8701f);
		color: #1a1224;
	}

	.build {
		margin: 10px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #7e7896;
	}
</style>
