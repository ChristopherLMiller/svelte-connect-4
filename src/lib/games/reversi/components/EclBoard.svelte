<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import EclDisc from './EclDisc.svelte';
	import EclLight from './EclLight.svelte';
	import { playSelect } from '../audio';
	import { eclView } from '../settings.svelte';
	import { MOON, nameOf, opponent, SUN, type Player } from '../types';
	import type { EclSession } from '../session.svelte';

	let { session }: { session: EclSession } = $props();

	const ids = $props.id();
	const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	const cells = Array.from({ length: 64 }, (_, i) => i);
	// Noise stretched along each rail so the grain runs with the timber, in 1000-unit frame space.
	const grains = [
		['h', '0.0016 0.05'],
		['v', '0.05 0.0016']
	] as const;
	const rivets = [
		[2, 2],
		[2, 6],
		[6, 2],
		[6, 6]
	];

	// Twelve sun rays as one path, alternating long and short.
	const rays = Array.from({ length: 24 }, (_, i) => {
		const a = (i / 24) * Math.PI * 2;
		const long = i % 2 === 0;
		const r0 = 21;
		const r1 = long ? 37 : 30;
		const spread = long ? 0.09 : 0.07;
		const pt = (r: number, t: number) => `${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`;
		return `M${pt(r0, a - spread)} L${pt(r1, a)} L${pt(r0, a + spread)} Z`;
	}).join(' ');

	// Constellations engraved faintly into the enamel, in board percent.
	const stars: Array<[number, number]> = [
		[8, 14], [17, 9], [27, 16], [33, 27], [68, 10], [77, 18], [88, 12], [84, 30],
		[12, 70], [20, 82], [31, 76], [70, 72], [79, 85], [91, 78], [58, 90], [46, 60]
	];
	const lines: Array<[number, number]> = [
		[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [5, 7], [8, 9], [9, 10], [11, 12], [12, 13], [12, 14]
	];

	const legal = $derived(new Set(eclView.hints && !session.aiTurn && !session.busy ? session.moves : []));
	const mine = $derived(new Set(session.moves));
	const humanTurn = $derived(!session.aiTurn && !session.busy);

	// Direction the eclipse crosses each flipped disc, so it turns about the right axis.
	const axes = $derived.by(() => {
		const map: Record<number, number> = {};
		const e = session.eclipse;
		if (!e) return map;
		const r0 = e.origin >> 3;
		const c0 = e.origin & 7;
		for (const line of e.lines) {
			for (const cell of line) {
				map[cell] = (Math.atan2((cell >> 3) - r0, (cell & 7) - c0) * 180) / Math.PI;
			}
		}
		return map;
	});

	function label(i: number) {
		const v = session.board[i];
		const side = v === MOON ? 'moon' : v === SUN ? 'sun' : mine.has(i) ? 'open, playable' : 'empty';
		return `${files[i & 7]}${8 - (i >> 3)}, ${side}`;
	}

	function enter(i: number) {
		if (!humanTurn) return;
		if (session.hover !== i && mine.has(i)) playSelect();
		session.setHover(i);
	}

	const passer = $derived<Player | null>(session.pass ? session.pass.player : null);
	const faces = $derived(eclView.pieces === 'classic' ? (['black', 'white'] as const) : (['moon', 'sun'] as const));
	const CORNERS = new Set([0, 7, 56, 63]);
</script>

<svg class="defs" aria-hidden="true" width="0" height="0">
	<defs>
		<radialGradient id="{ids}-silver" cx="36%" cy="30%" r="75%">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="0.28" stop-color="#e4e9f3" />
			<stop offset="0.7" stop-color="#9aa5bf" />
			<stop offset="1" stop-color="#5b6582" />
		</radialGradient>
		<radialGradient id="{ids}-gold" cx="36%" cy="30%" r="75%">
			<stop offset="0" stop-color="#fff6d2" />
			<stop offset="0.3" stop-color="#f4cf74" />
			<stop offset="0.72" stop-color="#c38a2e" />
			<stop offset="1" stop-color="#6e4512" />
		</radialGradient>
		<radialGradient id="{ids}-core" cx="40%" cy="34%" r="70%">
			<stop offset="0" stop-color="#fffbe6" />
			<stop offset="0.6" stop-color="#f6d27a" />
			<stop offset="1" stop-color="#b47a24" />
		</radialGradient>
		<mask id="{ids}-crescent">
			<circle r="25" cx="-3" cy="0" fill="#fff" />
			<circle r="21" cx="8" cy="-5" fill="#000" />
		</mask>
		<symbol id="{ids}-moon" viewBox="-50 -50 100 100">
			<circle r="48" fill="url(#{ids}-silver)" />
			<circle r="48" fill="none" stroke="rgba(30,36,60,0.55)" stroke-width="2" />
			<circle r="43" fill="none" stroke="rgba(50,60,90,0.35)" stroke-width="1" />
			<circle r="41.6" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.8" />
			<circle r="25" cx="-3" fill="rgba(60,70,104,0.5)" mask="url(#{ids}-crescent)" />
			<circle r="25" cx="-2.2" cy="0.8" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" mask="url(#{ids}-crescent)" />
			<circle r="1.6" cx="20" cy="-18" fill="rgba(60,70,104,0.55)" />
			<circle r="1.1" cx="27" cy="2" fill="rgba(60,70,104,0.5)" />
			<circle r="1.3" cx="15" cy="19" fill="rgba(60,70,104,0.5)" />
		</symbol>
		<symbol id="{ids}-sun" viewBox="-50 -50 100 100">
			<circle r="48" fill="url(#{ids}-gold)" />
			<circle r="48" fill="none" stroke="rgba(70,40,8,0.6)" stroke-width="2" />
			<circle r="43" fill="none" stroke="rgba(90,55,10,0.38)" stroke-width="1" />
			<circle r="41.6" fill="none" stroke="rgba(255,240,200,0.55)" stroke-width="0.8" />
			<path d={rays} fill="rgba(120,72,14,0.42)" />
			<circle r="16" fill="url(#{ids}-core)" stroke="rgba(110,66,12,0.55)" stroke-width="1.2" />
			<circle r="11" fill="none" stroke="rgba(150,96,24,0.35)" stroke-width="0.8" />
		</symbol>
		<radialGradient id="{ids}-ebony" cx="36%" cy="28%" r="78%">
			<stop offset="0" stop-color="#70747e" />
			<stop offset="0.22" stop-color="#30333b" />
			<stop offset="0.62" stop-color="#121318" />
			<stop offset="1" stop-color="#030304" />
		</radialGradient>
		<radialGradient id="{ids}-ivory" cx="36%" cy="28%" r="78%">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="0.4" stop-color="#f1efe9" />
			<stop offset="0.8" stop-color="#cfccc4" />
			<stop offset="1" stop-color="#93908a" />
		</radialGradient>
		<symbol id="{ids}-black" viewBox="-50 -50 100 100">
			<circle r="48" fill="url(#{ids}-ebony)" />
			<circle r="47.6" fill="none" stroke="rgba(160,172,196,0.42)" stroke-width="1.6" />
			<circle r="40" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.2" />
			<path d="M-30 -22A36 36 0 0 1 10 -36" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3.2" stroke-linecap="round" />
		</symbol>
		<symbol id="{ids}-white" viewBox="-50 -50 100 100">
			<circle r="48" fill="url(#{ids}-ivory)" />
			<circle r="48" fill="none" stroke="rgba(60,58,52,0.55)" stroke-width="2" />
			<circle r="40" fill="none" stroke="rgba(110,104,96,0.22)" stroke-width="1.2" />
			<path d="M-30 -22A36 36 0 0 1 10 -36" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3.2" stroke-linecap="round" />
		</symbol>
		<symbol id="{ids}-compass" viewBox="-50 -50 100 100">
			<circle r="30" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />
			<path d="M0 -40L6 -6L40 0L6 6L0 40L-6 6L-40 0L-6 -6Z" fill="currentColor" opacity="0.8" />
			<path d="M0 -22L3 -3L22 0L3 3L0 22L-3 3L-22 0L-3 -3Z" fill="currentColor" transform="rotate(45)" opacity="0.5" />
		</symbol>
	</defs>
</svg>

<div class="frame" class:moonTurn={session.current === MOON} class:sunTurn={session.current === SUN}>
	<svg class="wood" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
		<defs>
			<clipPath id="{ids}-round">
				<rect width="1000" height="1000" rx="32" />
			</clipPath>
			<linearGradient id="{ids}-walnut" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#6e4026" />
				<stop offset="0.45" stop-color="#4c2816" />
				<stop offset="1" stop-color="#2a150a" />
			</linearGradient>
			{#each grains as [dir, freq] (dir)}
				<filter
					id="{ids}-grain-{dir}"
					x="0"
					y="0"
					width="100%"
					height="100%"
					color-interpolation-filters="sRGB"
				>
					<feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="4" seed="11" result="noise" />
					<feComponentTransfer in="noise" result="rings">
						<feFuncR type="table" tableValues="0 1 0.15 0.85 0 0.95 0.1 0.8 0 1 0" />
					</feComponentTransfer>
					<feColorMatrix
						in="rings"
						type="matrix"
						values="0 0 0 0 0.08  0 0 0 0 0.035  0 0 0 0 0.012  0.75 0 0 0 -0.18"
						result="dark"
					/>
					<feColorMatrix
						in="noise"
						type="matrix"
						values="0 0 0 0 0.86  0 0 0 0 0.56  0 0 0 0 0.32  0 1.5 0 0 -0.8"
						result="light"
					/>
					<feMerge result="grain">
						<feMergeNode in="SourceGraphic" />
						<feMergeNode in="dark" />
						<feMergeNode in="light" />
					</feMerge>
					<feComposite in="grain" in2="SourceAlpha" operator="in" />
				</filter>
			{/each}
			<linearGradient id="{ids}-varnish" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#fff2dc" stop-opacity="0.16" />
				<stop offset="0.3" stop-color="#fff2dc" stop-opacity="0.02" />
				<stop offset="0.62" stop-color="#000" stop-opacity="0" />
				<stop offset="1" stop-color="#000" stop-opacity="0.32" />
			</linearGradient>
			<linearGradient id="{ids}-brass" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#ecd294" />
				<stop offset="0.35" stop-color="#b98a3e" />
				<stop offset="0.7" stop-color="#6e4a18" />
				<stop offset="1" stop-color="#c9a050" />
			</linearGradient>
			<filter id="{ids}-soft" x="-5%" y="-5%" width="110%" height="110%">
				<feGaussianBlur stdDeviation="5" />
			</filter>
			<path
				id="{ids}-guard"
				d="M0 32Q0 0 32 0H92L80 16H34Q16 16 16 34V80L0 92Z"
			/>
		</defs>
		<g clip-path="url(#{ids}-round)">
			<polygon points="0,0 1000,0 940,60 60,60" fill="url(#{ids}-walnut)" filter="url(#{ids}-grain-h)" />
			<polygon points="0,1000 60,940 940,940 1000,1000" fill="url(#{ids}-walnut)" filter="url(#{ids}-grain-h)" />
			<polygon points="0,0 60,60 60,940 0,1000" fill="url(#{ids}-walnut)" filter="url(#{ids}-grain-v)" />
			<polygon points="1000,0 1000,1000 940,940 940,60" fill="url(#{ids}-walnut)" filter="url(#{ids}-grain-v)" />
			<polygon points="0,0 60,60 60,940 0,1000" fill="#1a0c05" opacity="0.1" />
			<polygon points="1000,0 1000,1000 940,940 940,60" fill="#1a0c05" opacity="0.22" />
			<polygon points="0,1000 60,940 940,940 1000,1000" fill="#1a0c05" opacity="0.28" />
			<g class="mitres">
				<path d="M0 0L60 60M1000 0L940 60M0 1000L60 940M1000 1000L940 940" />
				<path class="lit" d="M1.5 0L61.5 60M1001.5 0L941.5 60M1.5 1000L61.5 940M1001.5 1000L941.5 940" />
			</g>
			<rect class="string ebony" x="11" y="11" width="978" height="978" rx="22" />
			<rect class="string boxwood" x="13" y="13" width="974" height="974" rx="20" />
			<rect width="1000" height="1000" fill="url(#{ids}-varnish)" />
			<rect
				x="54"
				y="54"
				width="892"
				height="892"
				rx="10"
				fill="none"
				stroke="rgba(8,3,1,0.7)"
				stroke-width="14"
				filter="url(#{ids}-soft)"
			/>
			<rect class="rim" x="1" y="1" width="998" height="998" rx="31" />
			{#each [0, 90, 180, 270] as turn (turn)}
				<g transform="rotate({turn} 500 500)">
					<use href="#{ids}-guard" fill="rgba(0,0,0,0.45)" transform="translate(2 3)" />
					<use href="#{ids}-guard" fill="url(#{ids}-brass)" />
					<use href="#{ids}-guard" fill="none" stroke="rgba(255,240,200,0.3)" stroke-width="1" />
					<circle cx="56" cy="8" r="3.6" class="screw" />
					<circle cx="8" cy="56" r="3.6" class="screw" />
				</g>
			{/each}
		</g>
	</svg>
	<ol class="ranks left" aria-hidden="true">
		{#each Array.from({ length: 8 }, (_, i) => 8 - i) as rank (rank)}<li>{rank}</li>{/each}
	</ol>
	<ol class="files top" aria-hidden="true">
		{#each files as file (file)}<li>{file}</li>{/each}
	</ol>
	<div class="bezel">
		<div class="surface">
			<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
				{#each lines as [a, b] (a * 100 + b)}
					<line x1={stars[a][0]} y1={stars[a][1]} x2={stars[b][0]} y2={stars[b][1]} />
				{/each}
				{#each stars as [x, y], i (i)}
					<circle cx={x} cy={y} r="0.55" style:--n={i} />
				{/each}
			</svg>
			<span class="meteor" aria-hidden="true"></span>
			<div class="grid" role="grid" aria-label="Eclipse board">
				{#each cells as i (i)}
					{@const v = session.board[i]}
					<button
						type="button"
						class="cell"
						class:legal={legal.has(i)}
						class:cursor={session.cursor === i && session.screen === 'play' && session.status.type === 'playing'}
						class:aim={session.aiTurn && session.hover === i}
						aria-label={label(i)}
						onpointerenter={() => enter(i)}
						onpointerleave={() => session.setHover(null)}
						onclick={() => void session.playSquare(i)}
					>
						{#if v}
							<EclDisc
								player={v as Player}
								{ids}
								{faces}
								delay={session.delays[i] ?? 0}
								axis={axes[i] ?? 0}
								last={session.lastMove === i}
								corner={CORNERS.has(i)}
							/>
						{:else}
							{#if CORNERS.has(i)}
								<svg class="compass" viewBox="0 0 100 100" aria-hidden="true"><use href="#{ids}-compass" /></svg>
							{/if}
							{#if humanTurn && session.hover === i && mine.has(i)}
								<span class="ghost" transition:fade={{ duration: 120 }}>
									<svg viewBox="0 0 100 100"><use href="#{ids}-{faces[session.current === MOON ? 0 : 1]}" /></svg>
								</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
			{#each rivets as [r, c] (r * 8 + c)}
				<i class="rivet" style:left="{c * 12.5}%" style:top="{r * 12.5}%"></i>
			{/each}
			<EclLight eclipse={session.eclipse} flare={session.flare} />
			{#if session.pass && passer}
				{#key session.pass.key}
					<div class="pass" in:fly={{ y: 10, duration: 320 }} out:fade={{ duration: 300 }}>
						<small>{nameOf(passer)} has no move</small>
						<b>{nameOf(opponent(passer))} plays again</b>
					</div>
				{/key}
			{/if}
		</div>
	</div>
</div>

<style>
	.defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}

	.frame {
		--size: min(96cqw, 96cqh);
		position: relative;
		width: var(--size);
		height: var(--size);
		padding: 5.2%;
		box-sizing: border-box;
		border-radius: 3.2%;
		background: #3a1e10;
		box-shadow:
			0 30px 60px rgba(0, 0, 0, 0.6),
			0 8px 18px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(10, 4, 2, 0.8);
		transition: box-shadow 600ms ease;
	}

	.frame.moonTurn {
		box-shadow:
			0 30px 60px rgba(0, 0, 0, 0.6),
			0 8px 18px rgba(0, 0, 0, 0.45),
			0 0 44px rgba(159, 184, 232, 0.16),
			0 0 0 1px rgba(10, 4, 2, 0.8);
	}

	.frame.sunTurn {
		box-shadow:
			0 30px 60px rgba(0, 0, 0, 0.6),
			0 8px 18px rgba(0, 0, 0, 0.45),
			0 0 44px rgba(232, 184, 90, 0.2),
			0 0 0 1px rgba(10, 4, 2, 0.8);
	}

	.wood {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transform: translateZ(0);
	}

	.mitres path {
		stroke: rgba(14, 6, 2, 0.85);
		stroke-width: 1.6;
		vector-effect: non-scaling-stroke;
	}

	.mitres path.lit {
		stroke: rgba(255, 214, 160, 0.14);
		stroke-width: 1;
	}

	.string {
		fill: none;
		vector-effect: non-scaling-stroke;
	}

	.string.ebony {
		stroke: rgba(12, 5, 2, 0.75);
		stroke-width: 2.4;
	}

	.string.boxwood {
		stroke: rgba(226, 184, 106, 0.7);
		stroke-width: 1.4;
	}

	.rim {
		fill: none;
		stroke: rgba(255, 222, 176, 0.22);
		stroke-width: 1.2;
		vector-effect: non-scaling-stroke;
	}

	.screw {
		fill: #6e4a14;
		stroke: rgba(255, 236, 190, 0.55);
		stroke-width: 0.8;
	}

	.ranks,
	.files {
		position: absolute;
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		color: rgba(232, 196, 122, 0.78);
		text-shadow:
			0 -1px 0 rgba(10, 4, 1, 0.85),
			0 1px 0 rgba(255, 220, 170, 0.14);
		font-family: Jost, ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: calc(var(--size) * 0.024);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		pointer-events: none;
	}

	.ranks {
		left: 0;
		top: 6.4%;
		bottom: 6.4%;
		width: 5.2%;
		grid-template-rows: repeat(8, 1fr);
		place-items: center;
	}

	.files {
		top: 0;
		left: 6.4%;
		right: 6.4%;
		height: 5.2%;
		grid-template-columns: repeat(8, 1fr);
		place-items: center;
	}

	.bezel {
		position: relative;
		height: 100%;
		padding: 1.4%;
		box-sizing: border-box;
		border-radius: 1.6%;
		background: linear-gradient(145deg, #f6dc98, #c08a35 35%, #7a5218 60%, #e2b65c 85%, #8a5c1c);
		box-shadow:
			inset 0 1px 1px rgba(255, 245, 210, 0.7),
			inset 0 -1px 2px rgba(40, 24, 6, 0.6),
			0 2px 6px rgba(0, 0, 0, 0.45);
	}

	.surface {
		position: relative;
		height: 100%;
		border-radius: 0.8%;
		background: linear-gradient(145deg, #e4bd6a, #9b6c26 45%, #d8ac56);
		box-shadow: inset 0 0 0 1px rgba(40, 24, 6, 0.5);
	}

	.chart {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
		pointer-events: none;
		opacity: 0.28;
		will-change: transform;
	}

	.chart line {
		stroke: #e8c477;
		stroke-width: 0.18;
		stroke-dasharray: 0.6 0.5;
		vector-effect: non-scaling-stroke;
	}

	.chart circle {
		fill: #fff2c8;
		animation: twinkle 4.2s ease-in-out infinite;
		animation-delay: calc(var(--n) * -0.53s);
	}

	.meteor {
		position: absolute;
		inset: 0;
		z-index: 2;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
	}

	.meteor::before {
		content: '';
		position: absolute;
		top: 14%;
		left: -30%;
		width: 26%;
		height: max(1.5px, calc(var(--size) * 0.003));
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, rgba(255, 236, 200, 0.95));
		filter: drop-shadow(0 0 4px rgba(255, 220, 150, 0.9));
		opacity: 0;
		transform: rotate(22deg);
		animation: meteor 14s linear 5s infinite;
	}

	.bezel::after {
		content: '';
		position: absolute;
		inset: 0;
		padding: 1.4%;
		border-radius: inherit;
		pointer-events: none;
		background: linear-gradient(
			105deg,
			transparent 42%,
			rgba(255, 250, 225, 0.85) 50%,
			transparent 58%
		);
		background-size: 300% 100%;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		will-change: transform;
		animation: sheen 9s ease-in-out infinite;
	}

	.compass {
		position: absolute;
		inset: 20%;
		width: 60%;
		height: 60%;
		color: rgba(232, 184, 90, 0.34);
		pointer-events: none;
		animation: spin 60s linear infinite;
	}

	.grid {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		gap: max(1.5px, calc(var(--size) * 0.0028));
		padding: max(1.5px, calc(var(--size) * 0.0028));
		box-sizing: border-box;
	}

	.cell {
		appearance: none;
		position: relative;
		border: 0;
		margin: 0;
		padding: 0;
		cursor: default;
		background:
			radial-gradient(circle at 50% 42%, rgba(70, 90, 160, 0.22), transparent 70%),
			radial-gradient(1px 1px at 22% 30%, rgba(255, 255, 255, 0.55), transparent),
			radial-gradient(1px 1px at 74% 64%, rgba(255, 255, 255, 0.4), transparent),
			linear-gradient(160deg, #18204a, #0c1130 60%, #090c22);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.7),
			inset 0 -1px 0 rgba(140, 160, 230, 0.08);
		transition: background-color 160ms ease;
		outline-offset: -3px;
	}

	.cell:nth-child(3n + 1) {
		background:
			radial-gradient(circle at 50% 42%, rgba(70, 90, 160, 0.22), transparent 70%),
			radial-gradient(1px 1px at 64% 22%, rgba(255, 255, 255, 0.5), transparent),
			linear-gradient(160deg, #18204a, #0c1130 60%, #090c22);
	}

	.cell.legal {
		cursor: pointer;
	}

	.cell.legal::after {
		content: '';
		position: absolute;
		inset: 33%;
		border-radius: 50%;
		border: max(1px, calc(var(--size) * 0.0028)) solid rgba(232, 184, 90, 0.65);
		box-shadow:
			0 0 8px rgba(232, 184, 90, 0.35),
			inset 0 0 6px rgba(232, 184, 90, 0.25);
		animation: breathe 2.6s ease-in-out infinite;
		pointer-events: none;
	}

	.moonTurn .cell.legal::after {
		border-color: rgba(190, 206, 240, 0.7);
		box-shadow:
			0 0 8px rgba(159, 184, 232, 0.4),
			inset 0 0 6px rgba(159, 184, 232, 0.25);
	}

	.cell.cursor::before,
	.cell.aim::before {
		content: '';
		position: absolute;
		inset: 5%;
		z-index: 3;
		pointer-events: none;
		--c: rgba(244, 213, 138, 0.9);
		--l: 26%;
		--t: max(1.5px, calc(var(--size) * 0.0035));
		background:
			linear-gradient(var(--c), var(--c)) top left / var(--l) var(--t) no-repeat,
			linear-gradient(var(--c), var(--c)) top left / var(--t) var(--l) no-repeat,
			linear-gradient(var(--c), var(--c)) top right / var(--l) var(--t) no-repeat,
			linear-gradient(var(--c), var(--c)) top right / var(--t) var(--l) no-repeat,
			linear-gradient(var(--c), var(--c)) bottom left / var(--l) var(--t) no-repeat,
			linear-gradient(var(--c), var(--c)) bottom left / var(--t) var(--l) no-repeat,
			linear-gradient(var(--c), var(--c)) bottom right / var(--l) var(--t) no-repeat,
			linear-gradient(var(--c), var(--c)) bottom right / var(--t) var(--l) no-repeat;
		filter: drop-shadow(0 0 4px rgba(232, 184, 90, 0.6));
	}

	.cell.aim::before {
		--c: rgba(255, 220, 150, 0.95);
		animation: aim 0.9s ease-in-out infinite;
	}

	.ghost {
		position: absolute;
		inset: 7%;
		opacity: 0.42;
		pointer-events: none;
	}

	.ghost svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.rivet {
		position: absolute;
		z-index: 3;
		width: calc(var(--size) * 0.018);
		aspect-ratio: 1;
		translate: -50% -50%;
		border-radius: 50%;
		pointer-events: none;
		background: radial-gradient(circle at 35% 30%, #fff3c8, #d6a650 50%, #6e4a14);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
	}

	.pass {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 6;
		translate: -50% -50%;
		display: grid;
		gap: 2px;
		padding: 12px 22px 14px;
		border-radius: 999px;
		text-align: center;
		pointer-events: none;
		color: #f1e6cf;
		background: rgba(12, 12, 30, 0.82);
		border: 1px solid rgba(232, 184, 90, 0.5);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
	}

	.pass small {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		color: #e8b85a;
	}

	.pass b {
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: 1.3rem;
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.55;
			scale: 0.94;
		}
		50% {
			opacity: 1;
			scale: 1.04;
		}
	}

	@keyframes aim {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes meteor {
		0% {
			opacity: 0;
			transform: rotate(22deg) translateX(0);
		}
		1% {
			opacity: 1;
		}
		7% {
			opacity: 0;
			transform: rotate(22deg) translateX(620%);
		}
		100% {
			opacity: 0;
			transform: rotate(22deg) translateX(620%);
		}
	}

	@keyframes sheen {
		0%,
		30% {
			background-position: 100% 0;
		}
		70%,
		100% {
			background-position: 0% 0;
		}
	}

	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cell.legal::after,
		.cell.aim::before,
		.chart circle,
		.meteor::before,
		.bezel::after,
		.compass {
			animation: none;
		}
	}
</style>
