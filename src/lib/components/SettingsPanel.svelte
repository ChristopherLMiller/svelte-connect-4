<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { cycleMusicTrack, getMusicTrackIndex, getMusicTrackName, onMusicTrack } from '$lib/game/audio';
	import {
		audioSettings,
		closeSettings,
		lookSettings,
		persistSettings,
		setBoardSkin,
		setThreatAlerts,
		syncAudio
	} from '$lib/game/settings.svelte';
	import { APP_VERSION } from '$lib/version';

	let { scope = 'arcade' }: { scope?: 'arcade' | 'connect4' } = $props();

	const sfxPct = $derived(Math.round(audioSettings.sfxVolume * 100));
	const musicPct = $derived(Math.round(audioSettings.musicVolume * 100));
	const showGamePrefs = $derived(scope === 'connect4');
	let trackName = $state(getMusicTrackName());

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

{#if audioSettings.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeSettings} aria-label="Close settings"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.94, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-title"
		>
			<p class="kicker">{showGamePrefs ? 'Signal control' : 'Floor control'}</p>
			<h2 id="settings-title">Settings</h2>
			{#if !showGamePrefs}
				<p class="lede">Volumes and score apply across every cabinet on the floor.</p>
			{/if}

			{#if showGamePrefs}
				<p class="kicker sub">Grid skin</p>
				<div class="skins" role="radiogroup" aria-label="Board look">
					<button
						type="button"
						class:on={lookSettings.skin === 'protocol'}
						aria-pressed={lookSettings.skin === 'protocol'}
						onclick={() => setBoardSkin('protocol')}
					>
						<strong>Protocol</strong>
						<small>Hololith hull and energy cells</small>
					</button>
					<button
						type="button"
						class:on={lookSettings.skin === 'classic'}
						aria-pressed={lookSettings.skin === 'classic'}
						onclick={() => setBoardSkin('classic')}
					>
						<strong>Arcade</strong>
						<small>Original plastic board and discs</small>
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
			{/if}

			<label class="row">
				<input
					type="checkbox"
					bind:checked={audioSettings.sfxOn}
					onchange={() => syncAudio()}
				/>
				<span>
					<strong>Sound effects</strong>
					<small>{showGamePrefs ? 'Drops, bounces, blocks, wins' : 'UI clicks and every cabinet'}</small>
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
					<small>Transmission · {trackName}</small>
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
				disabled={!audioSettings.musicOn}
				onclick={() => {
					trackName = cycleMusicTrack();
					persistSettings({ musicTrack: getMusicTrackIndex() });
				}}
			>
				Next transmission
			</button>

			<button class="done" onclick={closeSettings}>Close</button>
			<p class="build">Arcade Protocol · v{APP_VERSION}</p>
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
		padding: 28px 24px 22px;
		border-radius: 24px;
		background: rgba(14, 12, 24, 0.96);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		text-align: left;
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
		margin: -6px 0 16px;
		color: var(--muted);
		font-size: 0.9rem;
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
		margin-top: 10px;
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
