const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent metro from trying to parse xlsx internal binary files
config.resolver.assetExts = [...config.resolver.assetExts, 'xlsx', 'xls'];

// Suppress xlsx zip warnings by excluding its test fixtures
config.resolver.blockList = [
  /node_modules\/xlsx\/test\/.*/,
  /node_modules\/xlsx\/dist\/xlsx\.extendscript\.js/,
];

module.exports = config;
