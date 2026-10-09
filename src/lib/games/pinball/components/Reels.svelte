<script lang="ts">
	let { value, digits = 6 }: { value: number; digits?: number } = $props();

	const shown = $derived(String(Math.max(0, Math.floor(value)) % 10 ** digits).padStart(digits, '0'));
	const lead = $derived(shown.length - String(Math.max(0, Math.floor(value)) % 10 ** digits).length);
</script>

<span class="reels" aria-label={value.toLocaleString()}>
	{#each shown.split('') as d, i (i)}
		<span class="reel" class:blank={i < lead && i < digits - 1} aria-hidden="true">
			<span class="strip" style:--d={Number(d)}>
				{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as n (n)}<i>{n}</i>{/each}
			</span>
		</span>
	{/each}
</span>

<style>
	.reels {
		display: inline-flex;
		gap: 2px;
		padding: 2px 3px;
		border-radius: 4px;
		background: #0c0806;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
	}

	.reel {
		position: relative;
		width: 0.78em;
		height: 1.2em;
		overflow: hidden;
		border-radius: 2px;
		background: linear-gradient(#cfc2a4, #fff7e2 30%, #fff7e2 70%, #cfc2a4);
		color: #1c140c;
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 700;
		line-height: 1.2em;
		text-align: center;
	}

	.reel.blank .strip {
		opacity: 0.18;
	}

	.strip {
		display: grid;
		transform: translateY(calc(var(--d) * -1.2em));
		transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.6, 1);
	}

	.strip i {
		font-style: normal;
		height: 1.2em;
	}

	@media (prefers-reduced-motion: reduce) {
		.strip {
			transition: none;
		}
	}
</style>
