/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");

/** @typedef {import("./Module")} Module */
/** @typedef {import("./Chunk")} Chunk */

const sortById = (a, b) => {
	return a.id - b.id;
};

class ChunkGraph {
	/**
	 * TODO change to replaceModule
	 * @param {Module} module the module
	 * @param {Iterable<Chunk>} chunks the new chunks
	 * @returns {void}
	 */
	setModuleChunks(module, chunks) {
		module._chunks = new SortableSet(chunks, sortById);
	}

	/**
	 * @param {Module} module the module
	 * @param {Chunk} chunk the new chunk
	 * @returns {boolean} true, if the chunk could be added. false if it was already added
	 */
	connectChunkAndModule(chunk, module) {
		if (module._chunks.has(chunk) && chunk._modules.has(module)) return false;
		module._chunks.add(chunk);
		chunk._modules.add(module);
		return true;
	}

	/**
	 * @param {Module} oldModule the replaced module
	 * @param {Module} newModule the replacing module
	 * @returns {void}
	 */
	replaceModule(oldModule, newModule) {
		const chunks = oldModule.getChunks();
		for (const chunk of chunks) {
			chunk._modules.delete(oldModule);
			chunk._modules.add(newModule);
			oldModule._chunks.delete(chunk);
			newModule._chunks.add(chunk);
		}
	}
}

module.exports = ChunkGraph;
