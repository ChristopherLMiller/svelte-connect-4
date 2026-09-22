<script lang="ts">
	import { openWyrmSettings } from '../settings.svelte';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import WyrmIcon from './WyrmIcon.svelte';
	import type { WyrmSession } from '../session.svelte';

	let { session }: { session: WyrmSession } = $props();

	const hint = $derived.by(() => {
		if (session.status.type === 'paused') return 'The market holds still';
		if (session.status.type === 'won') return 'Every lantern is silk';
		if (session.status.type === 'dead') {
			return session.status.cause === 'wall' ? 'Hit a stall' : 'Bit its own silk';
		}
		if (session.waiting) return 'Ready';
		if (session.high) return 'A new high';
		return 'Steer the silk';
	});

	const kicker = $derived.by(() => {
		if (session.status.type === 'paused') return 'Paused · space resumes';
		if (session.status.type === 'won') return 'Perfect coil';
		if (session.status.type === 'dead') return 'Night out';
		if (session.waiting) return 'Arrows or WASD';
		const pace = { easy: 'Dusk stroll', medium: 'Night market', hard: 'Lantern fever' }[session.difficulty];
		return pace;
	});

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], {
				duration: 220,
				easing: 'ease-out'
			});
		};
	}
</script>

<header class="hud">
	<div class="brand">
		<WyrmIcon />
		<div class="name">
			<p>Lantern Wyrm</p>
			<small>night market coil</small>
		</div>
	</div>
	<div class="call">
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="score" class:hot={session.high}>
		<span class="lamp" aria-hidden="true"><b></b></span>
		<span>Lanterns
			<em {@attach bump(session.score)}>{session.score}</em>
		</span>
		<i>best</i>
		<span><em>{session.best}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openWyrmSettings()}>Settings</button>
		<button type="button" onclick={() => session.restart()}>Restart</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="night" />
	</div>
</header>

<style>
	.hud {
		width: min(980px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: stretch;
		color: #f7ead2;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.score,
	.ops button {
		border: 1px solid rgba(240, 196, 92, 0.22);
		background: rgba(12, 10, 28, 0.82);
		border-radius: 16px;
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
		text-align: left;
	}

	.name p {
		margin: 0;
		font-family: Cinzel, Palatino, serif;
		font-weight: 600;
		font-size: 1.02rem;
		line-height: 1.1;
		letter-spacing: 0.02em;
	}

	.name small {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #f0c45c;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 8px 16px;
		min-width: 0;
	}

	.call small {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #f0c45c;
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: Cinzel, Palatino, serif;
		font-weight: 600;
		font-size: clamp(0.92rem, 2.2vw, 1.28rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.82rem;
	}

	.score .lamp {
		width: 10px;
		margin-right: 2px;
		animation: sway 2.6s ease-in-out infinite;
	}

	.score .lamp b {
		display: block;
		width: 9px;
		height: 12px;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #e24a3d);
		box-shadow: 0 0 10px #f0c45c;
	}

	.score em {
		display: inline-block;
		font-style: normal;
		font-family: Cinzel, Palatino, serif;
		font-weight: 700;
		font-size: 1.35rem;
		margin-left: 6px;
		color: #ffd97a;
	}

	.score.hot em {
		color: #fff6d2;
		text-shadow: 0 0 12px rgba(240, 196, 92, 0.7);
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #e24a3d;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
		flex-wrap: nowrap;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 16px;
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.ops button:hover {
		border-color: rgba(240, 196, 92, 0.6);
		background: rgba(20, 16, 40, 0.88);
		color: #ffd97a;
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@keyframes sway {
		0%,
		100% {
			rotate: -8deg;
		}
		50% {
			rotate: 8deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.score em,
		.score .lamp {
			animation: none;
		}
	}

	@media (max-width: 860px) {
		.hud {
			grid-template-columns: 1fr 1fr;
			height: auto;
			flex-basis: auto;
		}

		.call,
		.ops {
			grid-column: 1 / -1;
		}

		.ops {
			justify-content: center;
		}

		.ops button {
			padding: 10px 14px;
		}
	}
</style>
