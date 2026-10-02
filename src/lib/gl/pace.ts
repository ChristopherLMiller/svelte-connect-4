/**
 * Caps an ambient animation loop at `fps`. On 90/120 Hz phones every extra full-screen
 * shader frame is pure GPU heat, so backdrops skip the in-between display frames.
 * Gameplay loops (physics, steering) should keep running at the display rate.
 */
export function createPacer(fps = 60) {
	const ideal = 1000 / fps;
	// Slack so 60 Hz displays, whose frames jitter around 16.7 ms, never skip.
	const floor = ideal - 2.5;
	let last = -Infinity;
	return {
		/** True when this display frame should draw. */
		due(now: number) {
			const elapsed = now - last;
			if (elapsed < floor) return false;
			// Carry a small remainder so 90 Hz lands near 60 fps instead of halving to 45.
			// A remainder near a whole frame is float noise from a just-short interval.
			const rest = elapsed % ideal;
			last = elapsed > ideal * 4 ? now : now - (rest < ideal / 2 ? rest : 0);
			return true;
		},
		reset() {
			last = -Infinity;
		}
	};
}
