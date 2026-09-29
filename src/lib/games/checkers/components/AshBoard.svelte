<script lang="ts">
	import { playSelect } from '../audio';
	import { playable, same, SIZE, type Coord, type Ghost } from '../types';
	import type { AshSession } from '../session.svelte';

	let { session }: { session: AshSession } = $props();

	const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	const hide = $derived(new Set(session.hidden));
	const landings = $derived(new Set(session.landings.map((to) => `${to.r}:${to.c}`)));
	const jumperKeys = $derived(new Set(session.jumpers.map((jumper) => `${jumper.r}:${jumper.c}`)));
	const pickKey = $derived(session.selected ? `${session.selected.r}:${session.selected.c}` : '');
	const hoverKey = $derived(session.hover ? `${session.hover.r}:${session.hover.c}` : '');
	const ghostId = $derived(session.ghost?.id ?? '');
	const fromKey = $derived(session.lastMove ? `${session.lastMove.from.r}:${session.lastMove.from.c}` : '');
	const toKey = $derived(session.lastMove ? `${session.lastMove.to.r}:${session.lastMove.to.c}` : '');
	const dust = Array.from({ length: 10 }, (_, i) => ({
		i,
		x: 8 + ((i * 17) % 84),
		y: 10 + ((i * 23) % 80),
		delay: (i * 0.47) % 5,
		dur: 5 + (i % 4)
	}));
	const sparks = Array.from({ length: 10 }, (_, i) => {
		const a = (i / 10) * Math.PI * 2 + (i % 3) * 0.3;
		const d = 34 + (i % 4) * 9;
		return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d - 10) };
	});
	const shards = [
		{ x: -38, y: -30, rot: -140 },
		{ x: 34, y: -36, rot: 120 },
		{ x: 42, y: 18, rot: 200 },
		{ x: -30, y: 30, rot: -220 },
		{ x: 6, y: -46, rot: 90 }
	];
	const rays = Array.from({ length: 8 }, (_, i) => i * 45);
	const stones = $derived.by(() => {
		const list: Ghost[] = [];
		for (let r = 0; r < SIZE; r += 1) {
			for (let c = 0; c < SIZE; c += 1) {
				const piece = session.board[r][c];
				if (!piece || hide.has(piece.id)) continue;
				list.push({ id: piece.id, player: piece.player, king: piece.king, r, c });
			}
		}
		if (session.ghost) list.push(session.ghost);
		return list;
	});
	const cinders = $derived.by(() => {
		let ember = 0;
		let bone = 0;
		for (const stone of stones) {
			if (stone.player === 1) ember += 1;
			else bone += 1;
		}
		return {
			ember: Array.from({ length: Math.max(0, 12 - ember) }, (_, i) => i),
			bone: Array.from({ length: Math.max(0, 12 - bone) }, (_, i) => i)
		};
	});

	function hover(r: number, c: number) {
		if (session.busy || !playable(r, c)) return;
		const at = { r, c };
		if (!session.hover || !same(session.hover, at)) playSelect();
		session.setHover(at);
	}

	function label(r: number, c: number) {
		const piece = session.board[r][c];
		const side = piece ? (piece.player === 1 ? 'ember' : 'bone') : 'empty';
		const rank = piece?.king ? ' king' : '';
		return `${files[c]}${SIZE - r}, ${side}${rank}`;
	}

	function onCell(r: number, c: number) {
		void session.playSquare(r, c);
	}

	function isCursor(r: number, c: number) {
		return session.cursor.r === r && session.cursor.c === c;
	}

	function isSelected(r: number, c: number) {
		return Boolean(session.selected && same(session.selected, { r, c }));
	}

	function scorchAt(r: number, c: number) {
		return session.scorches.some((mark) => mark.r === r && mark.c === c);
	}

	function flash(pulse: number) {
		return (node: HTMLElement) => {
			if (!pulse) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			for (const anim of node.getAnimations()) anim.cancel();
			node.animate(
				[
					{ opacity: 0.4, transform: 'scaleX(1)' },
					{ opacity: 1, transform: 'scaleX(1.08)' },
					{ opacity: 0.55, transform: 'scaleX(1)' }
				],
				{ duration: 640, easing: 'ease-out' }
			);
		};
	}

	const cells: Coord[] = [];
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			cells.push({ r, c });
		}
	}
