<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="{uid}-paper" cx="45%" cy="40%" r="70%">
			<stop offset="0" stop-color="#f6e9c8" />
			<stop offset="0.75" stop-color="#e6cf9c" />
			<stop offset="1" stop-color="#c9a86c" />
		</radialGradient>
	</defs>
	<rect x="3" y="3" width="58" height="58" rx="9" fill="url(#{uid}-paper)" stroke="#5a3a20" stroke-width="1.4" />
	<path d="M8 40 Q16 34 22 38 T34 40 Q30 48 22 52 Q12 54 8 48 Z" fill="#9dbdb8" opacity="0.55" />
	<path d="M8 40 Q16 34 22 38 T34 40" fill="none" stroke="#5a3a20" stroke-width="1" opacity="0.7" />
	<g fill="none" stroke="#3b2a1a" stroke-width="2" stroke-linecap="round">
		<path d="M14 14 H32" stroke="#b3311d" />
		<path d="M14 14 V32" stroke="#26407f" />
		<path d="M32 14 V32" stroke="#b3311d" />
	</g>
	<g fill="#3b2a1a">
		<circle cx="14" cy="14" r="2" />
		<circle cx="32" cy="14" r="2" />
		<circle cx="14" cy="32" r="2" />
		<circle cx="32" cy="32" r="2" />
	</g>
	<g transform="translate(44 40)">
		<circle r="11" fill="none" stroke="#5a3a20" stroke-width="1" />
		<path d="M0 -15 L3 -3 L0 0 Z" fill="#3b2a1a" />
		<path d="M0 -15 L-3 -3 L0 0 Z" fill="#f6e9c8" stroke="#3b2a1a" stroke-width="0.6" />
		<path d="M0 15 L-3 3 L0 0 Z" fill="#3b2a1a" />
		<path d="M0 15 L3 3 L0 0 Z" fill="#f6e9c8" stroke="#3b2a1a" stroke-width="0.6" />
		<path d="M15 0 L3 3 L0 0 Z" fill="#3b2a1a" />
		<path d="M15 0 L3 -3 L0 0 Z" fill="#f6e9c8" stroke="#3b2a1a" stroke-width="0.6" />
		<path d="M-15 0 L-3 -3 L0 0 Z" fill="#3b2a1a" />
		<path d="M-15 0 L-3 3 L0 0 Z" fill="#f6e9c8" stroke="#3b2a1a" stroke-width="0.6" />
		<circle r="1.6" fill="#b3311d" />
	</g>
	<path d="M56 4 C48 8 40 16 33 27 L31 31 L35 29 C44 20 52 12 56 4 Z" fill="#fbf4e2" stroke="#5a3a20" stroke-width="1" />
	<path d="M56 4 L32 30" stroke="#5a3a20" stroke-width="0.7" />
</svg>

<style>
	.icon {
		display: block;
		flex-shrink: 0;
		overflow: visible;
	}

	.hud {
		width: 42px;
		height: 42px;
	}

	.hero {
		width: 88px;
		height: 88px;
		filter: drop-shadow(0 0 26px rgba(255, 170, 80, 0.35)) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.5));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
