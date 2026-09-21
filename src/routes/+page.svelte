<script lang="ts">
	import ArcadeLauncher from '$lib/components/ArcadeLauncher.svelte';
	import { closeSettings, audioSettings } from '$lib/game/settings.svelte';

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && audioSettings.open) {
			closeSettings();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<ArcadeLauncher />
