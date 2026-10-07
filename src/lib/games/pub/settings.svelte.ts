import { readRecord, readView, writeRecord, writeView, type PubView, type VariantRecord } from './persist';
import { VARIANTS, type Variant } from './types';

export const pubView = $state<PubView>(readView());
export const pubRecords = $state<Record<Variant, VariantRecord>>(
	Object.fromEntries(VARIANTS.map((v) => [v, readRecord(v)])) as Record<Variant, VariantRecord>
);

export const pubPanels = $state({ panel: { open: false }, guide: { open: false } });

export function hydratePub() {
	Object.assign(pubView, readView());
	for (const v of VARIANTS) pubRecords[v] = readRecord(v);
}

export function persistPubView() {
	writeView({ ...pubView });
}

export function persistRecord(variant: Variant) {
	writeRecord(variant, $state.snapshot(pubRecords[variant]) as VariantRecord);
}

export const pubPanelControls = {
	panel: pubPanels.panel,
	guide: pubPanels.guide,
	openSettings() {
		pubPanels.guide.open = false;
		pubPanels.panel.open = true;
	},
	closeSettings() {
		pubPanels.panel.open = false;
	},
	openGuide() {
		pubPanels.panel.open = false;
		pubPanels.guide.open = true;
	},
	closeGuide() {
		pubPanels.guide.open = false;
	}
};
