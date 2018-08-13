/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module */

const sortById = (a, b) => {
	return a.id - b.id;
};

const sortByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

const getArray = set => {
	return Array.from(set);
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
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the module
	 * @returns {boolean} true, if the chunk could be added. false if it was already added
	 */
	connectChunkAndModule(chunk, module) {
		// TODO refactor to remove return value
		if (module._chunks.has(chunk) && chunk._modules.has(module)) return false;
		module._chunks.add(chunk);
		chunk._modules.add(module);
		return true;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Module} module the module
	 * @returns {void}
	 */
	disconnectChunkAndModule(chunk, module) {
		chunk._modules.delete(module);
		module._chunks.delete(chunk);
	}

	/**
	 * @param {Module} oldModule the replaced module
	 * @param {Module} newModule the replacing module
	 * @returns {void}
	 */
	replaceModule(oldModule, newModule) {
		const chunks = this.getModuleChunks(oldModule);
		for (const chunk of chunks) {
			chunk._modules.delete(oldModule);
			chunk._modules.add(newModule);
			oldModule._chunks.delete(chunk);
			newModule._chunks.add(chunk);
		}
	}

	/**
	 * @param {Module} module the checked module
	 * @param {Chunk} chunk the checked chunk
	 * @returns {boolean} true, if the chunk contains the module
	 */
	isModuleInChunk(module, chunk) {
		return chunk._modules.has(module);
	}

	/**
	 * @param {Module} module the checked module
	 * @returns {boolean} true, if the module is entry of any chunk
	 */
	isEntryModule(module) {
		for (const chunk of module._chunks) {
			if (chunk.entryModule === module) return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getModuleChunksIterable(module) {
		return module._chunks;
	}

	/**
	 * @param {Module} module the module
	 * @param {function(Chunk, Chunk): -1|0|1} sortFn sort function
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getOrderedModuleChunksIterable(module, sortFn) {
		module._chunks.sortWith(sortFn);
		return module._chunks;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Chunk[]} array of chunks (cached, do not modify)
	 */
	getModuleChunks(module) {
		return module._chunks.getFromCache(getArray);
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the number of chunk which contain the module
	 */
	getNumberOfModuleChunks(module) {
		return module._chunks.size;
	}

	/**
	 * @param {Module} moduleA some module
	 * @param {Module} moduleB some module
	 * @returns {boolean} true, if modules are in the same chunks
	 */
	haveModulesEqualChunks(moduleA, moduleB) {
		if (moduleA._chunks.size !== moduleB._chunks.size) return false;
		moduleA._chunks.sortWith(sortByDebugId);
		moduleB._chunks.sortWith(sortByDebugId);
		const a = moduleA._chunks[Symbol.iterator]();
		const b = moduleB._chunks[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			const bItem = b.next();
			if (aItem.done) return true;
			if (aItem.value !== bItem.value) return false;
		}
	}
}

module.exports = ChunkGraph;
