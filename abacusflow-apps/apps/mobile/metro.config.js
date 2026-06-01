const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// monorepo 场景建议保留
config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), workspaceRoot])
);

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Moti / framer-motion 里有 .mjs，保留这个
if (!config.resolver.sourceExts.includes("mjs")) {
  config.resolver.sourceExts.push("mjs");
}

// 关键：强制把 bare import "tslib" 指到 ESM 版本
const tslibEs6Path = require.resolve("tslib/tslib.es6.js", {
  paths: [projectRoot, workspaceRoot],
});

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib") {
    return {
      type: "sourceFile",
      filePath: tslibEs6Path,
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
