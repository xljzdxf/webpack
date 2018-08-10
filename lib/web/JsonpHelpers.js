/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {(string|number)[]} EntryItem */

/**
 * @param {Chunk} chunk the chunk
 * @returns {EntryItem[]} serialized entry info:
 * inner arrays have this format [module id, ...chunk ids]
 */
exports.getEntryInfo = chunk => {
	return Array.from(chunk.entryModulesWithChunkGroupIterable).map(
		([module, chunkGroup]) =>
			[module.id].concat(
				chunkGroup.chunks.filter(c => c !== chunk).map(c => c.id)
			)
	);
};
