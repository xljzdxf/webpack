/* globals describe, it, beforeEach */
"use strict";

const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(() => {
		ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test");
	});

	it("should have debugId more than 999", () => {
		expect(ChunkInstance.debugId).toBeGreaterThan(999);
	});

	it("returns a string with modules information", () => {
		expect(ChunkInstance.toString()).toBe("Chunk[]");
	});

	it("should not be the initial instance", () => {
		expect(ChunkInstance.canBeInitial()).toBe(false);
	});

	describe("hasRuntime", () => {
		it("returns false", () => {
			expect(ChunkInstance.hasRuntime()).toBe(false);
		});
	});

	describe("isEmpty", () => {
		it("should NOT have any module by default", () => {
			expect(ChunkInstance.isEmpty()).toBe(true);
		});
	});

	describe("size", () => {
		it("should NOT have any module by default", () => {
			expect(
				ChunkInstance.size({
					chunkOverhead: 10,
					entryChunkMultiplicator: 2
				})
			).toBe(10);
		});
	});
});
