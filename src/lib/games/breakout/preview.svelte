<script lang="ts">
	import { BALL_R, BEAM_H, BEAM_Y, CELL_H, CELL_W, FIELD_H, FIELD_W, FLOOR_Y, GRID_X, GRID_Y, HUES } from './types';

	const uid = $props.id();
	const MAP = ['..a...a...a..', '.aaa.aaa.aaa.', '.rbr.bgb.rbr.', '.rbr.bgb.rbr.', '.bab.gag.bab.', '.rbr.bgb.rbr.', '.rbr.bgb.rbr.', '.ooo.ooo.ooo.'];
	const KIND: Record<string, number> = { o: 1, a: 2, g: 3, b: 4, r: 5, v: 6 };
	const BROKEN = new Set(['6-2', '6-3', '5-3', '6-7', '5-6', '6-10', '7-9']);
	const MOTIF = ['dots', 'cross', 'wave'] as const;

	function seeded(seed: number) {
		let s = seed;
		return () => {
			s ^= s << 13;
			s ^= s >>> 17;
			s ^= s << 5;
			return ((s >>> 0) % 10000) / 10000;
		};
	}

	const rand = seeded(9127);
	const TONES = ['#968060', '#a08c68', '#887862', '#a88e64', '#8e806c', '#9a825c', '#807260', '#9e7a58'];
	const stones: Array<{ x: number; y: number; w: number; h: number; fill: string }> = [];
	for (let y = 0, row = 0; y < FLOOR_Y; row += 1) {
		const h = 30 + Math.round(rand() * 14);
		let x = -Math.round(rand() * 40);
		while (x < FIELD_W) {
			const w = 54 + Math.round(rand() * 70);
			stones.push({ x, y, w, h, fill: TONES[Math.floor(rand() * TONES.length)]! });
			x += w;
		}
		y += h;
	}

	const cells = MAP.flatMap((line, r) =>
		line.split('').flatMap((ch, c) => {
			const kind = KIND[ch];
			if (!kind) return [];
			const hue = HUES[kind]!;
			return [{ key: `${r}-${c}`, x: GRID_X + c * CELL_W, y: GRID_Y + r * CELL_H, hue, broken: BROKEN.has(`${r}-${c}`), motif: MOTIF[(r + c) % 3]! }];
		})
	);
	const lit = cells.filter((c) => c.broken);
	const SLANT = 0.22;
	const beamX = 330;
	const beamW = 150;
	const ball = { x: 470, y: 560 };
</script>

