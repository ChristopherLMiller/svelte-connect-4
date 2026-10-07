import type { BackStyle } from '../kit/cards/faces';

/** The Lamplight's own deck: bottle-green lattice, a brass oil lamp in a laurel ring. */
export const PUB_BACK: BackStyle = {
	field: '#1d4a34',
	deep: '#0f2a1d',
	line: '#d9a648',
	crest(ctx, cx, cy, size) {
		const s = size / 70;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.scale(s, s);
		ctx.beginPath();
		ctx.ellipse(0, 0, 46, 56, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#0f2a1d';
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = '#d9a648';
		ctx.stroke();
		ctx.lineWidth = 1.6;
		for (const side of [-1, 1]) {
			for (let i = 0; i < 7; i++) {
				const a = Math.PI / 2 + side * (0.5 + i * 0.32);
				const x = Math.cos(a) * 40;
				const y = Math.sin(a) * 50;
				ctx.beginPath();
				ctx.ellipse(x, y, 5, 2.4, a + side * 0.9, 0, Math.PI * 2);
				ctx.fillStyle = '#b8873a';
				ctx.fill();
			}
		}
		const glow = ctx.createRadialGradient(0, -6, 2, 0, -6, 30);
		glow.addColorStop(0, 'rgba(255, 214, 130, 0.9)');
		glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(0, -6, 30, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#d9a648';
		ctx.strokeStyle = '#3a2410';
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(-14, 22);
		ctx.quadraticCurveTo(-18, 30, -8, 32);
		ctx.lineTo(8, 32);
		ctx.quadraticCurveTo(18, 30, 14, 22);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-9, 14);
		ctx.quadraticCurveTo(-13, -10, -6, -22);
		ctx.lineTo(6, -22);
		ctx.quadraticCurveTo(13, -10, 9, 14);
		ctx.closePath();
		ctx.fillStyle = 'rgba(255, 236, 190, 0.55)';
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, 6);
		ctx.quadraticCurveTo(-5, -2, 0, -12);
		ctx.quadraticCurveTo(5, -2, 0, 6);
		ctx.fillStyle = '#ffb347';
		ctx.fill();
		ctx.fillStyle = '#d9a648';
		ctx.fillRect(-8, -26, 16, 4);
		ctx.restore();
	}
};
