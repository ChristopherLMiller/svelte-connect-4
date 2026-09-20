<script lang="ts">
	import Disc from '$lib/components/Disc.svelte';
	import Explosion from '$lib/components/Explosion.svelte';
	import { playHover, playLock, playThreat } from '$lib/game/audio';
	import { isValidMove } from '$lib/game/engine';
	import { computeLayout, discX, discY, holeCenter } from '$lib/game/layout';
	import type { GameSession } from '$lib/game/session.svelte';
	import { lookSettings } from '$lib/game/settings.svelte';
	import { COLS, ROWS } from '$lib/game/types';

	const uid = $props.id();
	let { session }: { session: GameSession } = $props();

	let availableW = $state(960);
	let availableH = $state(760);
	const layout = $derived(computeLayout(availableW, availableH));
	const protocol = $derived(lookSettings.skin === 'protocol');
	const landingRow = $derived.by(() => {
		if (session.hoverCol === null) return -1;
		for (let row = ROWS - 1; row >= 0; row -= 1) {
			if (session.board[row][session.hoverCol] === 0) return row;
		}
		return -1;
	});
	const livePiece = $derived(session.pieces.find((piece) => !piece.settled) ?? null);
	const wellCol = $derived(livePiece?.col ?? session.hoverCol);
	const showGhost = $derived(session.hoverCol !== null && landingRow !== -1 && !session.animating);
	const showWell = $derived(wellCol !== null && (livePiece !== null || landingRow !== -1));
	const winLine = $derived.by(() => {
		if (session.status.type !== 'won') return '';
		return session.status.cells
			.map(
				([row, col]) =>
					`${discX(layout, col) + layout.disc / 2},${discY(layout, row) + layout.disc / 2}`
			)
			.join(' ');
	});
	const winColor = $derived(
		session.status.type === 'won' && session.status.winner === 1 ? '#ff335c' : '#f5c24b'
	);
	const killCols = $derived(
		lookSettings.threatAlerts ? new Set(session.killShots.map((shot) => shot.col)) : new Set<number>()
	);
	const dangerCols = $derived(
		lookSettings.threatAlerts ? new Set(session.dangerShots.map((shot) => shot.col)) : new Set<number>()
	);
	const killMarks = $derived(lookSettings.threatAlerts ? session.killShots : []);
	const dangerMarks = $derived(lookSettings.threatAlerts ? session.dangerShots : []);
	let lastAlert = '';
	const measureY = $derived.by(() => {
		const current = layout;
		return (row: number) => ({
			startY: 0,
			targetY: discY(current, row)
		});
	});

	$effect(() => {
		session.bindMeasure(measureY);
	});

	function observeSize(node: HTMLDivElement) {
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver((entries) => {
			availableW = entries[0]?.contentRect.width ?? 960;
			availableH = entries[0]?.contentRect.height ?? 760;
		});
		observer.observe(node);
		availableW = node.clientWidth;
		availableH = node.clientHeight;
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	$effect(() => {
		if (session.shake <= 0 && session.flash <= 0) return;
		const id = requestAnimationFrame(() => {
			session.shake = Math.max(0, session.shake * 0.68 - 0.2);
			session.flash = Math.max(0, session.flash * 0.78 - 0.02);
		});
		return () => cancelAnimationFrame(id);
	});

	$effect(() => {
		if (!lookSettings.threatAlerts) return;
		const sig = [
			session.killShots.map((shot) => `${shot.col}:${shot.row}`).join(','),
			session.dangerShots.map((shot) => `${shot.col}:${shot.row}`).join(',')
		].join('|');
		if (sig === lastAlert) return;
		lastAlert = sig;
		if (!sig || sig === '|') return;
		if (session.killShots.length) playLock();
		else if (session.dangerShots.length) playThreat();
	});

	function onEnter(col: number) {
		if (session.busy || (session.mode === 'ai' && session.current === 2)) return;
		if (session.hoverCol !== col) playHover();
		session.setHover(col);
	}

	function columnLabel(col: number) {
		const open = isValidMove(session.board, col);
		if (!open) return `Column ${col + 1} is full`;
		if (killCols.has(col)) return `Drop in column ${col + 1}, finishing move`;
		if (dangerCols.has(col)) return `Drop in column ${col + 1}, block a four`;
		return `Drop in column ${col + 1}`;
	}
</script>

<div class="stage" use:observeSize>
	<div
		class="rig"
		class:hit={session.flash > 0.08}
		style="
			width: {layout.width}px;
			height: {layout.sky + layout.height}px;
			--shake: {session.shake}px;
			--flash: {session.flash};
		"
	>
		<div class="sky" style="height: {layout.sky}px;">
			{#if showWell && wellCol !== null}
				<div
					class={['laser', { scan: session.aiThinking, flight: livePiece !== null }]}
					style="
						left: {discX(layout, wellCol) + layout.disc / 2}px;
						height: {layout.sky + layout.height}px;
					"
				></div>
			{/if}
			{#if showGhost && session.hoverCol !== null}
				<div
					class={['ghost-disc', { scan: session.aiThinking }]}
					style="
						width: {layout.disc}px;
						height: {layout.disc}px;
						left: {discX(layout, session.hoverCol)}px;
					"
				>
					<span class="reticle" aria-hidden="true"></span>
					<Disc player={session.current} size={layout.disc} ghost />
				</div>
			{/if}
		</div>

		<div
			class={[
				'board',
				lookSettings.skin,
				{
					locked: session.busy,
					thinking: session.aiThinking,
					p1: session.current === 1,
					p2: session.current === 2,
					won: session.status.type === 'won',
					threat: lookSettings.threatAlerts && session.dangerShots.length > 0 && session.killShots.length === 0,
					finish: lookSettings.threatAlerts && session.killShots.length > 0
				}
			]}
		>
			<div class="piece-layer" style="height: {layout.sky + layout.height}px; top: -{layout.sky}px;">
				{#each session.pieces as piece (piece.id)}
					<div
						class={['piece', { live: !piece.settled }]}
						style="
							width: {layout.disc}px;
							height: {layout.disc}px;
							left: {discX(layout, piece.col)}px;
							top: {piece.y}px;
						"
					>
						<Disc
							player={piece.player}
							size={layout.disc}
							winning={piece.winning}
							falling={!piece.settled}
							vy={piece.vy}
							scaleX={piece.scaleX}
							scaleY={piece.scaleY}
						/>
					</div>
				{/each}
				{#if livePiece}
					<div
						class="well-ring"
						style="
							width: {layout.disc + 18}px;
							height: {layout.disc + 18}px;
							left: {discX(layout, livePiece.col) - 9}px;
							top: {discY(layout, livePiece.row) - 9}px;
						"
					></div>
				{/if}
				{#each killMarks as shot (`k:${shot.col}:${shot.row}`)}
					<div
						class="mark kill"
						style="
							width: {layout.disc}px;
							height: {layout.disc}px;
							left: {discX(layout, shot.col)}px;
							top: {discY(layout, shot.row)}px;
						"
					></div>
				{/each}
				{#each dangerMarks as shot (`d:${shot.col}:${shot.row}`)}
					{#if !killCols.has(shot.col)}
						<div
							class="mark danger"
							style="
								width: {layout.disc}px;
								height: {layout.disc}px;
								left: {discX(layout, shot.col)}px;
								top: {discY(layout, shot.row)}px;
							"
						></div>
					{/if}
				{/each}
			</div>

			{#if protocol}
				<svg
					class="frame"
					viewBox="0 0 {layout.width} {layout.height}"
					width={layout.width}
					height={layout.height}
					aria-hidden="true"
				>
					<defs>
						<linearGradient id="{uid}-hull" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#2a3348" />
							<stop offset="28%" stop-color="#121826" />
							<stop offset="100%" stop-color="#070910" />
						</linearGradient>
						<linearGradient id="{uid}-sheen" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="rgba(92,225,230,0.22)" />
							<stop offset="38%" stop-color="rgba(255,255,255,0)" />
							<stop offset="100%" stop-color="rgba(139,124,255,0.16)" />
						</linearGradient>
						<pattern id="{uid}-grid" width="22" height="22" patternUnits="userSpaceOnUse">
							<path d="M22 0H0V22" fill="none" stroke="rgba(92,225,230,0.12)" stroke-width="1" />
							<circle cx="0" cy="0" r="1.1" fill="rgba(92,225,230,0.35)" />
						</pattern>
						<filter id="{uid}-glow" x="-12%" y="-12%" width="124%" height="136%">
							<feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#02040c" flood-opacity="0.7" />
						</filter>
						<mask id="{uid}-holes">
							<rect width={layout.width} height={layout.height} rx="18" fill="white" />
							{#each Array(ROWS) as _, row}
								{#each Array(COLS) as __, col}
									{@const hole = holeCenter(layout, col, row)}
									<circle cx={hole.x} cy={hole.y} r={layout.disc / 2 + 3} fill="black" />
								{/each}
							{/each}
						</mask>
					</defs>
					<rect
						width={layout.width}
						height={layout.height}
						rx="18"
						fill="url(#{uid}-hull)"
						mask="url(#{uid}-holes)"
						filter="url(#{uid}-glow)"
					/>
					<rect
						width={layout.width}
						height={layout.height}
						rx="18"
						fill="url(#{uid}-grid)"
						mask="url(#{uid}-holes)"
						opacity="0.9"
					/>
					<rect
						width={layout.width}
						height={layout.height}
						rx="18"
						fill="url(#{uid}-sheen)"
						mask="url(#{uid}-holes)"
						opacity="0.8"
					/>
					<rect
						x="8"
						y="8"
						width={layout.width - 16}
						height={layout.height - 16}
						rx="12"
						fill="none"
						stroke="rgba(92,225,230,0.22)"
						stroke-width="1.2"
						mask="url(#{uid}-holes)"
					/>
					{#each Array(ROWS) as _, row}
						{#each Array(COLS) as __, col}
							{@const hole = holeCenter(layout, col, row)}
							<circle
								cx={hole.x}
								cy={hole.y}
								r={layout.disc / 2 + 6}
								fill="none"
								stroke="rgba(8,10,18,0.85)"
								stroke-width="5"
							/>
							<circle
								cx={hole.x}
								cy={hole.y}
								r={layout.disc / 2 + 3.5}
								fill="none"
								stroke="rgba(92,225,230,0.42)"
								stroke-width="1.4"
							/>
							<circle
								cx={hole.x}
								cy={hole.y}
								r={layout.disc / 2 + 1.2}
								fill="none"
								stroke="rgba(255,255,255,0.14)"
								stroke-width="1"
							/>
						{/each}
					{/each}
					{#each Array(COLS) as _, col}
						{@const hole = holeCenter(layout, col, 0)}
						<text
							x={hole.x}
							y={Math.max(14, layout.pad * 0.62)}
							text-anchor="middle"
							fill="rgba(92,225,230,0.55)"
							font-size="11"
							font-family="ui-monospace, monospace"
							letter-spacing="0.12em">{col + 1}</text>
					{/each}
					<path
						d="M18 42V18H42"
						fill="none"
						stroke="rgba(92,225,230,0.55)"
						stroke-width="2.2"
						stroke-linecap="square"
					/>
					<path
						d="M{layout.width - 18} 42V18H{layout.width - 42}"
						fill="none"
						stroke="rgba(92,225,230,0.55)"
						stroke-width="2.2"
						stroke-linecap="square"
					/>
					<path
						d="M18 {layout.height - 42}V{layout.height - 18}H42"
						fill="none"
						stroke="rgba(255,51,92,0.45)"
						stroke-width="2.2"
						stroke-linecap="square"
					/>
					<path
						d="M{layout.width - 18} {layout.height - 42}V{layout.height - 18}H{layout.width - 42}"
						fill="none"
						stroke="rgba(255,51,92,0.45)"
						stroke-width="2.2"
						stroke-linecap="square"
					/>
				</svg>
			{:else}
				<svg
					class="frame"
					viewBox="0 0 {layout.width} {layout.height}"
					width={layout.width}
					height={layout.height}
					aria-hidden="true"
				>
					<defs>
						<linearGradient id="boardMetal" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#6ea0ff" />
							<stop offset="42%" stop-color="#1d4ed8" />
							<stop offset="100%" stop-color="#102f96" />
						</linearGradient>
						<linearGradient id="boardSheen" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="rgba(255,255,255,0.42)" />
							<stop offset="45%" stop-color="rgba(255,255,255,0)" />
							<stop offset="100%" stop-color="rgba(92,225,230,0.22)" />
						</linearGradient>
						<filter id="boardGlow" x="-10%" y="-10%" width="120%" height="130%">
							<feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#08102a" flood-opacity="0.55" />
						</filter>
						<mask id="boardHoles">
							<rect width={layout.width} height={layout.height} rx="28" fill="white" />
							{#each Array(ROWS) as _, row}
								{#each Array(COLS) as __, col}
									{@const hole = holeCenter(layout, col, row)}
									<circle cx={hole.x} cy={hole.y} r={layout.disc / 2 + 2} fill="black" />
								{/each}
							{/each}
						</mask>
					</defs>
					<rect
						width={layout.width}
						height={layout.height}
						rx="28"
						fill="url(#boardMetal)"
						mask="url(#boardHoles)"
						filter="url(#boardGlow)"
					/>
					<rect
						width={layout.width}
						height={layout.height}
						rx="28"
						fill="url(#boardSheen)"
						mask="url(#boardHoles)"
						opacity="0.7"
					/>
					{#each Array(ROWS) as _, row}
						{#each Array(COLS) as __, col}
							{@const hole = holeCenter(layout, col, row)}
							<circle
								cx={hole.x}
								cy={hole.y}
								r={layout.disc / 2 + 3}
								fill="none"
								stroke="rgba(255,255,255,0.18)"
								stroke-width="2"
							/>
							<circle
								cx={hole.x}
								cy={hole.y}
								r={layout.disc / 2 + 5}
								fill="none"
								stroke="rgba(0,0,0,0.28)"
								stroke-width="3"
							/>
						{/each}
					{/each}
				</svg>
			{/if}

			<div class="hits">
				{#each Array(COLS) as _, col}
					<button
						class="hit"
						class:hot={session.hoverCol === col || session.selectedCol === col}
						class:bad={session.invalidCol === col}
						class:full={!isValidMove(session.board, col)}
						class:kill={killCols.has(col)}
						class:danger={dangerCols.has(col) && !killCols.has(col)}
						style="width: {layout.cell + layout.gap}px;"
						aria-label={columnLabel(col)}
						disabled={session.busy}
						onpointerenter={() => onEnter(col)}
						onpointerleave={() => session.setHover(null)}
						onclick={() => session.playColumn(col)}
					></button>
				{/each}
			</div>

			<div
				class="fx-layer"
				style="height: {layout.sky + layout.height}px; top: -{layout.sky}px;"
			>
				{#if session.flash > 0.04}
					<div class="hitflash"></div>
				{/if}
				{#each session.fx as burst (burst.id)}
					<Explosion
						fx={burst}
						x={discX(layout, burst.col) + layout.disc / 2}
						y={discY(layout, burst.row) + layout.disc / 2}
					/>
				{/each}
				{#if winLine}
					<svg class="win-beam" width={layout.width} height={layout.sky + layout.height} aria-hidden="true">
						<defs>
							<filter id="{uid}-beam">
								<feGaussianBlur stdDeviation="3.5" result="glow" />
								<feMerge>
									<feMergeNode in="glow" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<polyline
							class="beam-glow"
							points={winLine}
							fill="none"
							stroke={winColor}
							stroke-width="18"
							stroke-linecap="round"
							stroke-linejoin="round"
							filter="url(#{uid}-beam)"
						/>
						<polyline
							class="beam-core"
							points={winLine}
							fill="none"
							stroke="#fff"
							stroke-width="5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.stage {
		width: 100%;
		flex: 1;
		min-height: 0;
		display: grid;
		place-items: start center;
		padding: 4px 0 clamp(28px, 5.5vh, 56px);
		position: relative;
		z-index: 1;
		perspective: 1800px;
	}

	.rig {
		position: relative;
		transform: rotateX(3deg) translate3d(var(--shake), calc(var(--shake) * 0.4), 0);
		transform-style: preserve-3d;
	}

	.rig.hit {
		filter: saturate(calc(1 + var(--flash) * 0.55)) contrast(calc(1 + var(--flash) * 0.18));
	}

	.sky {
		position: relative;
	}

	.laser {
		position: absolute;
		top: 0;
		width: 3px;
		translate: -50% 0;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(92, 225, 230, 0.15) 70%, transparent);
		box-shadow: 0 0 18px rgba(92, 225, 230, 0.8);
		animation: laser 0.8s ease-in-out infinite;
		z-index: 4;
		pointer-events: none;
		transition: left 140ms ease;
	}

	.laser.scan {
		width: 4px;
		background: linear-gradient(180deg, #fff6c8, rgba(245, 194, 75, 0.55) 55%, transparent);
		box-shadow: 0 0 22px rgba(245, 194, 75, 0.85);
		animation-duration: 0.32s;
	}

	.laser.flight {
		width: 6px;
		background: linear-gradient(180deg, #fff, rgba(92, 225, 230, 0.55) 40%, transparent 88%);
		box-shadow: 0 0 28px rgba(92, 225, 230, 0.95);
		animation: laser 0.22s ease-in-out infinite;
	}

	.ghost-disc {
		position: absolute;
		bottom: 0;
		animation: bob 1.2s ease-in-out infinite;
		z-index: 4;
		transition: left 140ms ease;
	}

	.ghost-disc.scan {
		animation-duration: 0.55s;
		filter: drop-shadow(0 0 12px rgba(245, 194, 75, 0.55));
	}

	.reticle {
		position: absolute;
		inset: -14%;
		border: 1px dashed rgba(92, 225, 230, 0.55);
		border-radius: 18%;
		animation: lockspin 6s linear infinite;
		pointer-events: none;
		z-index: 5;
	}

	.reticle::before,
	.reticle::after {
		content: '';
		position: absolute;
		width: 28%;
		height: 28%;
		border: 2px solid #fff;
	}

	.reticle::before {
		top: -2px;
		left: -2px;
		border-right: 0;
		border-bottom: 0;
	}

	.reticle::after {
		right: -2px;
		bottom: -2px;
		border-left: 0;
		border-top: 0;
	}

	.board {
		position: relative;
		border-radius: 28px;
		box-shadow:
			0 28px 60px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.08),
			0 0 40px rgba(92, 225, 230, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.board.protocol {
		border-radius: 18px;
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(92, 225, 230, 0.18),
			0 0 48px rgba(92, 225, 230, 0.16),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
	}

	.board.p1 {
		box-shadow:
			0 28px 60px rgba(0, 0, 0, 0.4),
			0 0 50px rgba(255, 51, 92, 0.22);
	}

	.board.protocol.p1 {
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(255, 51, 92, 0.28),
			0 0 56px rgba(255, 51, 92, 0.28);
	}

	.board.p2 {
		box-shadow:
			0 28px 60px rgba(0, 0, 0, 0.4),
			0 0 50px rgba(245, 194, 75, 0.22);
	}

	.board.protocol.p2 {
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(245, 194, 75, 0.3),
			0 0 56px rgba(245, 194, 75, 0.24);
	}

	.board.won {
		box-shadow:
			0 28px 60px rgba(0, 0, 0, 0.4),
			0 0 56px rgba(255, 255, 255, 0.18);
	}

	.board.locked {
		cursor: wait;
	}

	.board.thinking {
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(245, 194, 75, 0.35),
			0 0 48px rgba(245, 194, 75, 0.22);
	}

	.board.thinking::after {
		content: '';
		position: absolute;
		inset: 8% 0 8% 0;
		z-index: 4;
		pointer-events: none;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(245, 194, 75, 0.12) 48%,
			rgba(255, 255, 255, 0.18) 50%,
			rgba(245, 194, 75, 0.12) 52%,
			transparent 100%
		);
		animation: boardsweep 1.1s linear infinite;
		mix-blend-mode: screen;
	}

	.board.threat {
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(255, 51, 92, 0.5),
			0 0 64px rgba(255, 51, 92, 0.32);
		animation: threatpulse 0.9s ease-in-out infinite;
	}

	.board.finish {
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(92, 225, 230, 0.55),
			0 0 64px rgba(92, 225, 230, 0.3);
	}

	.board.won {
		animation: winlock 0.7s ease-out;
	}

	.piece-layer {
		position: absolute;
		left: 0;
		width: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.piece {
		position: absolute;
	}

	.piece.live {
		z-index: 4;
	}

	.well-ring,
	.mark {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.well-ring {
		border: 2px solid rgba(255, 255, 255, 0.7);
		box-shadow: 0 0 18px rgba(92, 225, 230, 0.7);
		animation: well 0.7s ease-out infinite;
		z-index: 3;
	}

	.mark {
		border: 2px dashed transparent;
		z-index: 2;
	}

	.mark.kill {
		background: radial-gradient(circle, rgba(92, 225, 230, 0.28), transparent 68%);
		box-shadow:
			inset 0 0 0 2px rgba(92, 225, 230, 0.7),
			0 0 16px rgba(92, 225, 230, 0.45);
		animation: markpulse 0.8s ease-in-out infinite;
	}

	.mark.danger {
		background: radial-gradient(circle, rgba(255, 51, 92, 0.3), transparent 68%);
		box-shadow:
			inset 0 0 0 2px rgba(255, 51, 92, 0.75),
			0 0 16px rgba(255, 51, 92, 0.5);
		animation: markpulse 0.55s ease-in-out infinite;
	}

	.frame {
		display: block;
		position: relative;
		z-index: 2;
		overflow: visible;
	}

	.hits {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		justify-content: space-between;
		padding: 0 6px;
	}

	.hit {
		height: 100%;
		border: 0;
		background: transparent;
		border-radius: 22px;
		cursor: pointer;
	}

	.hit.hot {
		background: linear-gradient(180deg, rgba(92, 225, 230, 0.14), transparent 55%);
	}

	.protocol .hit.hot {
		background:
			linear-gradient(180deg, rgba(92, 225, 230, 0.16), transparent 48%),
			repeating-linear-gradient(
				180deg,
				transparent 0 10px,
				rgba(92, 225, 230, 0.08) 10px 11px
			);
	}

	.hit.full {
		cursor: not-allowed;
	}

	.hit.bad {
		background: linear-gradient(180deg, rgba(255, 51, 92, 0.22), transparent 60%);
	}

	.hit.kill {
		background:
			linear-gradient(180deg, rgba(92, 225, 230, 0.22), transparent 58%),
			repeating-linear-gradient(180deg, transparent 0 11px, rgba(92, 225, 230, 0.14) 11px 12px);
	}

	.hit.danger {
		background:
			linear-gradient(180deg, rgba(255, 51, 92, 0.24), transparent 58%),
			repeating-linear-gradient(180deg, transparent 0 11px, rgba(255, 51, 92, 0.16) 11px 12px);
	}

	.fx-layer {
		position: absolute;
		left: 0;
		width: 100%;
		pointer-events: none;
		z-index: 5;
		overflow: visible;
	}

	.hitflash {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 72%, rgba(255, 255, 255, calc(var(--flash) * 0.42)), transparent 58%);
		mix-blend-mode: screen;
	}

	.win-beam {
		position: absolute;
		inset: 0;
		overflow: visible;
		z-index: 6;
	}

	.beam-glow,
	.beam-core {
		stroke-dasharray: 14 10;
		animation: beam 0.9s linear infinite;
	}

	.beam-core {
		filter: drop-shadow(0 0 8px #fff);
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes laser {
		50% {
			opacity: 0.45;
		}
	}

	@keyframes lockspin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes well {
		50% {
			transform: scale(1.08);
			opacity: 0.45;
		}
	}

	@keyframes markpulse {
		50% {
			transform: scale(1.08);
			opacity: 0.72;
		}
	}

	@keyframes boardsweep {
		from {
			translate: 0 -90%;
		}
		to {
			translate: 0 90%;
		}
	}

	@keyframes threatpulse {
		50% {
			box-shadow:
				0 28px 70px rgba(0, 0, 0, 0.55),
				0 0 0 1px rgba(255, 51, 92, 0.75),
				0 0 80px rgba(255, 51, 92, 0.48);
		}
	}

	@keyframes winlock {
		0% {
			filter: brightness(1.45);
			transform: scale(1.018);
		}
		100% {
			filter: brightness(1);
			transform: scale(1);
		}
	}

	@keyframes beam {
		to {
			stroke-dashoffset: -48;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ghost-disc,
		.laser,
		.reticle,
		.well-ring,
		.mark,
		.board.thinking::after,
		.board.threat,
		.board.won,
		.beam-glow,
		.beam-core {
			animation: none;
		}
	}
</style>
