/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");
const { compareModulesById } = require("./util/comparators");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Module")} Module */

/** @typedef {(m: Module) => boolean} ModuleFilterPredicate */

/**
 * @param {Chunk} a chunk
 * @param {Chunk} b chunk
 * @returns {number} compare result
 */
const sortChunksByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

/**
 * @param {Module} a module
 * @param {Module} b module
 * @returns {number} compare result
 */
const sortModulesByDebugId = (a, b) => {
	return a.debugId - b.debugId;
};

/** @template T @typedef {(set: SortableSet<T>) => T[]} SetToArrayFunction<T> */

/**
 * @template T
 * @param {SortableSet<T>} set the set
 * @returns {T[]} set as array
 */
const getChunksArray = set => {
	return Array.from(set);
};

/** @type {WeakMap<Function, any>} */
const createOrderedArrayFunctionMap = new WeakMap();

/**
 * @template T
 * @param {function(T, T): -1|0|1} comparator comparator function
 * @returns {SetToArrayFunction<T>} set as ordered array
 */
const createOrderedArrayFunction = comparator => {
	/** @type {SetToArrayFunction<T>} */
	let fn = createOrderedArrayFunctionMap.get(comparator);
	if (fn !== undefined) return fn;
	fn = set => {
		set.sortWith(comparator);
		return Array.from(set);
	};
	createOrderedArrayFunctionMap.set(comparator, fn);
	return fn;
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
	 * @param {ChunkGroup} chunkGroup the checked chunk group
	 * @returns {boolean} true, if the chunk contains the module
	 */
	isModuleInChunkGroup(module, chunkGroup) {
		for (const chunk of chunkGroup.chunks) {
			if (this.isModuleInChunk(module, chunk)) return true;
		}
		return false;
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
		return cgm.chunks.getFromCache(getChunksArray);
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
		cgmA.chunks.sortWith(sortChunksByDebugId);
		cgmB.chunks.sortWith(sortChunksByDebugId);
		const a = cgmA.chunks[Symbol.iterator]();
		const b = cgmB.chunks[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			if (aItem.done) return true;
			const bItem = b.next();
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

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {function(Module, Module): -1|0|1} comparator comparator function
	 * @returns {Iterable<Module>} return the modules for this chunk
	 */
	getOrderedChunkModulesIterable(chunk, comparator) {
		chunk._modules.sortWith(comparator);
		return chunk._modules;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {function(Module, Module): -1|0|1} comparator comparator function
	 * @returns {Module[]} return the modules for this chunk (cached, do not modify)
	 */
	getOrderedChunkModules(chunk, comparator) {
		const arrayFunction = createOrderedArrayFunction(comparator);
		return chunk._modules.getFromUnorderedCache(arrayFunction);
	}

	/**
	 * @typedef {Object} ChunkModuleMaps
	 * @property {Record<string|number, (string|number)[]>} id
	 * @property {Record<string|number, string>} hash
	 */

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {ModuleFilterPredicate} filterFn function used to filter modules
	 * @returns {ChunkModuleMaps} module map information
	 */
	getChunkModuleMaps(chunk, filterFn) {
		/** @type {Record<string|number, (string|number)[]>} */
		const chunkModuleIdMap = Object.create(null);
		/** @type {Record<string|number, string>} */
		const chunkModuleHashMap = Object.create(null);

		for (const asyncChunk of chunk.getAllAsyncChunks()) {
			/** @type {(string|number)[]} */
			let array;
			for (const module of this.getOrderedChunkModulesIterable(
				asyncChunk,
				compareModulesById
			)) {
				if (filterFn(module)) {
					if (array === undefined) {
						array = [];
						chunkModuleIdMap[asyncChunk.id] = array;
					}
					array.push(module.id);
					chunkModuleHashMap[module.id] = module.renderedHash;
				}
			}
			if (array !== undefined) {
				array.sort();
			}
		}

		return {
			id: chunkModuleIdMap,
			hash: chunkModuleHashMap
		};
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {function(Module): boolean} filterFn predicate function used to filter modules
	 * @param {(function(Chunk): boolean)=} filterChunkFn predicate function used to filter chunks
	 * @returns {boolean} return true if module exists in graph
	 */
	hasModuleInGraph(chunk, filterFn, filterChunkFn) {
		const queue = new Set(chunk.groupsIterable);
		const chunksProcessed = new Set();

		for (const chunkGroup of queue) {
			for (const innerChunk of chunkGroup.chunks) {
				if (!chunksProcessed.has(innerChunk)) {
					chunksProcessed.add(innerChunk);
					if (!filterChunkFn || filterChunkFn(innerChunk)) {
						for (const module of this.getChunkModulesIterable(innerChunk)) {
							if (filterFn(module)) {
								return true;
							}
						}
					}
				}
			}
			for (const child of chunkGroup.childrenIterable) {
				queue.add(child);
			}
		}
		return false;
	}

	/**
	 * @param {Chunk} chunkA first chunk
	 * @param {Chunk} chunkB second chunk
	 * @returns {-1|0|1} this is a comparitor function like sort and returns -1, 0, or 1 based on sort order
	 */
	compareChunks(chunkA, chunkB) {
		if (chunkA._modules.size > chunkB._modules.size) return -1;
		if (chunkA._modules.size < chunkB._modules.size) return 1;
		chunkA._modules.sortWith(sortModulesByDebugId);
		chunkB._modules.sortWith(sortModulesByDebugId);
		const a = chunkA._modules[Symbol.iterator]();
		const b = chunkB._modules[Symbol.iterator]();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const aItem = a.next();
			if (aItem.done) return 0;
			const bItem = b.next();
			const aModuleIdentifier = aItem.value.identifier();
			const bModuleIdentifier = bItem.value.identifier();
			if (aModuleIdentifier < bModuleIdentifier) return -1;
			if (aModuleIdentifier > bModuleIdentifier) return 1;
		}
	}
}

module.exports = ChunkGraph;