<div class="shot" aria-hidden="true">
	<div class="nave">
		<span class="window left"></span>
		<span class="window right"></span>
		<span class="column left"></span>
		<span class="column right"></span>
		<span class="candles left"></span>
		<span class="candles right"></span>
	</div>
	<div class="frame">
		<i class="pinnacle l"></i>
		<i class="pinnacle r"></i>
		<i class="rose"></i>
		<svg class="field" viewBox="0 0 {FIELD_W} {FIELD_H}" preserveAspectRatio="none">
			<defs>
				<linearGradient id="{uid}-shade" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#000" stop-opacity="0" />
					<stop offset="0.7" stop-color="#000" stop-opacity="0.25" />
					<stop offset="1" stop-color="#000" stop-opacity="0.5" />
				</linearGradient>
				<linearGradient id="{uid}-floor" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#1c1b22" />
					<stop offset="1" stop-color="#0c0b10" />
				</linearGradient>
				<linearGradient id="{uid}-oak" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#a06a3a" />
					<stop offset="0.45" stop-color="#6a3e1c" />
					<stop offset="1" stop-color="#3a200e" />
				</linearGradient>
				<linearGradient id="{uid}-brass" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#fbe3a0" />
					<stop offset="0.5" stop-color="#c08d34" />
					<stop offset="1" stop-color="#6a4a14" />
				</linearGradient>
				<radialGradient id="{uid}-ball">
					<stop offset="0" stop-color="#fff" />
					<stop offset="0.45" stop-color="#fff0c8" />
					<stop offset="1" stop-color="#f2b45a" />
				</radialGradient>
				<radialGradient id="{uid}-halo">
					<stop offset="0" stop-color="#ffe2a0" stop-opacity="0.55" />
					<stop offset="1" stop-color="#ffe2a0" stop-opacity="0" />
				</radialGradient>
				{#each lit as cell (cell.key)}
					<linearGradient id="{uid}-shaft-{cell.key}" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color={cell.hue.light} stop-opacity="0.55" />
						<stop offset="1" stop-color={cell.hue.light} stop-opacity="0.04" />
					</linearGradient>
				{/each}
			</defs>

			{#each stones as s, i (i)}
				<rect x={s.x + 1.3} y={s.y + 1.3} width={s.w - 2.6} height={s.h - 2.6} rx="3" fill={s.fill} />
			{/each}
			<rect width={FIELD_W} height={FLOOR_Y} fill="#1d1813" opacity="0.18" style="mix-blend-mode: multiply" />
			<rect width={FIELD_W} height={FLOOR_Y} fill="url(#{uid}-shade)" />

			{#each cells as cell (`s${cell.key}`)}
				<rect x={cell.x - 5} y={cell.y - 5} width={CELL_W + 10} height={CELL_H + 10} rx="4" fill="#3e362c" />
			{/each}
			{#each cells as cell (`i${cell.key}`)}
				<rect x={cell.x - 2} y={cell.y - 2} width={CELL_W + 4} height={CELL_H + 4} fill="#1d1813" />
			{/each}

			{#each cells as cell (cell.key)}
				{#if cell.broken}
					<rect x={cell.x + 1} y={cell.y + 1} width={CELL_W - 2} height={CELL_H - 2} fill={cell.hue.light} />
					<rect x={cell.x + 8} y={cell.y + 5} width={CELL_W - 16} height={CELL_H - 10} fill="#fff" opacity="0.55" />
				{:else}
					<rect x={cell.x + 1.5} y={cell.y + 1.5} width={CELL_W - 3} height={CELL_H - 3} rx="2" fill={cell.hue.base} />
					<rect x={cell.x + 1.5} y={cell.y + 1.5} width={CELL_W - 3} height={CELL_H - 3} rx="2" fill="#8c7d68" opacity="0.45" />
					{#if cell.motif === 'dots'}
						{#each [0.32, 0.5, 0.68] as f (f)}
							<circle cx={cell.x + CELL_W * f} cy={cell.y + CELL_H / 2} r="2.2" fill="#f0dcae" opacity="0.5" />
						{/each}
					{:else if cell.motif === 'cross'}
						<circle cx={cell.x + CELL_W / 2} cy={cell.y + CELL_H / 2} r="7" fill="none" stroke="#f0dcae" stroke-width="1.6" opacity="0.45" />
						<path
							d="M{cell.x + CELL_W / 2 - 4} {cell.y + CELL_H / 2 - 4} l8 8 m0 -8 l-8 8"
							stroke="#f0dcae"
							stroke-width="1.6"
							opacity="0.45"
						/>
					{:else}
						<path
							d="M{cell.x + 10} {cell.y + CELL_H / 2} q5 -5 10 0 t10 0 t10 0 t10 0"
							fill="none"
							stroke="#f0dcae"
							stroke-width="1.6"
							opacity="0.45"
						/>
					{/if}
				{/if}
			{/each}

			<g class="shafts" style="mix-blend-mode: screen">
				{#each lit as cell (`sh${cell.key}`)}
					{@const drop = FLOOR_Y - cell.y - CELL_H}
					<polygon
						points="{cell.x},{cell.y + CELL_H} {cell.x + CELL_W},{cell.y + CELL_H} {cell.x + CELL_W + drop * SLANT + 30},{FLOOR_Y} {cell.x +
							drop * SLANT -
							30},{FLOOR_Y}"
						fill="url(#{uid}-shaft-{cell.key})"
					/>
				{/each}
			</g>

			<rect y={FLOOR_Y} width={FIELD_W} height={FIELD_H - FLOOR_Y} fill="url(#{uid}-floor)" />
			{#each lit as cell (`p${cell.key}`)}
				{@const drop = FLOOR_Y - cell.y - CELL_H}
				<ellipse
					cx={cell.x + CELL_W / 2 + drop * SLANT}
					cy={FLOOR_Y + 22}
					rx="62"
					ry="12"
					fill={cell.hue.light}
					opacity="0.22"
				/>
			{/each}

			<path
				d="M{ball.x - 120} {ball.y + 150} Q {ball.x - 60} {ball.y + 60} {ball.x} {ball.y}"
				fill="none"
				stroke="#ffe2a0"
				stroke-width="9"
				stroke-linecap="round"
				opacity="0.22"
			/>
			<circle cx={ball.x} cy={ball.y} r="46" fill="url(#{uid}-halo)" />
			<circle cx={ball.x} cy={ball.y} r={BALL_R + 2} fill="url(#{uid}-ball)" />

			<ellipse cx={beamX + beamW / 2} cy={BEAM_Y + BEAM_H + 14} rx={beamW * 0.55} ry="8" fill="#000" opacity="0.45" />
			<rect x={beamX} y={BEAM_Y} width={beamW} height={BEAM_H} rx="5" fill="url(#{uid}-oak)" />
			<rect x={beamX} y={BEAM_Y} width="16" height={BEAM_H} rx="4" fill="url(#{uid}-brass)" />
			<rect x={beamX + beamW - 16} y={BEAM_Y} width="16" height={BEAM_H} rx="4" fill="url(#{uid}-brass)" />
		</svg>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(60% 40% at 50% 0%, rgba(120, 130, 170, 0.18), transparent 70%),
			linear-gradient(180deg, #17161e 0%, #0e0d13 65%, #08080c 100%);
	}

	.nave {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.window {
		position: absolute;
		top: 30%;
		width: 7cqw;
		height: 34cqh;
		border-radius: 50% 50% 0 0 / 22% 22% 0 0;
		background:
			repeating-linear-gradient(0deg, rgba(10, 8, 12, 0.85) 0 1px, transparent 1px 12%),
			repeating-linear-gradient(90deg, rgba(10, 8, 12, 0.85) 0 1px, transparent 1px 33%),
			linear-gradient(180deg, #4a3a8a, #7a2a44 30%, #2a4a8a 55%, #8a5a20 80%, #3a2a5a);
		box-shadow:
			0 0 0 3px #26232c,
			0 0 30px rgba(140, 120, 220, 0.25);
		opacity: 0.85;
	}

	.window.left {
		left: 6%;
	}

	.window.right {
		right: 6%;
	}

	.column {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 3cqw;
		background: linear-gradient(90deg, #121117, #24222b 50%, #121117);
		opacity: 0.8;
	}

	.column.left {
		left: 17%;
	}

	.column.right {
		right: 17%;
	}

	.candles {
		position: absolute;
		bottom: 9%;
		width: 12cqw;
		height: 4cqh;
		background: radial-gradient(circle, rgba(255, 190, 110, 0.95) 0 1.4px, transparent 2px) 0 0 / 2.4cqw 100%;
		filter: drop-shadow(0 0 4px rgba(255, 170, 80, 0.8));
	}

	.candles.left {
		left: 3%;
	}

	.candles.right {
		right: 3%;
	}

	.frame {
		position: absolute;
		left: 50%;
		top: 54%;
		height: 84%;
		aspect-ratio: 832 / 920;
		translate: -50% -50%;
		padding: 1.6%;
		box-sizing: border-box;
		border-radius: 4px;
		background: linear-gradient(180deg, #4a4652, #26232c 40%, #17161d);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			0 12px 28px rgba(0, 0, 0, 0.6);
	}

	.field {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 2px;
	}

	.pinnacle {
		position: absolute;
		top: -6%;
		width: 5%;
		height: 7%;
		background: linear-gradient(180deg, #5a5662, #2e2b34);
		clip-path: polygon(50% 0, 100% 45%, 100% 100%, 0 100%, 0 45%);
	}

	.pinnacle.l {
		left: 2%;
	}

	.pinnacle.r {
		right: 2%;
	}

	.rose {
		position: absolute;
		left: 50%;
		top: -4.5%;
		width: 8%;
		aspect-ratio: 1;
		translate: -50% 0;
		border-radius: 50%;
		z-index: 1;
		background:
			radial-gradient(circle, #fff3c4 0 12%, transparent 14%),
			conic-gradient(#c8243c 0 60deg, #2b5ad0 0 120deg, #e8a23a 0 180deg, #1f9a5c 0 240deg, #7b3dcc 0 300deg, #cdd8e6 0);
		box-shadow:
			0 0 0 2px #1a1820,
			0 0 0 3.5px #4a4652,
			0 0 10px rgba(255, 220, 160, 0.4);
	}

	.shafts {
		animation: breathe 5s ease-in-out infinite;
	}

	@keyframes breathe {
		50% {
			opacity: 0.7;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shafts {
			animation: none;
		}
	}
</style>