</script>

<div class="court">
	<aside class="well ember" aria-hidden="true">
		<span>Ember taken</span>
		<div class="pit">
			{#each cinders.ember as chip (chip)}
				<i style:--i={chip}></i>
			{/each}
		</div>
	</aside>

	<div class="slab" class:hot={session.mustTake} style:--heat={Math.min(1, session.heat / 8)}>
		<div class="lip"></div>
		<ol class="ranks" aria-hidden="true">
			{#each Array.from({ length: SIZE }, (_, i) => SIZE - i) as rank (rank)}
				<li>{rank}</li>
			{/each}
		</ol>
		<ol class="files" aria-hidden="true">
			{#each files as file (file)}
				<li>{file}</li>
			{/each}
		</ol>
		<div class="hearth" aria-hidden="true"></div>
		<div class="board" role="grid" aria-label="Ashcourt">
			<div class="heat" aria-hidden="true"></div>
			<div class="dust" aria-hidden="true">
				{#each dust as spec (spec.i)}
					<i
						style:--x="{spec.x}%"
						style:--y="{spec.y}%"
						style:--delay="{spec.delay}s"
						style:--dur="{spec.dur}s"
					></i>
				{/each}
			</div>
			{#each cells as cell (`${cell.r}-${cell.c}`)}
				<button
					type="button"
					class="cell"
					class:dark={playable(cell.r, cell.c)}
					class:light={!playable(cell.r, cell.c)}
					class:land={landings.has(`${cell.r}:${cell.c}`)}
					class:jump={jumperKeys.has(`${cell.r}:${cell.c}`)}
					class:on={isCursor(cell.r, cell.c)}
					class:pick={isSelected(cell.r, cell.c)}
					class:scorch={scorchAt(cell.r, cell.c)}
					class:from={fromKey === `${cell.r}:${cell.c}`}
					class:onto={toKey === `${cell.r}:${cell.c}`}
					class:ponder={session.aiThinking && session.hover && same(session.hover, cell)}
					style:--r={cell.r}
					style:--c={cell.c}
					aria-label={label(cell.r, cell.c)}
					disabled={session.busy}
					onclick={() => onCell(cell.r, cell.c)}
					onpointerenter={() => hover(cell.r, cell.c)}
					onpointerleave={() => session.setHover(null)}
				></button>
			{/each}

			{#each stones as stone (stone.id)}
				{@const key = `${stone.r}:${stone.c}`}
				<span
					class={[
						'stone',
						stone.player === 1 ? 'ember' : 'bone',
						stone.king && 'king',
						pickKey === key && 'lift',
						ghostId === stone.id && 'fly',
						hoverKey === key && pickKey !== key && ghostId !== stone.id && 'peek',
						jumperKeys.has(key) && 'can-take'
					]}
					style:--r={stone.r}
					style:--c={stone.c}
					aria-hidden="true"
				>
					<i></i>
					<b></b>
					{#if stone.king}
						<em class="c1"></em>
						<em class="c2"></em>
						<em class="c3"></em>
					{/if}
				</span>
			{/each}

			{#if session.lastMove}
				{#key session.lastMove}
					<span
						class="ripple"
						style:--r={session.lastMove.to.r}
						style:--c={session.lastMove.to.c}
						aria-hidden="true"
					></span>
				{/key}
			{/if}

			{#if session.kindle && session.ghost?.king}
				{#key session.kindle}
					<span class="crowning" style:--r={session.ghost.r} style:--c={session.ghost.c} aria-hidden="true">
						{#each rays as deg (deg)}
							<i style:--a="{deg}deg"></i>
						{/each}
					</span>
				{/key}
			{/if}

			{#each session.scorches as mark (mark.id)}
				<span class="burst" style:--r={mark.r} style:--c={mark.c} aria-hidden="true">
					{#each sparks as spark, i (`${mark.id}-${i}`)}
						<i style:--dx={spark.x} style:--dy={spark.y} style:--delay="{i * 14}ms"></i>
					{/each}
				</span>
			{/each}

			{#each session.falls as fall (fall.key)}
				<span
					class={['shatter', fall.player === 1 ? 'ember' : 'bone']}
					style:--r={fall.r}
					style:--c={fall.c}
					aria-hidden="true"
				>
					{#each shards as shard, i (i)}
						<s style:--dx={shard.x} style:--dy={shard.y} style:--rot="{shard.rot}deg" style:--k={i}></s>
					{/each}
				</span>
			{/each}
		</div>
		<div class="grate" {@attach flash(session.turnPulse)} aria-hidden="true"></div>
		<div class="vents" aria-hidden="true">
			<span></span><span></span><span></span><span></span>
		</div>
	</div>

	<aside class="well bone" aria-hidden="true">
		<span>Bone taken</span>
		<div class="pit">
			{#each cinders.bone as chip (chip)}
				<i style:--i={chip}></i>
			{/each}
		</div>
	</aside>
</div>

<style>
	.court {
		width: min(100%, max(100cqmin, min(100cqw, calc(100cqmin + 140px))));
		height: min(100%, 100cqh);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		justify-items: center;
	}

	.well {
		align-self: center;
		width: 56px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px 6px 10px;
		border-radius: 16px;
		border: 1px solid rgba(158, 27, 42, 0.22);
		background:
			linear-gradient(180deg, rgba(255, 250, 242, 0.82), rgba(232, 220, 204, 0.9));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			0 10px 18px rgba(70, 50, 30, 0.1);
	}

	.well span {
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.52rem;
		line-height: 1.2;
		color: #9e1b2a;
		text-align: center;
	}

	.pit {
		display: flex;
		flex-wrap: wrap-reverse;
		justify-content: center;
		align-content: flex-end;
		gap: 4px;
		width: 40px;
		min-height: 36px;
		margin: 0 auto;
	}

	.pit i {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		animation: settle 420ms ease-out both;
		animation-delay: calc(var(--i) * 40ms);
	}

	.well.ember i {
		background: radial-gradient(circle at 32% 28%, #f4c4c8, #9e1b2a 52%, #4a1018);
		box-shadow: 0 0 10px rgba(158, 27, 42, 0.35);
	}

	.well.bone i {
		background: radial-gradient(circle at 34% 28%, #ffffff, #f4efe6 62%, #b7c9be 100%);
		box-shadow: 0 0 8px rgba(61, 107, 92, 0.18);
	}

	.slab {
		position: relative;
		align-self: center;
		justify-self: center;
		box-sizing: border-box;
		width: min(100%, 100cqmin);
		max-width: 100%;
		max-height: 100%;
		height: auto;
		aspect-ratio: 1;
		padding: 24px;
		border-radius: 32px;
		background:
			linear-gradient(180deg, #5a5048 0%, #3a342e 46%, #2a2420 100%);
		box-shadow:
			0 32px 70px rgba(70, 50, 30, 0.28),
			inset 0 1px 0 rgba(255, 248, 236, 0.28),
			inset 0 -18px 28px rgba(0, 0, 0, 0.22);
	}

	.slab::before {
		content: '';
		position: absolute;
		left: 18%;
		right: 18%;
		bottom: 8px;
		height: 18px;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(0, 0, 0, 0.28), transparent 70%);
		pointer-events: none;
	}

	.lip {
		position: absolute;
		inset: 14px;
		border-radius: 24px;
		border: 1px solid rgba(247, 244, 236, 0.28);
		box-shadow: inset 0 0 0 6px rgba(24, 18, 14, 0.45);
		pointer-events: none;
	}

	.ranks,
	.files {
		position: absolute;
		margin: 0;
		padding: 0;
		list-style: none;
		pointer-events: none;
		color: #f4efe6;
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		opacity: 0.75;
		z-index: 2;
	}

	.ranks {
		left: 4px;
		top: 24px;
		bottom: 24px;
		display: grid;
		grid-template-rows: repeat(8, 1fr);
		align-items: center;
		text-align: center;
		width: 18px;
	}

	.files {
		left: 24px;
		right: 24px;
		bottom: 4px;
		height: 18px;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		justify-items: center;
		align-items: center;
	}

	.hearth {
		position: absolute;
		inset: 24px;
		border-radius: 16px;
		background: radial-gradient(circle at 50% 80%, rgba(158, 27, 42, 0.16), transparent 62%);
		pointer-events: none;
		z-index: 0;
		animation: grate 3.4s ease-in-out infinite;
	}

	.board {
		position: relative;
		z-index: 1;
		width: 100%;
		aspect-ratio: 1;
		height: auto;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		overflow: hidden;
		border-radius: 14px;
		box-shadow:
			inset 0 0 0 1px rgba(24, 18, 14, 0.7),
			0 0 0 1px rgba(247, 244, 236, 0.16);
	}

	.board {
		--crackle: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='none' stroke='%236e5c48' stroke-width='0.8' stroke-linejoin='round'%3E%3Cpath stroke-opacity='0.2' d='M0 18L22 24L38 12L60 20L84 8L120 18M22 24L28 52L12 70L0 66M28 52L56 58L60 20M56 58L78 44L84 8M78 44L104 56L120 50M104 56L100 84L120 92M56 58L50 88L28 96L12 70M50 88L76 100L100 84M76 100L82 120M28 96L20 120M84 8L82 0M12 70L0 76'/%3E%3Cpath stroke-opacity='0.1' d='M38 12L44 36L28 52M78 44L70 72L50 88M100 84L92 108L76 100M12 70L6 94L20 120M104 56L114 72'/%3E%3C/svg%3E");
	}

	.cell {
		appearance: none;
		border: 0;
		padding: 0;
		position: relative;
		cursor: pointer;
		background:
			radial-gradient(120% 90% at 22% 12%, rgba(255, 255, 255, 0.75), transparent 46%),
			var(--crackle) calc(var(--c) * -37px) calc(var(--r) * -53px) / 120px 120px,
			linear-gradient(145deg, #fbf8f2, #ece4d6 58%, #d8ccbc);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.8),
			inset 0 -2px 3px rgba(110, 92, 72, 0.18);
	}

	.cell.dark {
		background:
			radial-gradient(90% 70% at 50% 110%, rgba(196, 59, 74, calc(0.08 + var(--heat, 0) * 0.4)), transparent 70%),
			radial-gradient(3px 3px at 30% 40%, rgba(255, 244, 230, 0.06), transparent),
			linear-gradient(160deg, #3a342e, #2a2420 62%, #1c1814);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
	}

	.cell.dark::before {
		content: '';
		position: absolute;
		inset: 14%;
		border-radius: 6px;
		border: 1px solid rgba(247, 244, 236, 0.08);
		box-shadow: inset 0 -8px 12px rgba(0, 0, 0, 0.18);
		pointer-events: none;
	}

	.cell.from {
		box-shadow:
			inset 0 0 0 2px rgba(61, 107, 92, 0.45),
			inset 0 0 18px rgba(61, 107, 92, 0.25);
	}

	.cell.onto {
		box-shadow:
			inset 0 0 0 2px rgba(158, 27, 42, 0.55),
			inset 0 0 22px rgba(196, 59, 74, 0.35);
	}

	.cell.scorch::after {
		content: '';
		position: absolute;
		inset: 8%;
		border-radius: 50%;
		pointer-events: none;
		background: radial-gradient(circle, rgba(158, 27, 42, 0.55), rgba(158, 27, 42, 0.12) 46%, transparent 70%);
		animation: ember-out 700ms ease-out forwards;
		z-index: 1;
	}

	.cell.land::after,
	.cell.jump::after,
	.cell.pick::after {
		content: '';
		position: absolute;
		inset: 18%;
		border-radius: 50%;
		pointer-events: none;
		z-index: 1;
	}

	.cell.land::after {
		inset: 24%;
		border: 2px dashed rgba(61, 107, 92, 0.95);
		background: radial-gradient(circle, rgba(158, 27, 42, 0.22), transparent 68%);
		box-shadow: 0 0 12px rgba(61, 107, 92, 0.28);
		animation:
			land-spin 2.6s linear infinite,
			pulse 1.1s ease-in-out infinite;
	}

	.cell.jump::after {
		inset: 8%;
		border: 2px dashed rgba(158, 27, 42, 0.7);
		animation: pulse 1.1s ease-in-out infinite;
	}

	.cell.pick::after {
		inset: 8%;
		background: radial-gradient(circle, rgba(158, 27, 42, 0.22), transparent 70%);
	}

	.cell.on {
		outline: 2px solid rgba(61, 107, 92, 0.8);
		outline-offset: -2px;
		z-index: 1;
	}

	.cell.ponder {
		background:
			radial-gradient(circle at 50% 50%, rgba(61, 107, 92, 0.32), transparent 62%),
			linear-gradient(160deg, #3a342e, #2a2420);
	}

	.cell:disabled {
		cursor: default;
	}

	.heat,
	.dust {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
	}

	/* Moved by transform, not background-position, so the textured tiles beneath never repaint. */
	.heat {
		inset: 0 auto 0 -120%;
		width: 340%;
		background: linear-gradient(
			115deg,
			transparent 44%,
			rgba(255, 252, 245, 0.18) 50%,
			transparent 56%
		);
		animation: sweep 8s ease-in-out infinite;
		opacity: 0.7;
		will-change: transform;
	}

	.dust i {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #ffffff;
		opacity: 0;
		animation: mote var(--dur) ease-in-out infinite;
		animation-delay: var(--delay);
	}

	.stone {
		position: absolute;
		left: 0;
		top: 0;
		width: 12.5%;
		aspect-ratio: 1;
		height: auto;
		display: grid;
		place-items: center;
		pointer-events: none;
		z-index: 2;
		translate: calc(var(--c) * 100%) calc(var(--r) * 100%);
		transition:
			translate 380ms cubic-bezier(0.18, 1.12, 0.32, 1),
			scale 220ms ease;
	}

	.stone.peek {
		translate: calc(var(--c) * 100%) calc(var(--r) * 100% - 4%);
		scale: 1.04;
	}

	.stone.lift {
		z-index: 5;
		translate: calc(var(--c) * 100%) calc(var(--r) * 100% - 8%);
		scale: 1.1;
	}

	.stone.fly {
		z-index: 6;
	}

	.stone.fly i {
		animation: hop-arc 380ms cubic-bezier(0.22, 0.85, 0.28, 1);
	}

	.stone.can-take i {
		box-shadow:
			0 8px 12px rgba(40, 24, 18, 0.4),
			0 0 18px rgba(158, 27, 42, 0.45);
	}

	.stone i,
	.stone b,
	.stone em {
		position: absolute;
		display: block;
	}

	.stone i {
		width: 74%;
		aspect-ratio: 1;
		height: auto;
		border-radius: 50%;
	}

	.stone.ember i {
		background:
			radial-gradient(circle at 32% 26%, #f8d4d6, #c43b4a 28%, #9e1b2a 62%, #4a1018 100%);
		box-shadow:
			0 8px 14px rgba(40, 20, 16, 0.4),
			0 0 14px rgba(158, 27, 42, 0.32),
			inset 0 -8px 10px rgba(50, 8, 12, 0.4),
			inset 0 3px 0 rgba(255, 230, 230, 0.45);
		animation: ember-idle 2.6s ease-in-out infinite;
		animation-delay: calc((var(--r) + var(--c)) * 90ms);
	}

	.stone.bone i {
		background:
			radial-gradient(circle at 34% 26%, #ffffff, #f7f4ee 42%, #e6e0d4 78%, #b7c9be 100%);
		box-shadow:
			0 8px 14px rgba(40, 32, 24, 0.28),
			0 0 10px rgba(61, 107, 92, 0.16),
			inset 0 0 0 1px rgba(255, 255, 255, 0.6),
			inset 0 -8px 8px rgba(80, 90, 70, 0.1);
		animation: bone-idle 3.4s ease-in-out infinite;
		animation-delay: calc((var(--r) * 3 + var(--c)) * 70ms);
	}

	.stone i::before,
	.stone i::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
	}

	/* Wet glaze: a hard window highlight plus a soft rim light from below. */
	.stone.ember i::before {
		background:
			radial-gradient(38% 22% at 36% 22%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 70%),
			radial-gradient(60% 30% at 55% 92%, rgba(255, 170, 160, 0.35), transparent 70%);
	}

	.stone.ember i::after {
		background: conic-gradient(
			from 200deg,
			transparent 0 20%,
			rgba(255, 220, 220, 0.28) 28%,
			transparent 36% 100%
		);
		animation: glaze-turn 7s linear infinite;
		animation-delay: calc((var(--r) + var(--c)) * -0.6s);
	}

	/* Raku crackle on the cooled china. */
	.stone.bone i::before {
		background: var(--crackle) calc(var(--c) * -23px) calc(var(--r) * -41px) / 70% 70%;
		opacity: 0.6;
		mask-image: radial-gradient(circle, #000 60%, transparent 72%);
	}

	.stone.bone i::after {
		background: radial-gradient(34% 20% at 34% 22%, rgba(255, 255, 255, 0.95), transparent 70%);
	}

	/* Kintsugi: kings wear a gold seam that catches the light as it turns. */
	.stone.king::after {
		content: '';
		position: absolute;
		width: 80%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: conic-gradient(
			from 0deg,
			#8a6420,
			#f5d67a 12%,
			#b8862c 25%,
			#fff1b8 38%,
			#a07224 52%,
			#f0cc68 70%,
			#8a6420 86%,
			#f5d67a
		);
		mask: radial-gradient(circle, transparent calc(50% - 3px), #000 calc(50% - 2.5px) 50%, transparent calc(50% + 0.5px));
		filter: drop-shadow(0 0 4px rgba(245, 214, 122, 0.7));
		animation: glaze-turn 5s linear infinite;
		pointer-events: none;
	}

	.stone b {
		width: 28%;
		height: 28%;
		border-radius: 50%;
	}

	.stone.ember b {
		background: #f4c4c8;
		box-shadow: 0 0 10px rgba(244, 196, 200, 0.7);
		animation: heart 1.6s ease-in-out infinite;
	}

	.stone.bone b {
		width: 38%;
		height: 38%;
		border-radius: 50%;
		background: transparent;
		border: 1.5px solid rgba(61, 107, 92, 0.4);
		rotate: 0deg;
		animation: bone-mark 3.2s ease-in-out infinite;
	}

	.stone.king em {
		width: 12%;
		height: 26%;
		top: 4%;
		background: #9e1b2a;
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
		animation: gleam 2.2s ease-in-out infinite;
	}

	.stone.bone.king em {
		background: #f7f4ee;
		clip-path: none;
		width: 18%;
		height: 18%;
		top: 6%;
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(61, 107, 92, 0.45);
	}

	.stone.bone.king .c1,
	.stone.bone.king .c2,
	.stone.bone.king .c3 {
		rotate: 0deg;
		height: 16%;
		top: 8%;
	}

	.stone.king .c1 {
		left: 26%;
		rotate: -18deg;
		animation-delay: 0s;
	}

	.stone.king .c2 {
		left: 44%;
		height: 28%;
		top: 2%;
		animation-delay: 0.18s;
	}

	.stone.king .c3 {
		left: 62%;
		rotate: 18deg;
		animation-delay: 0.32s;
	}

	.stone.fly i,
	.stone.fly.ember i,
	.stone.fly.bone i {
		animation: hop-arc 380ms cubic-bezier(0.22, 0.85, 0.28, 1);
	}

	.stone.can-take.ember i {
		box-shadow:
			0 8px 14px rgba(40, 20, 16, 0.4),
			0 0 22px rgba(158, 27, 42, 0.7),
			inset 0 -8px 10px rgba(50, 8, 12, 0.4),
			inset 0 3px 0 rgba(255, 230, 230, 0.45);
	}

	.stone.can-take.bone i {
		box-shadow:
			0 8px 14px rgba(40, 32, 24, 0.28),
			0 0 16px rgba(61, 107, 92, 0.45),
			inset 0 0 0 1px rgba(255, 255, 255, 0.6);
	}

	.burst,
	.shatter,
	.ripple,
	.crowning {
		position: absolute;
		left: 0;
		top: 0;
		width: 12.5%;
		aspect-ratio: 1;
		height: auto;
		display: grid;
		place-items: center;
		pointer-events: none;
		container-type: size;
		translate: calc(var(--c) * 100%) calc(var(--r) * 100%);
	}

	.shatter {
		z-index: 5;
	}

	.shatter s {
		position: absolute;
		width: 30%;
		height: 26%;
		clip-path: polygon(10% 0, 100% 30%, 70% 100%, 0 70%);
		animation: shard 700ms cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
		animation-delay: calc(var(--k) * 12ms);
	}

	.shatter s:nth-child(odd) {
		clip-path: polygon(0 20%, 80% 0, 100% 80%, 30% 100%);
		width: 24%;
	}

	.shatter.ember s {
		background: linear-gradient(135deg, #f8d4d6, #c43b4a 40%, #6a141e);
	}

	.shatter.bone s {
		background: linear-gradient(135deg, #ffffff, #efe8dc 50%, #b7c9be);
	}

	.shatter::before {
		content: '';
		position: absolute;
		width: 80%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(120, 104, 92, 0.5), rgba(120, 104, 92, 0.18) 50%, transparent 70%);
		animation: puff 900ms ease-out forwards;
	}

	.ripple {
		z-index: 1;
	}

	.ripple::before,
	.ripple::after {
		content: '';
		position: absolute;
		width: 70%;
		aspect-ratio: 1;
		border-radius: 50%;
		border: 2px solid rgba(196, 59, 74, 0.55);
		animation: ripple 800ms ease-out forwards;
	}

	.ripple::after {
		border-color: rgba(255, 244, 230, 0.5);
		animation-delay: 120ms;
	}

	.crowning {
		z-index: 7;
	}

	.crowning::before {
		content: '';
		position: absolute;
		width: 90%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 241, 184, 0.95), rgba(245, 214, 122, 0.45) 40%, transparent 70%);
		animation: crown-flash 900ms ease-out forwards;
	}

	.crowning i {
		position: absolute;
		width: 6%;
		height: 60%;
		border-radius: 4px;
		background: linear-gradient(0deg, transparent, #f5d67a 40%, #fff6d0);
		left: 47%;
		bottom: 50%;
		transform-origin: 50% 100%;
		rotate: var(--a);
		animation: crown-ray 800ms ease-out forwards;
		filter: drop-shadow(0 0 4px rgba(245, 214, 122, 0.9));
	}

	.burst {
		position: absolute;
		left: 0;
		top: 0;
		width: 12.5%;
		aspect-ratio: 1;
		height: auto;
		display: grid;
		place-items: center;
		pointer-events: none;
		z-index: 6;
		translate: calc(var(--c) * 100%) calc(var(--r) * 100%);
	}

	.burst::before {
		content: '';
		position: absolute;
		width: 100%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 214, 160, 0.9), rgba(255, 110, 60, 0.45) 35%, transparent 68%);
		animation: crown-flash 520ms ease-out forwards;
	}

	.burst i {
		position: absolute;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #ffd08a;
		box-shadow:
			0 0 6px 2px rgba(255, 120, 50, 0.85),
			0 0 14px rgba(196, 59, 74, 0.6);
		opacity: 0;
		animation: spark 640ms cubic-bezier(0.15, 0.7, 0.3, 1) forwards;
		animation-delay: var(--delay);
	}

	.grate {
		position: absolute;
		left: 22%;
		right: 22%;
		bottom: 26px;
		height: 5px;
		border-radius: 8px;
		background: linear-gradient(90deg, transparent, rgba(158, 27, 42, 0.55), transparent);
		box-shadow: 0 0 12px rgba(158, 27, 42, 0.22);
		opacity: 0.7;
		pointer-events: none;
		animation: grate 2.8s ease-in-out infinite;
	}

	.vents {
		position: absolute;
		inset: 6px;
		pointer-events: none;
	}

	.vents span {
		position: absolute;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(158, 27, 42, 0.45), transparent 70%);
		opacity: 0.55;
		animation: vent 2.4s ease-in-out infinite;
	}

	.vents span:nth-child(1) {
		left: 8px;
		top: 8px;
	}
	.vents span:nth-child(2) {
		right: 8px;
		top: 8px;
		animation-delay: 0.4s;
	}
	.vents span:nth-child(3) {
		left: 8px;
		bottom: 8px;
		animation-delay: 0.8s;
	}
	.vents span:nth-child(4) {
		right: 8px;
		bottom: 8px;
		animation-delay: 1.1s;
	}

	.hot .vents span,
	.hot .grate {
		opacity: 0.95;
	}

	.hot .heat {
		opacity: 1;
	}

	@keyframes ember-idle {
		0%,
		100% {
			scale: 1;
		}
		50% {
			scale: 1.06;
		}
	}

	@keyframes bone-idle {
		0%,
		100% {
			rotate: -1.6deg;
		}
		50% {
			rotate: 1.8deg;
		}
	}

	@keyframes bone-mark {
		0%,
		100% {
			opacity: 0.4;
			scale: 0.92;
		}
		50% {
			opacity: 0.85;
			scale: 1.05;
		}
	}

	@keyframes hop-arc {
		0%,
		100% {
			translate: 0 0;
		}
		42% {
			translate: 0 -32%;
		}
	}

	@keyframes gleam {
		0%,
		100% {
			opacity: 0.62;
			translate: 0 0;
		}
		50% {
			opacity: 1;
			translate: 0 -12%;
		}
	}

	@keyframes spark {
		0% {
			opacity: 1;
			translate: 0 0;
			scale: 1.2;
		}
		100% {
			opacity: 0;
			translate: calc(var(--dx) * 1cqw) calc(var(--dy) * 1cqh + 12cqh);
			scale: 0.2;
		}
	}

	@keyframes shard {
		0% {
			opacity: 1;
			translate: 0 0;
			rotate: 0deg;
		}
		60% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: calc(var(--dx) * 1.4cqw) calc(var(--dy) * 1cqh + 70cqh);
			rotate: var(--rot);
		}
	}

	@keyframes puff {
		0% {
			opacity: 0.9;
			scale: 0.5;
		}
		100% {
			opacity: 0;
			scale: 1.8;
			translate: 0 -20cqh;
		}
	}

	@keyframes ripple {
		0% {
			opacity: 1;
			scale: 0.6;
		}
		100% {
			opacity: 0;
			scale: 1.5;
		}
	}

	@keyframes crown-flash {
		0% {
			opacity: 0;
			scale: 0.4;
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			scale: 1.9;
		}
	}

	@keyframes crown-ray {
		0% {
			opacity: 0;
			scale: 1 0.2;
		}
		30% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			scale: 1 1.6;
		}
	}

	@keyframes glaze-turn {
		to {
			rotate: 360deg;
		}
	}

	@keyframes mote {
		0%,
		100% {
			opacity: 0;
			translate: 0 8px;
		}
		40% {
			opacity: 0.5;
			translate: 8px -12px;
		}
	}

	@keyframes sweep {
		from {
			translate: 35% 0;
		}
		to {
			translate: -35% 0;
		}
	}

	@keyframes grate {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.85;
		}
	}

	@keyframes land-spin {
		to {
			rotate: 360deg;
		}
	}

	@keyframes heart {
		0%,
		100% {
			opacity: 0.7;
			scale: 0.92;
		}
		50% {
			opacity: 1;
			scale: 1.08;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.45;
			scale: 1;
		}
		50% {
			opacity: 1;
			scale: 1.04;
		}
	}

	@keyframes ember-out {
		0% {
			opacity: 1;
			scale: 0.55;
		}
		35% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
			scale: 1.15;
		}
	}

	@keyframes vent {
		0%,
		100% {
			opacity: 0.35;
			scale: 0.8;
		}
		50% {
			opacity: 0.8;
			scale: 1.15;
		}
	}

	@keyframes settle {
		from {
			opacity: 0;
			translate: 0 8px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stone {
			transition: none;
		}

		.stone.ember i,
		.stone.ember i::after,
		.stone.king::after,
		.stone.ember b,
		.stone.bone i,
		.stone.bone b,
		.stone.king em,
		.stone.fly i,
		.cell.jump::after,
		.cell.land::after,
		.cell.scorch::after,
		.burst i,
		.dust i,
		.heat,
		.grate,
		.vents span,
		.pit i {
			animation: none;
		}

		.cell.scorch::after,
		.burst i,
		.burst::before,
		.shatter,
		.ripple,
		.crowning {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.court {
			grid-template-columns: 1fr;
			width: min(100%, 100cqmin);
			height: min(100%, 100cqh);
		}

		.well {
			display: none;
		}

		.slab {
			padding: 24px;
			width: min(100%, 100cqmin);
		}
	}
</style>
