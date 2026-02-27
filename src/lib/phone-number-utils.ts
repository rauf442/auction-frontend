// frontend/src/lib/phone-number-utils.ts
export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  region: string;
  callingCode: string;
  priority?: number; // For handling conflicts (higher number = higher priority)
  isDefault?: boolean; // Mark as default for shared calling codes
}

export class PhoneNumberUtils {
  private static readonly COUNTRY_MAPPINGS: CountryInfo[] = [
    // North America
    { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America', callingCode: '1', priority: 2, isDefault: true },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America', callingCode: '1', priority: 1 },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'North America', callingCode: '52' },

    // Europe
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', callingCode: '44' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe', callingCode: '49' },
    { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe', callingCode: '33' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe', callingCode: '39' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe', callingCode: '34' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe', callingCode: '31' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe', callingCode: '32' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe', callingCode: '41' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe', callingCode: '46' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe', callingCode: '47' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe', callingCode: '45' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe', callingCode: '358' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe', callingCode: '353' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe', callingCode: '351' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe', callingCode: '30' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe', callingCode: '48' },
    { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe', callingCode: '420' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe', callingCode: '36' },
    { code: 'RO', name: 'Romania', flag: '🇷🇴', region: 'Europe', callingCode: '40' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe', callingCode: '359' },
    { code: 'HR', name: 'Croatia', flag: '🇭🇷', region: 'Europe', callingCode: '385' },
    { code: 'SI', name: 'Slovenia', flag: '🇸🇮', region: 'Europe', callingCode: '386' },
    { code: 'SK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe', callingCode: '421' },
    { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'Europe', callingCode: '372' },
    { code: 'LV', name: 'Latvia', flag: '🇱🇻', region: 'Europe', callingCode: '371' },
    { code: 'LT', name: 'Lithuania', flag: '🇱🇹', region: 'Europe', callingCode: '370' },
    { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe', callingCode: '352' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹', region: 'Europe', callingCode: '356' },
    { code: 'CY', name: 'Cyprus', flag: '🇨🇾', region: 'Europe', callingCode: '357' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe', callingCode: '43' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe', callingCode: '7', priority: 2, isDefault: true },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Europe', callingCode: '380' },
    { code: 'BY', name: 'Belarus', flag: '🇧🇾', region: 'Europe', callingCode: '375' },
    { code: 'MD', name: 'Moldova', flag: '🇲🇩', region: 'Europe', callingCode: '373' },
    { code: 'AL', name: 'Albania', flag: '🇦🇱', region: 'Europe', callingCode: '355' },
    { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', region: 'Europe', callingCode: '389' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸', region: 'Europe', callingCode: '381' },
    { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', region: 'Europe', callingCode: '387' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪', region: 'Europe', callingCode: '382' },
    { code: 'XK', name: 'Kosovo', flag: '🇽🇰', region: 'Europe', callingCode: '383' },
    { code: 'IS', name: 'Iceland', flag: '🇮🇸', region: 'Europe', callingCode: '354' },
    { code: 'GL', name: 'Greenland', flag: '🇬🇱', region: 'Europe', callingCode: '299' },
    { code: 'FO', name: 'Faroe Islands', flag: '🇫🇴', region: 'Europe', callingCode: '298' },
    { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', region: 'Europe', callingCode: '350' },
    { code: 'MC', name: 'Monaco', flag: '🇲🇨', region: 'Europe', callingCode: '377' },
    { code: 'SM', name: 'San Marino', flag: '🇸🇲', region: 'Europe', callingCode: '378' },
    { code: 'VA', name: 'Vatican City', flag: '🇻🇦', region: 'Europe', callingCode: '379' },
    { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', region: 'Europe', callingCode: '423' },
    { code: 'AD', name: 'Andorra', flag: '🇦🇩', region: 'Europe', callingCode: '376' },

    // Asia
    { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia', callingCode: '91' },
    { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia', callingCode: '86' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia', callingCode: '81' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia', callingCode: '82' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia', callingCode: '65' },
    { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia', callingCode: '852' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'Asia', callingCode: '886' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia', callingCode: '66' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia', callingCode: '60' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia', callingCode: '62' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia', callingCode: '63' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia', callingCode: '84' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Asia', callingCode: '90' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Asia', callingCode: '972' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Asia', callingCode: '971' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Asia', callingCode: '966' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', region: 'Asia', callingCode: '974' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', region: 'Asia', callingCode: '965' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', region: 'Asia', callingCode: '973' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', region: 'Asia', callingCode: '968' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴', region: 'Asia', callingCode: '962' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧', region: 'Asia', callingCode: '961' },
    { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia', callingCode: '7', priority: 1 },
    { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia', callingCode: '998' },
    { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', region: 'Asia', callingCode: '994' },
    { code: 'GE', name: 'Georgia', flag: '🇬🇪', region: 'Asia', callingCode: '995' },
    { code: 'AM', name: 'Armenia', flag: '🇦🇲', region: 'Asia', callingCode: '374' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia', callingCode: '92' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia', callingCode: '880' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', region: 'Asia', callingCode: '94' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵', region: 'Asia', callingCode: '977' },
    { code: 'MM', name: 'Myanmar', flag: '🇲🇲', region: 'Asia', callingCode: '95' },
    { code: 'KH', name: 'Cambodia', flag: '🇰🇭', region: 'Asia', callingCode: '855' },
    { code: 'LA', name: 'Laos', flag: '🇱🇦', region: 'Asia', callingCode: '856' },
    { code: 'MN', name: 'Mongolia', flag: '🇲🇳', region: 'Asia', callingCode: '976' },

    // Oceania
    { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania', callingCode: '61' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania', callingCode: '64' },

    // South America
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'South America', callingCode: '55' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'South America', callingCode: '54' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'South America', callingCode: '56' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'South America', callingCode: '57' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪', region: 'South America', callingCode: '51' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪', region: 'South America', callingCode: '58' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨', region: 'South America', callingCode: '593' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴', region: 'South America', callingCode: '591' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾', region: 'South America', callingCode: '595' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾', region: 'South America', callingCode: '598' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾', region: 'South America', callingCode: '592' },
    { code: 'SR', name: 'Suriname', flag: '🇸🇷', region: 'South America', callingCode: '597' },

    // Africa
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa', callingCode: '27' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa', callingCode: '20' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa', callingCode: '234' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa', callingCode: '254' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa', callingCode: '233' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'Africa', callingCode: '212' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa', callingCode: '216' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa', callingCode: '251' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa', callingCode: '255' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'Africa', callingCode: '256' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', region: 'Africa', callingCode: '250' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲', region: 'Africa', callingCode: '260' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', region: 'Africa', callingCode: '263' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', region: 'Africa', callingCode: '258' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', region: 'Africa', callingCode: '261' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺', region: 'Africa', callingCode: '230' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', region: 'Africa', callingCode: '248' },
    { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', region: 'Africa', callingCode: '225' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳', region: 'Africa', callingCode: '221' },
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲', region: 'Africa', callingCode: '237' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯', region: 'Africa', callingCode: '229' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', region: 'Africa', callingCode: '228' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', region: 'Africa', callingCode: '226' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', region: 'Africa', callingCode: '227' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', region: 'Africa', callingCode: '223' },
    { code: 'GN', name: 'Guinea', flag: '🇬🇳', region: 'Africa', callingCode: '224' },
    { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', region: 'Africa', callingCode: '245' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', region: 'Africa', callingCode: '232' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', region: 'Africa', callingCode: '231' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', region: 'Africa', callingCode: '244' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦', region: 'Africa', callingCode: '264' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', region: 'Africa', callingCode: '267' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', region: 'Africa', callingCode: '268' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', region: 'Africa', callingCode: '266' },
    { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', region: 'Africa', callingCode: '240' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', region: 'Africa', callingCode: '241' },
    { code: 'CG', name: 'Republic of Congo', flag: '🇨🇬', region: 'Africa', callingCode: '242' },
    { code: 'CD', name: 'Democratic Republic of Congo', flag: '🇨🇩', region: 'Africa', callingCode: '243' },
    { code: 'TD', name: 'Chad', flag: '🇹🇩', region: 'Africa', callingCode: '235' },
    { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', region: 'Africa', callingCode: '236' },
    { code: 'SS', name: 'South Sudan', flag: '🇸🇸', region: 'Africa', callingCode: '211' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩', region: 'Africa', callingCode: '249' },
    { code: 'ER', name: 'Eritrea', flag: '🇪🇷', region: 'Africa', callingCode: '291' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', region: 'Africa', callingCode: '253' },
    { code: 'SO', name: 'Somalia', flag: '🇸🇴', region: 'Africa', callingCode: '252' },
    { code: 'KM', name: 'Comoros', flag: '🇰🇲', region: 'Africa', callingCode: '269' },
    { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', region: 'Africa', callingCode: '238' },

    // Caribbean
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲', region: 'Caribbean', callingCode: '1876' },
    { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', region: 'Caribbean', callingCode: '1868' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧', region: 'Caribbean', callingCode: '1246' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸', region: 'Caribbean', callingCode: '1242' },
    { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾', region: 'Caribbean', callingCode: '1345' },
    { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', region: 'Caribbean', callingCode: '1649' },
    { code: 'VG', name: 'British Virgin Islands', flag: '🇻🇬', region: 'Caribbean', callingCode: '1284' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲', region: 'Caribbean', callingCode: '1767' },
    { code: 'GD', name: 'Grenada', flag: '🇬🇩', region: 'Caribbean', callingCode: '1473' },
    { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', region: 'Caribbean', callingCode: '1268' },
    { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', region: 'Caribbean', callingCode: '1869' },
    { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', region: 'Caribbean', callingCode: '1758' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', region: 'Caribbean', callingCode: '1784' },
    { code: 'AI', name: 'Anguilla', flag: '🇦🇮', region: 'Caribbean', callingCode: '1264' },
    { code: 'MS', name: 'Montserrat', flag: '🇲🇸', region: 'Caribbean', callingCode: '1664' },
    { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', region: 'Caribbean', callingCode: '590' },
    { code: 'MQ', name: 'Martinique', flag: '🇲🇶', region: 'Caribbean', callingCode: '596' },
    { code: 'BL', name: 'Saint Barthélemy', flag: '🇧🇱', region: 'Caribbean', callingCode: '590' },
    { code: 'MF', name: 'Saint Martin', flag: '🇲🇫', region: 'Caribbean', callingCode: '590' },
    { code: 'CW', name: 'Curaçao', flag: '🇨🇼', region: 'Caribbean', callingCode: '599' },
    { code: 'AW', name: 'Aruba', flag: '🇦🇼', region: 'Caribbean', callingCode: '297' },
    { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba', flag: '🇧🇶', region: 'Caribbean', callingCode: '599' },
    { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽', region: 'Caribbean', callingCode: '1721' },
    { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', region: 'Caribbean', callingCode: '1787' },
    { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', region: 'Caribbean', callingCode: '1809' },
    { code: 'HT', name: 'Haiti', flag: '🇭🇹', region: 'Caribbean', callingCode: '509' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺', region: 'Caribbean', callingCode: '53' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳', region: 'Caribbean', callingCode: '504' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', region: 'Caribbean', callingCode: '505' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', region: 'Caribbean', callingCode: '506' },
    { code: 'PA', name: 'Panama', flag: '🇵🇦', region: 'Caribbean', callingCode: '507' },
    { code: 'BZ', name: 'Belize', flag: '🇧🇿', region: 'Caribbean', callingCode: '501' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹', region: 'Caribbean', callingCode: '502' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻', region: 'Caribbean', callingCode: '503' }
  ];

  // Create lookup maps for faster access
  private static readonly CALLING_CODE_MAP = new Map<string, CountryInfo[]>();
  private static readonly COUNTRY_CODE_MAP = new Map<string, CountryInfo>();

  // Initialize the maps
  private static initializeMaps(): void {
    if (PhoneNumberUtils.CALLING_CODE_MAP.size > 0) return;

    for (const country of PhoneNumberUtils.COUNTRY_MAPPINGS) {
      // Handle multiple countries with same calling code
      const existingCountries = PhoneNumberUtils.CALLING_CODE_MAP.get(country.callingCode) || [];
      existingCountries.push(country);
      PhoneNumberUtils.CALLING_CODE_MAP.set(country.callingCode, existingCountries);

      // Country code map (unique)
      PhoneNumberUtils.COUNTRY_CODE_MAP.set(country.code.toLowerCase(), country);
    }
  }

  /**
   * Get the best matching country for a calling code based on priority
   * @param callingCode - The calling code to search for
   * @returns The highest priority country for the calling code
   */
  private static getBestCountryForCallingCode(callingCode: string): CountryInfo | null {
    const countries = PhoneNumberUtils.CALLING_CODE_MAP.get(callingCode);
    if (!countries || countries.length === 0) return null;

    if (countries.length === 1) return countries[0];

    // Sort by priority (highest first), then by isDefault flag
    return countries.sort((a, b) => {
      // First sort by priority (higher number = higher priority)
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by isDefault flag
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;

      return 0;
    })[0];
  }

  /**
   * Get country flag emoji from phone number
   * @param phoneNumber - The phone number to analyze
   * @returns Country flag emoji or default globe emoji
   */
  public static getCountryFlag(phoneNumber: string | undefined): string {
    if (!phoneNumber) return '🌍';

    PhoneNumberUtils.initializeMaps();

    // Remove + prefix and any non-numeric characters except spaces and hyphens
    const cleanNumber = phoneNumber.replace(/^\+/, '').replace(/[^\d]/g, '');

    if (!cleanNumber) return '🌍';

    // Sort calling codes by length (longest first) to match the most specific code
    const sortedCodes = Array.from(PhoneNumberUtils.CALLING_CODE_MAP.keys())
      .sort((a, b) => b.length - a.length);

    for (const code of sortedCodes) {
      if (cleanNumber.startsWith(code)) {
        const country = PhoneNumberUtils.getBestCountryForCallingCode(code);
        if (country) {
          return country.flag;
        }
      }
    }

    return '🌍';
  }

  /**
   * Get country code (e.g., 'US', 'IN', 'PK') from phone number
   * @param phoneNumber - The phone number to analyze
   * @returns Country code or empty string if not found
   */
  public static getCountryCode(phoneNumber: string | undefined): string {
    if (!phoneNumber) return '';

    PhoneNumberUtils.initializeMaps();

    // Remove + prefix and any non-numeric characters except spaces and hyphens
    const cleanNumber = phoneNumber.replace(/^\+/, '').replace(/[^\d]/g, '');

    if (!cleanNumber) return '';

    // Sort calling codes by length (longest first) to match the most specific code
    const sortedCodes = Array.from(PhoneNumberUtils.CALLING_CODE_MAP.keys())
      .sort((a, b) => b.length - a.length);

    for (const code of sortedCodes) {
      if (cleanNumber.startsWith(code)) {
        const country = PhoneNumberUtils.getBestCountryForCallingCode(code);
        if (country) {
          return country.code;
        }
      }
    }

    // Default to US for numbers without country code
    if (cleanNumber.length === 10) {
      return 'US';
    }

    return 'UNK';
  }

  /**
   * Get country information from phone number
   * @param phoneNumber - The phone number to analyze
   * @returns CountryInfo object or null if not found
   */
  public static getCountryInfo(phoneNumber: string | undefined): CountryInfo | null {
    if (!phoneNumber) return null;

    PhoneNumberUtils.initializeMaps();

    const cleanNumber = phoneNumber.replace(/^\+/, '').replace(/[^\d]/g, '');

    if (!cleanNumber) return null;

    const sortedCodes = Array.from(PhoneNumberUtils.CALLING_CODE_MAP.keys())
      .sort((a, b) => b.length - a.length);

    for (const code of sortedCodes) {
      if (cleanNumber.startsWith(code)) {
        return PhoneNumberUtils.getBestCountryForCallingCode(code);
      }
    }

    return null;
  }

  /**
   * Get country information by country code
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns CountryInfo object or null if not found
   */
  public static getCountryByCode(countryCode: string): CountryInfo | null {
    PhoneNumberUtils.initializeMaps();
    return PhoneNumberUtils.COUNTRY_CODE_MAP.get(countryCode.toLowerCase()) || null;
  }

  /**
   * Get all countries in a specific region
   * @param region - Region name (Europe, Asia, Africa, etc.)
   * @returns Array of CountryInfo objects
   */
  public static getCountriesByRegion(region: string): CountryInfo[] {
    return PhoneNumberUtils.COUNTRY_MAPPINGS.filter(
      country => country.region.toLowerCase() === region.toLowerCase()
    );
  }

  /**
   * Get all available regions
   * @returns Array of unique region names
   */
  public static getRegions(): string[] {
    const regions = new Set(PhoneNumberUtils.COUNTRY_MAPPINGS.map(country => country.region));
    return Array.from(regions).sort();
  }

  /**
   * Format phone number with country code and proper formatting
   * @param phoneNumber - Raw phone number
   * @returns Formatted phone number with + prefix
   */
  public static formatPhoneNumber(phoneNumber: string | undefined): string {
    if (!phoneNumber) return '';

    // If already has + prefix, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    // Add + prefix
    return `+${phoneNumber}`;
  }

  /**
   * Validate if a phone number has a valid country code
   * @param phoneNumber - Phone number to validate
   * @returns Boolean indicating if the number has a valid country code
   */
  public static isValidCountryCode(phoneNumber: string | undefined): boolean {
    return PhoneNumberUtils.getCountryInfo(phoneNumber) !== null;
  }

  /**
   * Get all countries that share a calling code
   * @param callingCode - The calling code to search for
   * @returns Array of all countries with the specified calling code
   */
  public static getCountriesByCallingCode(callingCode: string): CountryInfo[] {
    PhoneNumberUtils.initializeMaps();
    return PhoneNumberUtils.CALLING_CODE_MAP.get(callingCode) || [];
  }

  /**
   * Get all supported countries
   * @returns Array of all CountryInfo objects
   */
  public static getAllCountries(): CountryInfo[] {
    return [...PhoneNumberUtils.COUNTRY_MAPPINGS];
  }
}
