// Metro config for the SaanPaw npm-workspaces monorepo.
// Dependencies hoist to the repo root, so Metro has to watch the root and
// resolve modules from both the workspace and the root node_modules.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Append rather than replace: getDefaultConfig() already sets watchFolders that
// Expo relies on, and overwriting them outright drops those defaults.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Hierarchical lookup stays ON: npm hoists most packages to the repo root but
// leaves nested copies behind for version conflicts, and Metro needs to walk up
// from a package's own directory to find its transitive dependencies.

module.exports = config;
