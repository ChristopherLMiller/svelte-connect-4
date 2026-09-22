<script lang="ts">
	let { surge = false, receding = false }: { surge?: boolean; receding?: boolean } = $props();
</script>

<div class="tide" class:surge class:receding aria-hidden="true">
	<div class="fill"></div>
	<div class="lip"></div>
	<div class="swell far"></div>
	<div class="swell mid"></div>
	<div class="swell near"></div>
	<div class="foam"></div>
	<div class="spark"></div>
	<div class="fish a"></div>
	<div class="fish b"></div>
	<div class="fish c"></div>
</div>

<style>
	.tide {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 26vh;
		min-height: 140px;
		z-index: 6;
		pointer-events: none;
		overflow: hidden;
		isolation: isolate;
		contain: layout;
		transition: height 1.35s cubic-bezier(0.22, 0.8, 0.28, 1);
		-webkit-mask-image: linear-gradient(
			180deg,
			transparent 0%,
			rgba(0, 0, 0, 0.2) 10%,
			#000 32%,
			#000 100%
		);
		mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 10%, #000 32%, #000 100%);
	}

	.tide.surge,
	.tide.receding {
		z-index: 8;
		background: #14586c;
		border-radius: 48% 48% 0 0 / 5% 5% 0 0;
		-webkit-mask-image: none;
		mask-image: none;
	}

	.tide.surge {
		height: 118%;
		transition-duration: 1.55s;
	}

	.tide.receding {
		height: 26vh;
		transition-duration: 1.45s;
	}

	.fill,
	.lip,
	.swell,
	.foam,
	.spark {
		position: absolute;
		left: -12%;
		right: -12%;
	}

	.fill {
		inset: 0;
		left: 0;
		right: 0;
		background: linear-gradient(180deg, rgba(74, 168, 188, 0) 0%, #2f8ea3 38%, #1d6d86 62%, #0c3a4c 100%);
	}

	.tide.surge .fill,
	.tide.receding .fill {
		background: linear-gradient(180deg, #3aa0b8 0%, #1a7088 22%, #0c3a4c 100%);
	}

	.lip {
		top: 4%;
		height: 36%;
		border-radius: 50% 50% 40% 40%;
		background: radial-gradient(120% 80% at 50% 100%, rgba(90, 170, 190, 0.55), rgba(90, 170, 190, 0.12) 48%, transparent 74%);
		opacity: 0.85;
		transform: scale(1.2);
		transform-origin: 50% 100%;
	}

	.tide.surge .lip,
	.tide.receding .lip {
		top: -6%;
		height: 22%;
		background: radial-gradient(120% 90% at 50% 80%, #e7f8fb, #3aa0b8 46%, #1a7088 74%);
		opacity: 1;
		transform: none;
	}

	.swell {
		height: 70%;
		bottom: -10%;
		border-radius: 50% 50% 0 0 / 36% 36% 0 0;
	}

	.swell.far {
		height: 88%;
		background: linear-gradient(180deg, rgba(47, 142, 163, 0.75), #1d6d86 52%, #0e3f52);
		animation: roll 11s ease-in-out infinite;
	}

	.swell.mid {
		height: 64%;
		background: linear-gradient(180deg, rgba(94, 184, 201, 0.7), #2b8aa3 44%, #14586c);
		animation: roll 7.5s ease-in-out infinite reverse;
	}

	.swell.near {
		height: 48%;
		background:
			radial-gradient(120% 80% at 20% 0%, rgba(255, 255, 255, 0.22), transparent 46%),
			linear-gradient(180deg, rgba(143, 208, 220, 0.75), #3aa0b8 40%, #18657c);
		animation: roll 5.4s ease-in-out infinite;
	}

	.tide.surge .swell,
	.tide.receding .swell {
		animation: none;
		transform: none;
		left: 0;
		right: 0;
		bottom: 0;
		height: 100%;
		border-radius: 0;
		opacity: 0.42;
	}

	.tide.surge .swell.far,
	.tide.receding .swell.far {
		opacity: 1;
		background: linear-gradient(180deg, #2f8ea3, #1d6d86 52%, #0e3f52);
	}

	.tide.surge .swell.mid,
	.tide.receding .swell.mid {
		height: 72%;
		background: linear-gradient(180deg, #5eb8c9, #2b8aa3 44%, #14586c);
	}

	.tide.surge .swell.near,
	.tide.receding .swell.near {
		height: 48%;
		background:
			radial-gradient(120% 80% at 20% 0%, #f4fcfd, transparent 46%),
			linear-gradient(180deg, #8fd0dc, #3aa0b8 40%, #18657c);
	}

	.tide.surge .foam,
	.tide.surge .spark,
	.tide.surge .fish,
	.tide.receding .foam,
	.tide.receding .spark,
	.tide.receding .fish {
		animation: none;
	}

	.foam {
		height: 56px;
		top: 14%;
		background:
			radial-gradient(18px 10px at 12% 60%, rgba(255, 255, 255, 0.55), transparent 70%),
			radial-gradient(26px 12px at 28% 40%, rgba(255, 255, 255, 0.4), transparent 70%),
			radial-gradient(20px 11px at 47% 70%, rgba(255, 255, 255, 0.5), transparent 70%),
			radial-gradient(24px 10px at 69% 45%, rgba(255, 255, 255, 0.38), transparent 70%),
			radial-gradient(16px 9px at 88% 62%, rgba(255, 255, 255, 0.48), transparent 70%);
		transform: scale(1.12);
		animation: lace 3.6s ease-in-out infinite;
		opacity: 0.7;
	}

	.spark {
		height: 40%;
		top: 8%;
		background:
			radial-gradient(4px 4px at 16% 40%, rgba(255, 255, 255, 0.7), transparent 70%),
			radial-gradient(3px 3px at 34% 62%, rgba(255, 255, 255, 0.55), transparent 70%),
			radial-gradient(5px 5px at 58% 30%, rgba(255, 255, 255, 0.65), transparent 70%),
			radial-gradient(3px 3px at 76% 58%, rgba(255, 255, 255, 0.5), transparent 70%),
			radial-gradient(4px 4px at 91% 36%, rgba(255, 255, 255, 0.62), transparent 70%);
		animation: lace 2.8s ease-in-out infinite reverse;
		opacity: 0.85;
	}

	.fish {
		position: absolute;
		width: 16px;
		height: 6px;
		border-radius: 50%;
		background: rgba(8, 32, 42, 0.28);
		box-shadow: 7px 0 0 -2px rgba(8, 32, 42, 0.18);
		animation: dart 9s ease-in-out infinite;
	}

	.fish.a {
		bottom: 28%;
		left: 12%;
	}

	.fish.b {
		bottom: 42%;
		left: 48%;
		scale: 0.75;
		animation-duration: 12s;
		animation-delay: -4s;
	}

	.fish.c {
		bottom: 22%;
		left: 70%;
		scale: 0.6;
		animation-duration: 8s;
		animation-delay: -2s;
		animation-direction: reverse;
	}

	@keyframes dart {
		0%,
		100% {
			translate: 0 0;
		}
		30% {
			translate: 70px -8px;
		}
		60% {
			translate: 20px 6px;
		}
		80% {
			translate: 90px -4px;
		}
	}

	@keyframes roll {
		0%,
		100% {
			transform: translateX(-5%) translateY(4%);
		}
		50% {
			transform: translateX(6%) translateY(-5%);
		}
	}

	@keyframes lace {
		0%,
		100% {
			opacity: 0.45;
			transform: translateX(-3%);
		}
		50% {
			opacity: 0.75;
			transform: translateX(4%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.swell,
		.foam,
		.spark,
		.fish {
			animation: none;
		}

		.tide {
			transition: height 0.45s ease;
		}
	}
</style>
