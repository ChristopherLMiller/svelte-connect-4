<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { APP_VERSION } from '$lib/version';
	import {
		audioSettings,
		closeLibrarySettings,
		libraryPanel,
		setLibraryMusicVolume,
		setLibrarySfxVolume,
		syncAudio
	} from '$lib/library/settings.svelte';

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
</script>

{#if libraryPanel.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeLibrarySettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.96, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="library-settings-title"
		>
			<p class="kicker">AI Arcade</p>
			<h2 id="library-settings-title">Settings</h2>
			<p class="lede">Volumes carry into every cabinet. Each title still plays its own score.</p>

			<label class="row">
				<input type="checkbox" bind:checked={audioSettings.sfxOn} onchange={() => syncAudio()} />
				<span>
					<strong>Sound effects</strong>
					<small>Coin blips here, and SFX inside games</small>
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
					oninput={(event) => setLibrarySfxVolume(Number(event.currentTarget.value))}
				/>
			</label>

			<label class="row">
				<input type="checkbox" bind:checked={audioSettings.musicOn} onchange={() => syncAudio()} />
				<span>
					<strong>Music</strong>
					<small>Attract loop here — each game has its own soundtrack</small>
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
					oninput={(event) => setLibraryMusicVolume(Number(event.currentTarget.value))}
				/>
			</label>

			<button class="done" onclick={closeLibrarySettings}>Done</button>
			<p class="build">AI Arcade · v{APP_VERSION}</p>
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
		background: rgba(4, 0, 12, 0.72);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(400px, 100%);
		padding: 28px 24px 20px;
		border-radius: 22px;
		background: #140022;
		border: 1px solid rgba(0, 240, 255, 0.35);
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.55),
			0 0 40px rgba(255, 43, 214, 0.18);
		color: #f7f1ff;
		font-family: 'Exo 2', ui-sans-serif, system-ui, sans-serif;
		text-align: left;
	}

	.kicker {
		margin: 0 0 4px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #00f0ff;
	}

	h2 {
		margin: 0;
		font-family: Bungee, Impact, sans-serif;
		font-weight: 400;
		font-size: 1.7rem;
		letter-spacing: 0.04em;
		color: #ffe14a;
		text-shadow: 0 0 14px rgba(255, 225, 74, 0.4);
	}

	.lede {
		margin: 8px 0 20px;
		color: #b7a8d8;
		font-size: 0.9rem;
		line-height: 1.45;
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
		color: #b7a8d8;
		font-size: 0.82rem;
	}

	.slider {
		flex-direction: column;
		align-items: stretch;
		padding-left: 28px;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: #ff2bd6;
		flex-shrink: 0;
	}

	input[type='range'] {
		width: 100%;
		accent-color: #00f0ff;
	}

	.done {
		margin-top: 8px;
		width: 100%;
		border: 0;
		border-radius: 14px;
		padding: 12px 16px;
		cursor: pointer;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #fff1a8, #ff9d2e 58%, #ff5a1f);
		color: #140816;
	}

	.build {
		margin: 14px 0 0;
		text-align: center;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: #b7a8d8;
	}
</style>
