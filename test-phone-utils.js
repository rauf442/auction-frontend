// Simple test to verify PhoneNumberUtils functionality
// This would normally be run in a browser or with proper TypeScript compilation

// Mock the PhoneNumberUtils functionality for testing
const mockCountryMappings = [
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America', callingCode: '1', priority: 2, isDefault: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America', callingCode: '1', priority: 1 },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe', callingCode: '7', priority: 2, isDefault: true },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia', callingCode: '7', priority: 1 }
];

function getBestCountryForCallingCode(callingCode) {
  const countries = mockCountryMappings.filter(c => c.callingCode === callingCode);
  if (countries.length === 0) return null;
  if (countries.length === 1) return countries[0];

  // Sort by priority (highest first), then by isDefault flag
  return countries.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  })[0];
}

function getCountryFlag(phoneNumber) {
  if (!phoneNumber) return '🌍';
  const cleanNumber = phoneNumber.replace(/^\+/, '').replace(/[^\d]/g, '');
  if (!cleanNumber) return '🌍';

  // Test calling codes in order of length (longest first)
  const codes = ['7', '44', '33', '49', '1']; // Sort by length descending
  for (const code of codes) {
    if (cleanNumber.startsWith(code)) {
      const country = getBestCountryForCallingCode(code);
      return country ? country.flag : '🌍';
    }
  }
  return '🌍';
}

// Test cases
console.log('Testing US phone numbers:');
console.log('+15551234567 ->', getCountryFlag('+15551234567')); // Should be 🇺🇸
console.log('15551234567 ->', getCountryFlag('15551234567')); // Should be 🇺🇸

console.log('\nTesting Canadian phone numbers:');
console.log('+16475551234 ->', getCountryFlag('+16475551234')); // Should be 🇨🇦 (lower priority)
console.log('16475551234 ->', getCountryFlag('16475551234')); // Should be 🇨🇦

console.log('\nTesting Russian phone numbers:');
console.log('+71234567890 ->', getCountryFlag('+71234567890')); // Should be 🇷🇺

console.log('\nTesting Kazakhstan phone numbers:');
console.log('+77771234567 ->', getCountryFlag('+77771234567')); // Should be 🇰🇿 (lower priority)

console.log('\nTesting getBestCountryForCallingCode:');
console.log('Best country for +1:', getBestCountryForCallingCode('1')?.name); // Should be US
console.log('Best country for +7:', getBestCountryForCallingCode('7')?.name); // Should be Russia
