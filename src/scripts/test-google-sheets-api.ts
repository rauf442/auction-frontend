// frontend/src/scripts/test-google-sheets-api.ts
// Simple test script to verify Google Sheets API integration

import { loadBrandGoogleSheetUrl, saveBrandGoogleSheetUrl } from '../lib/google-sheets-api';

async function testGoogleSheetsAPI() {
  console.log('🧪 Testing Google Sheets API integration...\n');

  const testBrands = ['MSABER', 'AURUM', 'METSAB'];

  for (const brand of testBrands) {
    console.log(`\n📋 Testing brand: ${brand}`);
    
    try {
      // Test loading URL
      console.log('  ⬇️ Loading current Google Sheets URL...');
      const currentUrl = await loadBrandGoogleSheetUrl(brand, 'artworks');
      console.log(`  ✅ Current URL: ${currentUrl || 'Not configured'}`);

      // Test saving URL
      console.log('  ⬆️ Testing save functionality...');
      const testUrl = `https://docs.google.com/spreadsheets/d/test-${brand.toLowerCase()}/edit#gid=0`;
      const saveResult = await saveBrandGoogleSheetUrl(brand, testUrl, 'artworks');
      console.log(`  ${saveResult ? '✅' : '❌'} Save result: ${saveResult ? 'Success' : 'Failed'}`);

      if (saveResult) {
        // Verify the save worked
        console.log('  🔍 Verifying save...');
        const verifyUrl = await loadBrandGoogleSheetUrl(brand, 'artworks');
        console.log(`  ${verifyUrl === testUrl ? '✅' : '❌'} Verification: ${verifyUrl === testUrl ? 'Success' : 'Failed'}`);
        console.log(`    Expected: ${testUrl}`);
        console.log(`    Got:      ${verifyUrl}`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎉 Google Sheets API test complete!');
}

// This would be run manually in browser console or as a test
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testGoogleSheetsAPI = testGoogleSheetsAPI;
  console.log('Google Sheets API test function available as window.testGoogleSheetsAPI()');
}

export { testGoogleSheetsAPI };


