export type PhysicsFrame = {
	y: number;
	vy: number;
	scaleX: number;
	scaleY: number;
	settled: boolean;
};

const GRAVITY = 3200;
const RESTITUTION = 0.46;
const SETTLE_SPEED = 95;
const MAX_BOUNCES = 7;
const IMPACT_SQUASH = 0.22;

function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateDrop(
	startY: number,
	targetY: number,
	onFrame: (frame: PhysicsFrame) => void,
	onBounce: (impact: number) => void
): Promise<void> {
	if (prefersReducedMotion() || targetY <= startY) {
		onFrame({ y: targetY, vy: 0, scaleX: 1, scaleY: 1, settled: true });
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		let y = startY;
		let vy = 40;
		let scaleX = 1;
		let scaleY = 1;
		let bounces = 0;
		let last = performance.now();
		let settled = false;

		const tick = (now: number) => {
			const dt = Math.min((now - last) / 1000, 1 / 30);
			last = now;

			vy += GRAVITY * dt;
			y += vy * dt;

			scaleX += (1 - scaleX) * Math.min(1, dt * 14);
			scaleY += (1 - scaleY) * Math.min(1, dt * 14);

			if (y >= targetY) {
				y = targetY;
				const impact = Math.min(1, Math.abs(vy) / 1800);
				if (Math.abs(vy) > SETTLE_SPEED && bounces < MAX_BOUNCES) {
					vy = -vy * RESTITUTION;
					bounces += 1;
					scaleY = Math.max(0.68, 1 - impact * IMPACT_SQUASH * 2.4);
					scaleX = Math.min(1.28, 1 + impact * IMPACT_SQUASH * 2.1);
					onBounce(impact);
				} else {
					y = targetY;
					vy = 0;
					scaleX = 1;
					scaleY = 1;
					settled = true;
				}
			}

			onFrame({ y, vy, scaleX, scaleY, settled });

			if (settled) {
				resolve();
				return;
			}

			requestAnimationFrame(tick);
		};

		requestAnimationFrame(tick);
	});
}
