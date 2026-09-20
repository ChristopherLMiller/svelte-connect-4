import { COLS, ROWS, type Layout } from './types';

function metricsFor(width: number) {
	const pad = Math.max(14, width * 0.024);
	const gap = Math.max(8, width * 0.013);
	const cell = (width - pad * 2 - gap * (COLS - 1)) / COLS;
	const disc = cell * 0.88;
	const sky = cell + 14;
	const height = pad * 2 + cell * ROWS + gap * (ROWS - 1);

	return { pad, gap, cell, disc, sky, height, total: sky + height };
}

export function computeLayout(availableWidth: number, availableHeight = Number.POSITIVE_INFINITY): Layout {
	const maxWidth = Math.max(292, availableWidth);
	const maxHeight = Math.max(320, availableHeight);

	let width = maxWidth;
	let metrics = metricsFor(width);

	if (metrics.total > maxHeight) {
		let low = 292;
		let high = maxWidth;
		for (let step = 0; step < 20; step += 1) {
			const mid = (low + high) / 2;
			if (metricsFor(mid).total <= maxHeight) low = mid;
			else high = mid;
		}
		width = low;
		metrics = metricsFor(width);
	}

	return {
		cols: COLS,
		rows: ROWS,
		pad: metrics.pad,
		gap: metrics.gap,
		cell: metrics.cell,
		disc: metrics.disc,
		sky: metrics.sky,
		width,
		height: metrics.height
	};
}

export function discX(layout: Layout, col: number): number {
	return layout.pad + col * (layout.cell + layout.gap) + (layout.cell - layout.disc) / 2;
}

export function discY(layout: Layout, row: number): number {
	return layout.sky + layout.pad + row * (layout.cell + layout.gap) + (layout.cell - layout.disc) / 2;
}

export function holeCenter(layout: Layout, col: number, row: number): { x: number; y: number } {
	return {
		x: layout.pad + col * (layout.cell + layout.gap) + layout.cell / 2,
		y: layout.pad + row * (layout.cell + layout.gap) + layout.cell / 2
	};
}
