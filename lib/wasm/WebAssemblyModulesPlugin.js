/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Generator = require("../Generator");
const JavascriptModulesPlugin = require("../JavascriptModulesPlugin");
const WebAssemblyExportImportedDependency = require("../dependencies/WebAssemblyExportImportedDependency");
const WebAssemblyImportDependency = require("../dependencies/WebAssemblyImportDependency");
const WebAssemblyGenerator = require("./WebAssemblyGenerator");
const WebAssemblyInInitialChunkError = require("./WebAssemblyInInitialChunkError");
const WebAssemblyJavascriptGenerator = require("./WebAssemblyJavascriptGenerator");
const WebAssemblyParser = require("./WebAssemblyParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleTemplate")} ModuleTemplate */
/** @typedef {import("../ModuleTemplate").RenderContext} RenderContext */

class WebAssemblyModulesPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"WebAssemblyModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					WebAssemblyImportDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					WebAssemblyExportImportedDependency,
					normalModuleFactory
				);

				const hooks = JavascriptModulesPlugin.getHooks(compilation);
				hooks.shouldRender.tap("WebAssemblyModulesPlugin", module => {
					if (module.type === "webassembly/experimental") return true;
				});

				normalModuleFactory.hooks.createParser
					.for("webassembly/experimental")
					.tap("WebAssemblyModulesPlugin", () => {
						return new WebAssemblyParser();
					});

				normalModuleFactory.hooks.createGenerator
					.for("webassembly/experimental")
					.tap("WebAssemblyModulesPlugin", () => {
						return Generator.byType({
							javascript: new WebAssemblyJavascriptGenerator(),
							webassembly: new WebAssemblyGenerator(this.options)
						});
					});

				compilation.chunkTemplate.hooks.renderManifest.tap(
					"WebAssemblyModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						for (const module of chunk.modulesIterable) {
							if (module.type && module.type.startsWith("webassembly")) {
								const filenameTemplate =
									outputOptions.webassemblyModuleFilename;

								result.push({
									render: () =>
										this.renderWebAssembly(
											module,
											moduleTemplates.webassembly,
											{
												chunk,
												dependencyTemplates,
												runtimeTemplate: compilation.runtimeTemplate,
												moduleGraph: compilation.moduleGraph,
												chunkGraph: compilation.chunkGraph
											}
										),
									filenameTemplate,
									pathOptions: {
										module
									},
									identifier: `webassemblyModule${module.id}`,
									hash: module.hash
								});
							}
						}

						return result;
					}
				);

				compilation.hooks.afterChunks.tap("WebAssemblyModulesPlugin", () => {
					const initialWasmModules = new Set();
					for (const chunk of compilation.chunks) {
						if (chunk.canBeInitial()) {
							for (const module of chunk.modulesIterable) {
								if (module.type.startsWith("webassembly")) {
									initialWasmModules.add(module);
								}
							}
						}
					}
					for (const module of initialWasmModules) {
						compilation.errors.push(
							new WebAssemblyInInitialChunkError(
								module,
								compilation.moduleGraph,
								compilation.chunkGraph,
								compilation.requestShortener
							)
						);
					}
				});
			}
		);
	}

	/**
	 *
	 * @param {Module} module the wasm module
	 * @param {ModuleTemplate} moduleTemplate the module tempalte
	 * @param {RenderContext} renderContext render context
	 * @returns {Source} rendered source
	 */
	renderWebAssembly(module, moduleTemplate, renderContext) {
		return moduleTemplate.render(module, renderContext);
	}
}

module.exports = WebAssemblyModulesPlugin;
