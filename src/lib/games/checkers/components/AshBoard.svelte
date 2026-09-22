<script lang="ts">
	import { playSelect } from '../audio';
	import { playable, same, SIZE, type Coord, type Ghost } from '../types';
	import type { AshSession } from '../session.svelte';

	let { session }: { session: AshSession } = $props();

	const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	const hide = $derived(new Set(session.hidden));
	const landings = $derived(new Set(session.options.map((move) => `${move.to.r}:${move.to.c}`)));
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
	const sparks = [
		{ x: -22, y: -26 },
		{ x: 18, y: -20 },
		{ x: 24, y: 10 },
		{ x: -16, y: 18 },
		{ x: 6, y: -32 },
		{ x: -26, y: 4 }
	];
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

	<div class="slab" class:hot={session.mustTake}>
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

			{#each session.scorches as mark (mark.id)}
				<span class="burst" style:--r={mark.r} style:--c={mark.c} aria-hidden="true">
					{#each sparks as spark, i (`${mark.id}-${i}`)}
						<i style:--dx="{spark.x}%" style:--dy="{spark.y}%" style:--delay="{i * 18}ms"></i>
					{/each}
				</span>
			{/each}

			{#each session.falls as fall (fall.key)}
				<span
					class={['stone', 'fall', fall.player === 1 ? 'ember' : 'bone', fall.king && 'king']}
					style:--r={fall.r}
					style:--c={fall.c}
					aria-hidden="true"
				>
					<i></i>
					<b></b>
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

	.cell {
		appearance: none;
		border: 0;
		padding: 0;
		position: relative;
		cursor: pointer;
		background:
			linear-gradient(145deg, #fbf8f2, #ece4d6 58%, #d8ccbc);
	}

	.cell.dark {
		background:
			linear-gradient(160deg, #3a342e, #2a2420 62%, #1c1814);
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
		box-shadow: inset 0 0 0 2px rgba(61, 107, 92, 0.45);
	}

	.cell.onto {
		box-shadow: inset 0 0 0 2px rgba(158, 27, 42, 0.55);
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

	.heat {
		background: linear-gradient(
			115deg,
			transparent 42%,
			rgba(255, 252, 245, 0.14) 50%,
			transparent 58%
		);
		background-size: 240% 100%;
		animation: sweep 8s ease-in-out infinite;
		opacity: 0.7;
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

	.stone.fall {
		z-index: 4;
		animation: cinderfall 640ms ease-in forwards;
		transition: none;
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

	.burst i {
		position: absolute;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #9e1b2a;
		opacity: 0;
		animation: spark 540ms ease-out forwards;
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
			scale: 1;
		}
		100% {
			opacity: 0;
			translate: var(--dx) var(--dy);
			scale: 0.25;
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
			background-position: 120% 0;
		}
		to {
			background-position: -40% 0;
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

	@keyframes cinderfall {
		0% {
			opacity: 1;
			translate: calc(var(--c) * 100%) calc(var(--r) * 100%);
			scale: 1;
			rotate: 0deg;
		}
		100% {
			opacity: 0;
			translate: calc(var(--c) * 100%) calc(var(--r) * 100% + 48%);
			scale: 0.38;
			rotate: 32deg;
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

		.stone.fall,
		.stone.ember i,
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

		.stone.fall,
		.cell.scorch::after,
		.burst i {
			opacity: 0;
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
