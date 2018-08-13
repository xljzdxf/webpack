/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Module")} Module */

const sortByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

const getArray = set => {
	return Array.from(set);
};

class ChunkGraphModule {
	constructor() {
		/** @type {SortableSet<Chunk>} */
		this.chunks = new SortableSet();
	}
}

class ChunkGraph {
	constructor() {
		/** @private @type {WeakMap<Module, ChunkGraphModule>} */
		this._modules = new WeakMap();
	}

	/**
	 * @private
	 * @param {Module} module the module
	 * @returns {ChunkGraphModule} internal module
	 */
	_getChunkGraphModule(module) {
		let m = this._modules.get(module);
		if (m === undefined) {
			m = new ChunkGraphModule();
			this._modules.set(module, m);
		}
		return m;
	}

	/**
	 * @param {Chunk} chunk the new chunk
	 * @param {Module} module the module
	 * @returns {boolean} true, if the chunk could be added. false if it was already added
	 */
	connectChunkAndModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		// TODO refactor to remove return value
		if (cgm.chunks.has(chunk) && chunk._modules.has(module)) return false;
		cgm.chunks.add(chunk);
		chunk._modules.add(module);
		return true;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Module} module the module
	 * @returns {void}
	 */
	disconnectChunkAndModule(chunk, module) {
		const cgm = this._getChunkGraphModule(module);
		chunk._modules.delete(module);
		cgm.chunks.delete(chunk);
	}

	/**
	 * @param {Module} oldModule the replaced module
	 * @param {Module} newModule the replacing module
	 * @returns {void}
	 */
	replaceModule(oldModule, newModule) {
		const oldCgm = this._getChunkGraphModule(oldModule);
		const newCgm = this._getChunkGraphModule(newModule);
		const chunks = this.getModuleChunks(oldModule);
		for (const chunk of chunks) {
			chunk._modules.delete(oldModule);
			chunk._modules.add(newModule);
			oldCgm.chunks.delete(chunk);
			newCgm.chunks.add(chunk);
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
		const cgm = this._getChunkGraphModule(module);
		for (const chunk of cgm.chunks) {
			if (chunk.entryModule === module) return true;
		}
		return false;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getModuleChunksIterable(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks;
	}

	/**
	 * @param {Module} module the module
	 * @param {function(Chunk, Chunk): -1|0|1} sortFn sort function
	 * @returns {Iterable<Chunk>} iterable of chunks (do not modify)
	 */
	getOrderedModuleChunksIterable(module, sortFn) {
		const cgm = this._getChunkGraphModule(module);
		cgm.chunks.sortWith(sortFn);
		return cgm.chunks;
	}

	/**
	 * @param {Module} module the module
	 * @returns {Chunk[]} array of chunks (cached, do not modify)
	 */
	getModuleChunks(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks.getFromCache(getArray);
	}

	/**
	 * @param {Module} module the module
	 * @returns {number} the number of chunk which contain the module
	 */
	getNumberOfModuleChunks(module) {
		const cgm = this._getChunkGraphModule(module);
		return cgm.chunks.size;
	}

	/**
	 * @param {Module} moduleA some module
	 * @param {Module} moduleB some module
	 * @returns {boolean} true, if modules are in the same chunks
	 */
	haveModulesEqualChunks(moduleA, moduleB) {
		const cgmA = this._getChunkGraphModule(moduleA);
		const cgmB = this._getChunkGraphModule(moduleB);
		if (cgmA.chunks.size !== cgmB.chunks.size) return false;
		cgmA.chunks.sortWith(sortByDebugId);
		cgmB.chunks.sortWith(sortByDebugId);
		const a = cgmA.chunks[Symbol.iterator]();
		const b = cgmB.chunks[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			const bItem = b.next();
			if (aItem.done) return true;
			if (aItem.value !== bItem.value) return false;
		}
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {number} the number of module which are contained in this chunk
	 */
	getNumberOfChunkModules(chunk) {
		return chunk._modules.size;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {Iterable<Module>} return the modules for this chunk
	 */
	getChunkModulesIterable(chunk) {
		return chunk._modules;
	}
}

module.exports = ChunkGraph;
