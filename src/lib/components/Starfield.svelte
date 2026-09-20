<script lang="ts">
	import { createStarfield } from '$lib/game/space';

	let root = $state<HTMLDivElement | null>(null);
	let starfield = $state(createStarfield(2026));

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
	<div class="stars mid" style:box-shadow={starfield.mid}></div>
	<div class="stars mid alt" style:box-shadow={starfield.mid}></div>
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
	}

	.stars.far {
		opacity: 0.9;
	}

	.stars.deep {
		opacity: 0.72;
	}

	.stars.mid {
		transform: translate3d(calc(var(--drift) * -0.22), var(--star-y), 0);
		opacity: 0.85;
	}

	.stars.mid.alt {
		transform: translate3d(calc(var(--drift) * -0.22), calc(var(--star-y) - var(--star-period)), 0);
	}
</style>
