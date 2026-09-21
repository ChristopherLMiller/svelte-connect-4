<script lang="ts">
	import type { LibraryGame } from '$lib/games/catalog';

	let {
		game,
		hot = false,
		onfocus,
		onlaunch
	}: {
		game: LibraryGame;
		hot?: boolean;
		onfocus: () => void;
		onlaunch: () => void;
	} = $props();

	const rim = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const uid = $props.id();
	const Preview = $derived(game.Preview);
</script>

<article
	class="cab"
	class:hot
	style:--accent={game.accent}
	style:--glow={game.glow}
	style:--body={game.cabinet}
>
	<div class="side left" aria-hidden="true"></div>
	<div class="side right" aria-hidden="true"></div>

	<header class="marquee" aria-hidden="true">
		<div class="rim top">
			{#each rim as n (n)}
				<i style:--n={n}></i>
			{/each}
		</div>
		<strong>
			{#if game.favicon}
				<img src={game.favicon} alt="" />
			{/if}
			<span>{game.title}</span>
		</strong>
		<div class="rim bot">
			{#each rim as n (`b${n}`)}
				<i style:--n={n + 4}></i>
			{/each}
		</div>
	</header>

	<button
		type="button"
		class="front"
		aria-label="Play {game.title}"
		aria-describedby="{uid}-card"
		aria-pressed={hot}
		onclick={onlaunch}
		onpointerenter={onfocus}
		onfocus={onfocus}
	>
		<div class="hood">
			<div class="crt">
				<div class="tube">
					<div class="live">
						<Preview />
					</div>
					<div class="fx" aria-hidden="true">
						<i class="phosphors"></i>
						<i class="scanlines"></i>
						<i class="beam"></i>
						<i class="vignette"></i>
						<i class="glare"></i>
					</div>
				</div>
			</div>

			<div class="card" id="{uid}-card">
				<p class="stamp">★ {game.genre} ★</p>
				<p class="how">{game.tagline}</p>
				<p class="blurb">{game.blurb}</p>
				<p class="coinline">{game.players} players · 1 coin · 1 play</p>
			</div>

			<div class="vents" aria-hidden="true">
				<span></span>
				<span></span>
			</div>
		</div>

		<div class="shelf" aria-hidden="true">
			<span class="stick"><em></em><b></b></span>
			<span class="pads">
				<i class="a"></i>
				<i class="b"></i>
				<i class="c"></i>
			</span>
			<span class="start">Insert coin</span>
		</div>

		<div class="base" aria-hidden="true">
			<div class="door">
				<i class="screw l"></i>
				<span class="slot"></span>
				<i class="lock"></i>
				<i class="screw r"></i>
			</div>
		</div>
	</button>

	<div class="plinth" aria-hidden="true"></div>
	<div class="shadow" aria-hidden="true"></div>
</article>

<style>
	.cab {
		position: relative;
		isolation: isolate;
		contain: layout paint;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
		transform-style: preserve-3d;
		transition: transform 220ms ease;
	}

	.cab.hot,
	.cab:hover {
		transform: translate3d(0, -10px, 0) scale(1.015);
		z-index: 2;
	}

	.cab.hot .front,
	.cab:hover .front {
		box-shadow: 0 0 28px color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.side {
		position: absolute;
		top: 7%;
		bottom: 7%;
		width: 22px;
		z-index: 0;
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 40%),
			repeating-linear-gradient(180deg, #1a1220 0 3px, #120c18 3px 6px);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
	}

	.side.left {
		left: -14px;
		transform: perspective(240px) rotateY(28deg);
		transform-origin: right center;
		border-left: 3px solid var(--accent);
	}

	.side.right {
		right: -14px;
		transform: perspective(240px) rotateY(-28deg);
		transform-origin: left center;
		border-right: 3px solid var(--glow);
	}

	.marquee {
		position: relative;
		z-index: 3;
		width: 108%;
		margin: 0 -4%;
		padding: 8px 12px 10px;
		border-radius: 8px 8px 2px 2px;
		background:
			linear-gradient(180deg, #3a2248, #140816 58%, #0a050e);
		box-shadow:
			0 10px 0 #050208,
			inset 0 1px 0 rgba(255, 255, 255, 0.18),
			0 0 22px color-mix(in srgb, var(--glow) 40%, transparent);
	}

	.marquee strong {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
		font-family: Bungee, Impact, sans-serif;
		font-size: clamp(0.95rem, 2.2vw, 1.35rem);
		letter-spacing: 0.06em;
		color: #fff6c8;
		text-shadow:
			0 0 6px var(--glow),
			0 0 18px var(--accent),
			0 2px 0 #1a0810;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 4px 0;
	}

	.marquee img {
		width: 1.15em;
		height: 1.15em;
		border-radius: 6px;
		flex-shrink: 0;
		box-shadow: 0 0 10px color-mix(in srgb, var(--glow) 35%, transparent);
	}

	.marquee span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rim {
		display: flex;
		justify-content: space-between;
		gap: 4px;
	}

	.rim i {
		flex: 1;
		height: 7px;
		border-radius: 50%;
		background: #ffe14a;
		opacity: 0.22;
		box-shadow: 0 0 6px #ffe14a;
		animation: chase 1.35s linear infinite;
		animation-delay: calc(var(--n) * -0.09s);
	}

	.front {
		position: relative;
		z-index: 2;
		appearance: none;
		border: 0;
		width: 100%;
		margin: 0;
		padding: 0;
		cursor: pointer;
		color: inherit;
		text-align: left;
		font: inherit;
		background: transparent;
	}

	.hood {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, #1c1228), var(--body) 22%, #0a0712);
		padding: 10px 14px 12px;
		border: 1px solid color-mix(in srgb, var(--accent) 28%, #000);
		border-top: 0;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.crt {
		padding: 14px 12px 12px;
		border-radius: 18px;
		background:
			linear-gradient(180deg, #2a2434, #121018 40%, #07060c);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.08),
			0 0 0 2px #050308,
			0 16px 24px rgba(0, 0, 0, 0.45);
	}

	.tube {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 18% / 13%;
		overflow: hidden;
		background: #050308;
		contain: layout paint;
		box-shadow:
			inset 0 0 0 3px #161018,
			inset 0 0 22px 8px rgba(0, 0, 0, 0.82),
			0 0 18px color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.cab.hot .tube,
	.front:hover .tube,
	.front:focus-visible .tube {
		box-shadow:
			inset 0 0 0 3px #1c1424,
			inset 0 0 18px 6px rgba(0, 0, 0, 0.7),
			0 0 28px color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.live {
		position: absolute;
		inset: -4%;
		contain: layout paint;
		transform: perspective(520px) rotateX(2.5deg) scale(1.04);
		transform-origin: 50% 50%;
	}

	.fx,
	.fx i {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.fx {
		z-index: 2;
		isolation: isolate;
		transform: translateZ(0);
	}

	.phosphors {
		background: repeating-linear-gradient(
			90deg,
			rgba(255, 50, 80, 0.08) 0 1px,
			rgba(40, 255, 110, 0.05) 1px 2px,
			rgba(60, 110, 255, 0.07) 2px 3px
		);
		mix-blend-mode: overlay;
		opacity: 0.82;
		animation: phosphor 3.8s ease-in-out infinite;
	}

	.scanlines {
		background: repeating-linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.32) 0 1px,
			rgba(255, 255, 255, 0.04) 1px 2px,
			transparent 2px 4px
		);
		mix-blend-mode: multiply;
		opacity: 0.55;
	}

	.beam {
		inset: auto 0 auto 0;
		top: 0;
		height: 38%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(190, 255, 230, 0.05) 38%,
			rgba(255, 255, 255, 0.16) 50%,
			rgba(190, 255, 230, 0.05) 62%,
			transparent 100%
		);
		mix-blend-mode: screen;
		animation: beamSweep 6.4s linear infinite;
		will-change: transform;
	}

	.vignette {
		background:
			radial-gradient(ellipse 82% 76% at 50% 48%, transparent 54%, rgba(0, 0, 0, 0.18) 82%, rgba(0, 0, 0, 0.46) 100%);
		box-shadow: inset 0 0 28px 10px rgba(0, 0, 0, 0.38);
	}

	.glare {
		background: linear-gradient(
			118deg,
			rgba(255, 255, 255, 0.28),
			transparent 26%,
			transparent 58%,
			rgba(180, 230, 255, 0.1)
		);
		opacity: 0.85;
	}

	.card {
		margin-top: 10px;
		padding: 8px 10px 9px;
		border-radius: 3px;
		background:
			repeating-linear-gradient(0deg, rgba(90, 40, 10, 0.05) 0 2px, transparent 2px 4px),
			linear-gradient(180deg, #f6e2b8, #e2c48a);
		color: #2a140c;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.45) inset,
			0 2px 0 rgba(0, 0, 0, 0.25);
		transform: rotate(-0.4deg);
	}

	.stamp {
		margin: 0;
		text-align: center;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.58rem;
		font-weight: 800;
		color: #b4202a;
	}

	.how {
		margin: 4px 0 0;
		text-align: center;
		font-family: Bungee, Impact, sans-serif;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		line-height: 1.25;
	}

	.blurb {
		margin: 6px 0 0;
		font-size: 0.78rem;
		line-height: 1.4;
		color: #3a2218;
	}

	.coinline {
		margin: 7px 0 0;
		text-align: center;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.58rem;
		font-weight: 800;
		color: #1a1a1a;
	}

	.vents {
		display: flex;
		justify-content: space-between;
		padding: 10px 18px 0;
	}

	.vents span {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background:
			radial-gradient(circle at 50% 50%, transparent 36%, #09060e 37%),
			repeating-radial-gradient(circle at 50% 50%, #0c0a12 0 3px, #3a3348 3px 4px);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.65), 0 0 0 2px #050308;
	}

	.shelf {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 14px 18px 16px;
		clip-path: polygon(5% 0, 95% 0, 100% 100%, 0 100%);
		background:
			linear-gradient(180deg, #2c2438, #16121f 55%, #0c0a12);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.12),
			0 8px 0 #050308;
	}

	.stick {
		width: 40px;
		height: 28px;
		border-radius: 40%;
		background: radial-gradient(circle at 50% 30%, #3a3348, #120e18);
		position: relative;
		box-shadow: inset 0 -4px 0 #050308;
	}

	.stick em {
		position: absolute;
		left: 50%;
		bottom: 10px;
		width: 7px;
		height: 22px;
		border-radius: 3px;
		background: linear-gradient(180deg, #8a8a98, #2a2a32);
		translate: -50% 0;
		transform-origin: 50% 100%;
	}

	.stick b {
		position: absolute;
		left: 50%;
		bottom: 26px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: radial-gradient(circle at 32% 28%, #fff, var(--glow) 42%, #4a0814);
		translate: -50% 0;
		transform-origin: 50% 180%;
		animation: wiggle 2.2s ease-in-out infinite;
		will-change: transform;
		box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
	}

	.cab.hot .stick b,
	.front:hover .stick b {
		animation-duration: 0.7s;
	}

	.pads {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.pads i {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		box-shadow:
			inset 0 -3px 0 rgba(0, 0, 0, 0.35),
			0 3px 0 #050308;
	}

	.pads .a {
		background: radial-gradient(circle at 35% 30%, #ff8aa8, var(--glow));
	}

	.pads .b {
		background: radial-gradient(circle at 35% 30%, #9ff7fa, var(--accent));
	}

	.pads .c {
		background: radial-gradient(circle at 35% 30%, #fff4b0, #ffe14a);
	}

	.start {
		padding: 8px 12px;
		border-radius: 6px;
		font-family: Bungee, Impact, sans-serif;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #140816;
		background: linear-gradient(180deg, #fff1a8, #ff9d2e 58%, #ff5a1f);
		box-shadow:
			0 4px 0 #7a2208,
			inset 0 1px 0 rgba(255, 255, 255, 0.55);
		animation: blink 1.1s steps(2, jump-none) infinite;
	}

	.base {
		background: linear-gradient(180deg, #141018, #09070e);
		padding: 10px 22px 14px;
		border-radius: 0 0 8px 8px;
	}

	.door {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 36px;
		border-radius: 4px;
		background:
			linear-gradient(180deg, #6a6a72, #3a3a44 48%, #2a2a32);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 0 #050308;
	}

	.slot {
		width: 56px;
		height: 7px;
		border-radius: 2px;
		background: #050308;
		box-shadow: 0 0 0 1px rgba(255, 225, 74, 0.22);
	}

	.lock {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #c8c4b0, #5a5648);
		box-shadow: inset 0 0 0 2px #2a2818;
	}

	.screw {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: conic-gradient(from 40deg, #9a9688, #4a4840, #c8c4b8, #4a4840);
	}

	.screw.l {
		margin-right: auto;
		margin-left: 8px;
	}

	.screw.r {
		margin-left: auto;
		margin-right: 8px;
	}

	.plinth {
		height: 10px;
		margin: 0 8%;
		background: #050308;
		border-radius: 0 0 6px 6px;
	}

	.shadow {
		width: 84%;
		height: 18px;
		margin: 8px auto 0;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(0, 0, 0, 0.62), transparent 70%);
		transform: translateZ(0);
	}

	.cab.hot .shadow,
	.cab:hover .shadow {
		transform: translateZ(0) scale(1.06);
		opacity: 0.9;
	}

	@keyframes chase {
		0%,
		100% {
			opacity: 0.18;
		}
		40% {
			opacity: 1;
		}
	}

	@keyframes beamSweep {
		from {
			transform: translate3d(0, -80%, 0);
		}
		to {
			transform: translate3d(0, 220%, 0);
		}
	}

	@keyframes phosphor {
		0%,
		100% {
			opacity: 0.74;
		}
		50% {
			opacity: 0.92;
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			rotate: -14deg;
		}
		50% {
			rotate: 16deg;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cab,
		.cab.hot,
		.cab:hover,
		.rim i,
		.phosphors,
		.beam,
		.stick b,
		.start {
			animation: none;
			transition: none;
			transform: none;
			filter: none;
		}

		.rim i {
			opacity: 0.7;
		}
	}
</style>
