import { readView, writeView, type ChessView } from './persist';

export const chessView = $state<ChessView>(readView());
export const chessPanel = $state({ open: false });
export const chessGuide = $state({ open: false });

export const chessPanels = {
	panel: chessPanel,
	guide: chessGuide,
	openSettings() {
		chessGuide.open = false;
		chessPanel.open = true;
	},
	closeSettings() {
		chessPanel.open = false;
	},
	openGuide() {
		chessPanel.open = false;
		chessGuide.open = true;
	},
	closeGuide() {
		chessGuide.open = false;
	}
};

export function hydrateChess() {
	Object.assign(chessView, readView());
}

export function persistChessView() {
	writeView($state.snapshot(chessView));
}
