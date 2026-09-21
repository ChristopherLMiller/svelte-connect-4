export type ArcadeGameStatus = 'live' | 'coming';

export type ArcadeGame = {
	id: string;
	title: string;
	tagline: string;
	blurb: string;
	href: string | null;
	status: ArcadeGameStatus;
	accent: string;
	glow: string;
	badge: string;
	cabinet: 'grid' | 'orbit' | 'pulse' | 'drift';
};

export const ARCADE_GAMES: ArcadeGame[] = [
	{
		id: 'connect4',
		title: 'Connect 4',
		tagline: 'Gravity arena',
		blurb: 'Drop with bounce physics. Hotseat duels or a minimax neural core.',
		href: '/connect4',
		status: 'live',
		accent: '#5ce1e6',
		glow: 'rgba(92, 225, 230, 0.55)',
		badge: 'ONLINE',
		cabinet: 'grid'
	},
	{
		id: 'ion-race',
		title: 'Ion Race',
		tagline: 'Lane breaker',
		blurb: 'Weave neon corridors before the singularity folds the track.',
		href: null,
		status: 'coming',
		accent: '#ff335c',
		glow: 'rgba(255, 51, 92, 0.45)',
		badge: 'LOCKED',
		cabinet: 'orbit'
	},
	{
		id: 'nova-stack',
		title: 'Nova Stack',
		tagline: 'Orbit puzzle',
		blurb: 'Align stellar rings before the core goes critical.',
		href: null,
		status: 'coming',
		accent: '#f5c24b',
		glow: 'rgba(245, 194, 75, 0.45)',
		badge: 'SYNCING',
		cabinet: 'pulse'
	},
	{
		id: 'void-duel',
		title: 'Void Duel',
		tagline: 'Reflex duel',
		blurb: 'Mirror shots across a shattered horizon. Two sticks, one screen.',
		href: null,
		status: 'coming',
		accent: '#8b7cff',
		glow: 'rgba(139, 124, 255, 0.45)',
		badge: 'PENDING',
		cabinet: 'drift'
	}
];
