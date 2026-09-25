<script lang="ts">
	import { createStarfield } from '../space';

	let root = $state<HTMLDivElement | null>(null);
	let midEl = $state<HTMLDivElement | null>(null);
	let altEl = $state<HTMLDivElement | null>(null);
	let starfield = $state(createStarfield(2026));

	export function setParallax(drift: number, y: number, period: number) {
		const x = (-drift * 0.22).toFixed(2);
		if (midEl) midEl.style.transform = `translate3d(${x}px, ${y.toFixed(2)}px, 0)`;
		if (altEl) altEl.style.transform = `translate3d(${x}px, ${(y - period).toFixed(2)}px, 0)`;
	}

	$effect(() => {
		const node = root;
		if (!node) return;

		const measure = () => ({
			w: Math.max(node.parentElement?.clientWidth || 0, window.innerWidth),
			h: Math.max(node.parentElement?.clientHeight || 0, window.innerHeight)
		});

		let field = measure();
		starfield = createStarfield(2026, field);

		const onResize = () => {
			const next = measure();
			if (Math.abs(next.w - field.w) < 160 && Math.abs(next.h - field.h) < 160) return;
			field = next;
			starfield = createStarfield(2026, next);
		};

		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<div class="starfield" bind:this={root} aria-hidden="true">
	<div class="stars far" style:box-shadow={starfield.far}></div>
	<div class="stars deep" style:box-shadow={starfield.deep}></div>
	<div class="stars mid" bind:this={midEl} style:box-shadow={starfield.mid}></div>
	<div class="stars mid alt" bind:this={altEl} style:box-shadow={starfield.mid}></div>
</div>

<style>
	.starfield,
	.stars {
		position: absolute;
		pointer-events: none;
	}

	.starfield {
		inset: 0;
	}

	.stars {
		width: 2px;
		height: 2px;
		left: 0;
		top: 0;
		background: transparent;
		backface-visibility: hidden;
	}

	.stars.far {
		opacity: 0.9;
	}

	.stars.deep {
		opacity: 0.72;
	}

	.stars.mid {
		opacity: 0.85;
		will-change: transform;
		transform: translate3d(0, 0, 0);
	}
</style>
