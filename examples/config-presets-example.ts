/**
 * Configuration presets example
 */

import { createConfig, CONFIG_PRESETS, scanBytes } from 'pompelmi';

async function configExample() {
  console.log('⚙️  Configuration Presets Example\n');

  // Show all available presets
  console.log('Available presets:', Object.keys(CONFIG_PRESETS).join(', '));
  console.log();

  // Example 1: Fast preset (minimal features, maximum speed)
  console.log('1️⃣  Fast Preset:');
  const fastConfig = createConfig();
  fastConfig.loadPreset('fast');
  console.log('   - Cache enabled:', fastConfig.get('performance')?.enableCache);
  console.log('   - Max concurrency:', fastConfig.get('performance')?.maxConcurrency);
  console.log('   - Polyglot detection:', fastConfig.get('advanced')?.enablePolyglotDetection);
  console.log();

  // Example 2: Production preset (balanced)
  console.log('2️⃣  Production Preset:');
  const prodConfig = createConfig();
  prodConfig.loadPreset('production');
  console.log('   - Cache enabled:', prodConfig.get('performance')?.enableCache);
  console.log('   - Threat intel:', prodConfig.get('security')?.enableThreatIntel);
  console.log('   - Max file size:', prodConfig.get('security')?.maxFileSize);
  console.log();

  // Example 3: Thorough preset (all features)
  console.log('3️⃣  Thorough Preset:');
  const thoroughConfig = createConfig();
  thoroughConfig.loadPreset('thorough');
  console.log('   - Verbose logging:', thoroughConfig.get('logging')?.verbose);
  console.log('   - Strict mode:', thoroughConfig.get('security')?.strictMode);
  console.log('   - Max archive depth:', thoroughConfig.get('advanced')?.maxArchiveDepth);
  console.log();

  // Example 4: Custom configuration
  console.log('4️⃣  Custom Configuration:');
  const customConfig = createConfig({
    defaultPreset: 'advanced',
    performance: {
      enableCache: true,
      maxConcurrency: 10
    },
    security: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      strictMode: false
    },
    callbacks: {
      onScanComplete: (report) => {
        console.log(`   📄 Scanned: ${report.file?.name} - ${report.verdict}`);
      }
    }
  });

  // Validate custom config
  const validation = customConfig.validate();
  console.log('   Config valid:', validation.valid);
  if (!validation.valid) {
    console.log('   Errors:', validation.errors);
  }
  console.log();

  // Example 5: Export and import config
  console.log('5️⃣  Export/Import Configuration:');
  const json = customConfig.toJSON();
  console.log('   Exported config length:', json.length, 'bytes');
  
  const newConfig = createConfig();
  newConfig.fromJSON(json);
  console.log('   Imported successfully!');
  console.log();

  console.log('✅ Configuration examples completed!');
}

configExample().catch(console.error);
