import type { TableId } from '../types';
import type { AnySpec } from './spec';
import { carnival } from './carnival';
import { woodrail } from './woodrail';
import { space } from './space';
import { pirate } from './pirate';
import { deepsea } from './deepsea';
import { dragon } from './dragon';
import { western } from './western';

export const TABLES: Record<TableId, AnySpec> = {
	carnival,
	woodrail,
	space,
	pirate,
	deepsea,
	dragon,
	western
};

export const tableOf = (id: TableId): AnySpec => TABLES[id] ?? carnival;
