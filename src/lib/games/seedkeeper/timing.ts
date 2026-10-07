import type { SowResult } from './engine';

export type Schedule = {
	/** Seeds rise out of the pit into a handful. */
	lift: number;
	/** Time for the handful to glide from one pit to the next. */
	hop: number;
	/** Time for a seed to drop from the handful into its pit. */
	fall: number;
	/** When seed k touches down, ms from the start. */
	landAt: (k: number) => number;
	sowEnd: number;
	captureAt: number;
	captureFly: number;
	captureStagger: number;
	captureEnd: number;
	sweepAt: number;
	sweepFly: number;
	sweepStagger: number;
	end: number;
};

/** One timeline shared by the board (to animate) and the session (to wait for it). */
export function schedule(result: Pick<SowResult, 'path' | 'capture' | 'sweep'>, reduced: boolean): Schedule {
	const n = result.path.length;
	const lift = reduced ? 0 : 340;
	const hop = reduced ? 45 : Math.max(120, 240 - Math.max(0, n - 6) * 9);
	const fall = reduced ? 60 : 180;
	const gap = reduced ? 80 : 280;
	const landAt = (k: number) => lift + (k + 1) * hop + fall;
	const sowEnd = n ? landAt(n - 1) : 0;

	const captureFly = reduced ? 200 : 760;
	const captureStagger = reduced ? 0 : 55;
	const captureAt = sowEnd + gap;
	const captureEnd = result.capture ? captureAt + captureFly + captureStagger * Math.min(14, result.capture.taken - 1) : sowEnd;

	const swept = result.sweep.reduce((sum, s) => sum + s.count, 0);
	const sweepFly = reduced ? 240 : 900;
	const sweepStagger = reduced ? 0 : 40;
	const sweepAt = captureEnd + gap;
	const sweepEnd = swept ? sweepAt + sweepFly + sweepStagger * Math.min(20, swept - 1) : captureEnd;

	return {
		lift,
		hop,
		fall,
		landAt,
		sowEnd,
		captureAt,
		captureFly,
		captureStagger,
		captureEnd,
		sweepAt,
		sweepFly,
		sweepStagger,
		end: Math.max(sowEnd, captureEnd, sweepEnd)
	};
}
