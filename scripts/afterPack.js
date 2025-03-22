// This script runs after packaging the app but before creating installers
// It helps reduce the final size by removing unnecessary files
const path = require('path');
const fs = require('fs');
const { rimraf } = require('rimraf');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, 'resources');
  
  console.log('🧹 Running cleanup script to optimize package size...');
  
  try {
    // List of directories and files to remove
    const toRemove = [
      // Development files
      path.join(resourcesDir, 'app', 'node_modules', '**', '*.d.ts'),
      path.join(resourcesDir, 'app', 'node_modules', '**', '*.md'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'LICENSE'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'license'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'docs'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'man'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'example'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'examples'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'test'),
      path.join(resourcesDir, 'app', 'node_modules', '**', 'tests'),
      path.join(resourcesDir, 'app', 'node_modules', '**', '__tests__'),
      
      // Unnecessary source maps
      path.join(resourcesDir, 'app', '**', '*.js.map'),
      path.join(resourcesDir, 'app', '**', '*.css.map'),
    ];
    
    // Remove each item
    for (const item of toRemove) {
      await rimraf(item);
      console.log(`✅ Removed: ${item}`);
    }
    
    console.log('✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}; 