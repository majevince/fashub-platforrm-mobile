const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Standard Expo monorepo setup: Metro only watches the app dir by default,
// but our design-tokens/types/api-client packages live outside it.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Deliberately left at the default (false): npm workspaces sometimes nest a
// package's own dependencies inside its node_modules (e.g. expo-router's
// private copy of @expo/ui, from a peer conflict) rather than hoisting them.
// Disabling hierarchical lookup breaks resolution of exactly those nested
// copies, which is what caused the Android bundling failure.

module.exports = config;
