<script lang="ts">
	import { bloomSprite } from './render';
	import { at, centre, createShooter, FIELD_W, LAUNCH, planShot, rowLength, ROWS, startStage } from './shooter';
	import type { Kind } from './types';

	const GAME = (() => {
		const g = createShooter(20260709);
		startStage(g, 5);
		return g;
	})();

	function pond(canvas: HTMLCanvasElement) {
		const paint = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(canvas.clientHeight * dpr);
			const u = canvas.width / FIELD_W;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			const size = Math.ceil(u * 1.04);
			const sprites = new Map<Kind, HTMLCanvasElement>();
			const sprite = (k: Kind) => {
				if (!sprites.has(k)) sprites.set(k, bloomSprite(k, size));
				return sprites.get(k)!;
			};
			for (let r = 0; r < ROWS; r += 1) {
				for (let c = 0; c < rowLength(r); c += 1) {
					const k = at(GAME, r, c);
					if (!k) continue;
					const p = centre(GAME, r, c);
					ctx.drawImage(sprite(k), p.x * u - size / 2, p.y * u - size / 2, size, size);
				}
			}
			const plan = planShot(GAME, -0.42);
			ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
			let travelled = 0;
			let next = 0.8;
			for (let i = 1; i < plan.path.length; i += 1) {
				const a = plan.path[i - 1]!;
				const b = plan.path[i]!;
				const seg = Math.hypot(b.x - a.x, b.y - a.y);
				while (next < travelled + seg) {
					const t = (next - travelled) / seg;
					ctx.beginPath();
					ctx.arc((a.x + (b.x - a.x) * t) * u, (a.y + (b.y - a.y) * t) * u, u * 0.07, 0, Math.PI * 2);
					ctx.fill();
					next += 0.42;
				}
				travelled += seg;
			}
			ctx.fillStyle = '#4fae5e';
			ctx.beginPath();
			ctx.moveTo(LAUNCH.x * u, LAUNCH.y * u);
			ctx.arc(LAUNCH.x * u, LAUNCH.y * u, u * 0.92, Math.PI / 2 + 0.28, Math.PI / 2 - 0.28 + Math.PI * 2);
			ctx.closePath();
			ctx.fill();
			ctx.drawImage(sprite(GAME.current), LAUNCH.x * u - size / 2, LAUNCH.y * u - size / 2, size, size);
		};
		const observer = new ResizeObserver(paint);
		observer.observe(canvas);
		paint();
		return () => observer.disconnect();
	}

	/** Lily pads around the board: centre, radius, and which way the notch faces. */
	const pads = [
		{ x: 34, y: 58, r: 30, a: 40 },
		{ x: 70, y: 196, r: 22, a: 200 },
		{ x: 362, y: 74, r: 24, a: 130 },
		{ x: 372, y: 236, r: 34, a: 300 },
		{ x: 326, y: 280, r: 16, a: 250 }
	];

	function pad(x: number, y: number, r: number, a: number) {
		const t = (a * Math.PI) / 180;
		const half = 0.2;
		const x1 = x + Math.cos(t - half) * r;
		const y1 = y + Math.sin(t - half) * r;
		const x2 = x + Math.cos(t + half) * r;
		const y2 = y + Math.sin(t + half) * r;
		return `M${x} ${y} L${x2.toFixed(1)} ${y2.toFixed(1)} A${r} ${r} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
	}

	const KOI = 'M0 0 C8 -7 22 -8 34 -4 L44 -10 L41 0 L44 10 L34 4 C22 8 8 7 0 0 Z';
</script>

<div class="shot" aria-hidden="true">
	<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
		<g fill="rgba(0, 40, 30, 0.28)">
			{#each pads as p, i (i)}
				<path d={pad(p.x + 4, p.y + 6, p.r, p.a)} />
			{/each}
		</g>
		<g transform="translate(40 140) rotate(-24)" opacity="0.85">
			<path d={KOI} fill="#fff4e6" />
			<path d="M8 -3 C14 -6 20 -5 24 -2 C18 1 12 1 8 -3 Z" fill="#ff6a2b" />
		</g>
		<g transform="translate(352 168) rotate(196)" opacity="0.85">
			<path d={KOI} fill="#ffc93c" />
		</g>
		{#each pads as p, i (i)}
			<path d={pad(p.x, p.y, p.r, p.a)} fill={i % 2 ? '#5bb862' : '#4aa656'} />
		{/each}
		{#each [pads[0]!, pads[3]!] as p, i (i)}
			<g transform="translate({p.x + p.r * 0.2} {p.y - p.r * 0.15})">
				{#each [0, 72, 144, 216, 288] as turn (turn)}
					<ellipse cx="0" cy={-p.r * 0.22} rx={p.r * 0.12} ry={p.r * 0.24} fill="#ff9fc0" transform="rotate({turn})" />
				{/each}
				<circle r={p.r * 0.08} fill="#ffd34d" />
			</g>
		{/each}
	</svg>
	<div class="basin">
		<canvas {@attach pond}></canvas>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(40% 30% at 30% 30%, rgba(255, 250, 210, 0.22), transparent 70%),
			radial-gradient(50% 40% at 70% 70%, rgba(255, 250, 210, 0.14), transparent 70%),
			linear-gradient(180deg, #2a8478 0%, #1b6a60 55%, #145650 100%);
	}

	.scene {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.basin {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 92%;
		aspect-ratio: 11 / 13.5;
		translate: -50% -50%;
		border-radius: 2.4cqh;
		background: linear-gradient(180deg, rgba(10, 50, 46, 0.55), rgba(6, 34, 31, 0.62));
		box-shadow:
			0 1.8cqh 4cqh rgba(0, 30, 24, 0.4),
			inset 0 0 0 1px rgba(220, 255, 235, 0.16);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
