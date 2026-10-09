<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { pubPanelControls, pubPanels, pubView } from '../settings.svelte';
	import { VARIANTS, VARIANT_INFO, type Variant } from '../types';
	import { viewForVariant } from '../views';

	let tab = $state<Variant>(pubView.variant);
	const guide = $derived(viewForVariant(tab)?.guide ?? null);

	$effect(() => {
		if (pubPanels.guide.open) tab = pubView.variant;
	});

	const controls = [
		['Tap a card', 'Play it, or choose it for a pass or the crib'],
		['Drag a card up', 'Play it, the way you would toss it on the table'],
		['Tap the stock or discard', 'Draw or take, in the rummy games'],
		['Tap a card, then a glowing pile', 'Move it there, in patience and Kings Corner'],
		['Enter', 'Deal in from the bar'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the bar']
	];
</script>

<GuideShell open={pubPanels.guide.open} onclose={() => pubPanelControls.closeGuide()} tone="tavern" kicker="House rules, chalked by the bar">
	<div class="tabs" role="tablist">
		{#each VARIANTS as v (v)}
			<button role="tab" aria-selected={tab === v} class:on={tab === v} onclick={() => (tab = v)}>{VARIANT_INFO[v].title}</button>
		{/each}
	</div>

	{#if tab === 'cribbage'}
		<p>Two players, first to <strong>121</strong> holes on the board. Six cards each; both throw two face down into the dealer's <strong>crib</strong>.</p>
		<div class="cols">
			<div>
				<p class="sub">The play (pegging)</p>
				<ul>
					<li>The non-dealer cuts and the starter is turned. A jack turned up gives the dealer <strong>his heels</strong> for 2.</li>
					<li>Take turns laying cards, calling the running count. Never go over 31.</li>
					<li>Fifteen scores 2, thirty-one scores 2. Pairs 2, three of a kind 6, four 12. Runs of three or more score one per card, in any order.</li>
					<li>If you can't play, the other player says <strong>go</strong> and keeps going; the last card under 31 scores 1.</li>
				</ul>
			</div>
			<div>
				<p class="sub">The show</p>
				<ul>
					<li>Non-dealer counts first, then the dealer, then the crib (dealer's). Each hand counts with the starter.</li>
					<li>Every combination making 15 scores 2; pairs, runs as above.</li>
					<li>A four-card flush scores 4 (5 with the starter); the crib only counts a five-card flush.</li>
					<li>The jack of the starter's suit is <strong>his nobs</strong> for 1. The best hand is 29.</li>
					<li>Finishing more than 30 holes ahead is a skunk; more than 60 a double skunk.</li>
				</ul>
			</div>
		</div>
	{:else if tab === 'hearts'}
		<p>Four players, each for themselves. Avoid taking <strong>hearts</strong> (1 point each) and the <strong>queen of spades</strong> (13). When anyone reaches 100, lowest score wins.</p>
		<div class="cols">
			<div>
				<p class="sub">Passing</p>
				<ul>
					<li>Before each hand pass three cards: left, then right, then across, then hold. The cards you were passed glow green.</li>
				</ul>
				<p class="sub">Playing</p>
				<ul>
					<li>The two of clubs leads the first trick. Follow suit if you can; the highest card of the led suit wins.</li>
					<li>No points can be played on the first trick unless you have nothing else.</li>
					<li>Hearts can't be led until one has been played, unless you hold only hearts.</li>
				</ul>
			</div>
			<div>
				<p class="sub">Shooting the moon</p>
				<ul>
					<li>Take every heart and the queen and you score nothing, while everyone else takes 26.</li>
				</ul>
				<p class="sub">Pass and play</p>
				<ul>
					<li>Two, three or four people can share the device; the regulars fill the empty chairs.</li>
				</ul>
			</div>
		</div>
	{:else if tab === 'gin'}
		<p>Two players, ten cards each. Build <strong>melds</strong>: sets of three or four of a rank, or runs of three or more in one suit (ace is low). Unmatched cards are <strong>deadwood</strong>, counted at face value, court cards 10.</p>
		<div class="cols">
			<div>
				<p class="sub">Your turn</p>
				<ul>
					<li>The first upcard is offered to the non-dealer, then the dealer; if both pass, play starts from the stock.</li>
					<li>Draw from the stock or take the top discard, then discard one card. You can't throw back a card you just took.</li>
					<li>With 10 or less deadwood you may <strong>knock</strong>: press Knock, then tap the card to throw.</li>
					<li>If two cards are left in the stock, the hand is void and redealt.</li>
				</ul>
			</div>
			<div>
				<p class="sub">Scoring</p>
				<ul>
					<li>The defender lays off cards onto the knocker's melds. The knocker scores the difference in deadwood.</li>
					<li>If the defender ties or beats the knocker: <strong>undercut</strong>, 25 plus the difference to the defender.</li>
					<li><strong>Gin</strong> (no deadwood): 25 plus the defender's deadwood, no layoffs. <strong>Big gin</strong> with all eleven cards: 31.</li>
					<li>First to 100 wins the game. Then add 100 for game (200 for a shutout) and 25 per hand won.</li>
				</ul>
			</div>
		</div>
	{:else if tab === 'spades'}
		<p>Four players in two partnerships, all 52 cards, 13 tricks. <strong>Spades are always trump.</strong> Each side bids how many tricks it will take, then tries to take exactly that many.</p>
		<div class="cols">
			<div>
				<p class="sub">Bidding and play</p>
				<ul>
					<li>Everyone bids once, starting left of the dealer. Partners' bids add up to the side's contract.</li>
					<li><strong>Nil</strong> is a bid of zero: a promise to take no tricks at all. The partner's bid stands on its own.</li>
					<li>Follow suit if you can; otherwise play anything. The highest spade wins, or the highest card of the suit led.</li>
					<li>Spades can't be led until one has been played on another suit (<strong>broken</strong>), unless you hold only spades.</li>
				</ul>
			</div>
			<div>
				<p class="sub">Scoring</p>
				<ul>
					<li>Make the contract: 10 per trick bid, plus 1 per extra trick (a <strong>bag</strong>).</li>
					<li>Fall short (<strong>set</strong>): lose 10 per trick bid.</li>
					<li>Nil made: +100. Nil broken: −100, and the nil player's tricks don't help the partner.</li>
					<li>Every ten bags collected costs 100. First side to 300 wins; a side at −200 loses.</li>
				</ul>
			</div>
		</div>
	{:else if tab !== 'euchre' && guide}
		<p>{@render rich(guide.intro)}</p>
		<div class="cols">
			{#each guide.cols as col (col.title)}
				<div>
					<p class="sub">{col.title}</p>
					<ul>
						{#each col.items as item, i (i)}<li>{@render rich(item)}</li>{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else}
		<p>Four players in two partnerships, 24 cards (nine to ace). Make trump and take <strong>three of five tricks</strong>. The jack of trump (<strong>right bower</strong>) is highest, then the other jack of the same colour (<strong>left bower</strong>, which counts as trump).</p>
		<div class="cols">
			<div>
				<p class="sub">Making trump</p>
				<ul>
					<li>Five cards each; the top kitty card is turned up. Going round, each may order the dealer to pick it up, or pass.</li>
					<li>If all pass, it's turned down and anyone may name another suit. With <strong>stick the dealer</strong> on, the dealer must.</li>
					<li>The maker may go <strong>alone</strong>; their partner sits out. Canadian loner: the dealer's partner can't order up alone.</li>
					<li><strong>Farmer's hand</strong>: holding three or more nines and tens, you may swap three of them for the three hidden kitty cards before bidding.</li>
				</ul>
			</div>
			<div>
				<p class="sub">Scoring</p>
				<ul>
					<li>Makers take 3 or 4 tricks: 1 point. All five (a march): 2.</li>
					<li>A loner who takes all five: 4.</li>
					<li>Makers held under three are <strong>euchred</strong>: 2 to the defenders.</li>
					<li>Against a loner, a defender may <strong>defend alone</strong>; euchring the loner that way scores 4.</li>
					<li>Score is kept with a six and a four: count the pips showing. Game to 10 by default (5, 11 or 15 in Settings).</li>
				</ul>
			</div>
		</div>
	{/if}

	<p class="sub">Controls</p>
	<dl>
		{#each controls as [key, action] (key + action)}
			<dt><kbd>{key}</kbd></dt>
			<dd>{action}</dd>
		{/each}
	</dl>
</GuideShell>

{#snippet rich(text: string)}
	{#each text.split('**') as part, i (i)}{#if i % 2}<strong>{part}</strong>{:else}{part}{/if}{/each}
{/snippet}

<style>
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 10px;
	}

	.tabs button {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--g-accent, #e0a548) 45%, transparent);
		background: transparent;
		color: inherit;
		border-radius: 999px;
		padding: 5px 12px;
		font: inherit;
		font-size: 0.86rem;
		font-weight: 700;
		cursor: pointer;
	}

	.tabs button.on {
		background: var(--g-accent, #e0a548);
		color: #1c1107;
	}
</style>
