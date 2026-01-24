const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js core modules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('expo-crypto'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
};

// Resolve the util types issue
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle the problematic util/support/types import
  if (moduleName === './support/types' || moduleName === 'util/support/types') {
    return {
      filePath: require.resolve('util/support/types.js'),
      type: 'sourceFile',
    };
  }
  
  // Default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;