/**
 * White-Label Branding Service
 * Per-advisor or per-firm custom branding for proposals
 */

import { randomUUID } from 'crypto';

export interface BrandConfig {
  brandId: string;
  firmId: string;
  advisorId?: string; // if set, this is advisor-specific branding
  firmName: string;
  logoUrl?: string;
  primaryColor: string; // hex color
  accentColor: string; // hex color
  fontFamily?: string;
  tagline?: string;
  disclaimerText?: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  socialLinks?: Record<string, string>; // { linkedin: 'url', twitter: 'url' }
  customCSS?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BRAND: BrandConfig = {
  brandId: 'default-farther',
  firmId: 'farther',
  firmName: 'Farther',
  primaryColor: '#1B3A4B', // Farther navy
  accentColor: '#D4A574', // Farther gold
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  tagline: 'Technology-Powered Wealth Management',
  disclaimerText:
    'Investment advisory services offered through Farther Finance Advisors, LLC, an SEC-registered investment adviser.',
  contactInfo: {
    email: 'contact@farther.com',
    website: 'https://farther.com',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// In-memory brand config store
const brandStore = new Map<string, BrandConfig>();
const firmBrandIndex = new Map<string, string>(); // firmId -> brandId
const advisorBrandIndex = new Map<string, string>(); // advisorId -> brandId

// Initialize with default
brandStore.set(DEFAULT_BRAND.brandId, DEFAULT_BRAND);

/**
 * Set or update brand configuration for a firm or advisor
 * @param config - Partial brand config with firmId required
 * @returns Complete brand config
 */
export function setBrandConfig(
  config: Partial<BrandConfig> & { firmId: string }
): BrandConfig {
  if (!config.firmId?.trim()) {
    throw new Error('firmId required');
  }

  // Validate colors if provided
  if (config.primaryColor && !isValidHexColor(config.primaryColor)) {
    throw new Error('primaryColor must be valid hex color (e.g., #1B3A4B)');
  }
  if (config.accentColor && !isValidHexColor(config.accentColor)) {
    throw new Error('accentColor must be valid hex color (e.g., #D4A574)');
  }

  // Validate URLs if provided
  if (config.logoUrl && !isValidUrl(config.logoUrl)) {
    throw new Error('logoUrl must be valid URL');
  }
  if (config.contactInfo?.website && !isValidUrl(config.contactInfo.website)) {
    throw new Error('contactInfo.website must be valid URL');
  }

  // Check if brand exists for this firm/advisor
  let existingBrandId: string | undefined;

  if (config.advisorId) {
    existingBrandId = advisorBrandIndex.get(config.advisorId);
  } else {
    existingBrandId = firmBrandIndex.get(config.firmId);
  }

  const existing = existingBrandId
    ? brandStore.get(existingBrandId)
    : undefined;

  const now = new Date().toISOString();

  const brandConfig: BrandConfig = {
    brandId: existing?.brandId ?? randomUUID(),
    firmId: config.firmId,
    advisorId: config.advisorId,
    firmName: config.firmName ?? existing?.firmName ?? DEFAULT_BRAND.firmName,
    logoUrl: config.logoUrl ?? existing?.logoUrl,
    primaryColor:
      config.primaryColor ?? existing?.primaryColor ?? DEFAULT_BRAND.primaryColor,
    accentColor:
      config.accentColor ?? existing?.accentColor ?? DEFAULT_BRAND.accentColor,
    fontFamily: config.fontFamily ?? existing?.fontFamily ?? DEFAULT_BRAND.fontFamily,
    tagline: config.tagline ?? existing?.tagline,
    disclaimerText:
      config.disclaimerText ?? existing?.disclaimerText ?? DEFAULT_BRAND.disclaimerText,
    contactInfo: {
      phone: config.contactInfo?.phone ?? existing?.contactInfo.phone,
      email: config.contactInfo?.email ?? existing?.contactInfo.email,
      website: config.contactInfo?.website ?? existing?.contactInfo.website,
      address: config.contactInfo?.address ?? existing?.contactInfo.address,
    },
    socialLinks: config.socialLinks ?? existing?.socialLinks,
    customCSS: config.customCSS ?? existing?.customCSS,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  brandStore.set(brandConfig.brandId, brandConfig);

  // Update indexes
  if (config.advisorId) {
    advisorBrandIndex.set(config.advisorId, brandConfig.brandId);
  } else {
    firmBrandIndex.set(config.firmId, brandConfig.brandId);
  }

  return brandConfig;
}

/**
 * Get brand configuration (advisor-specific → firm → default cascade)
 * @param firmId - Firm ID
 * @param advisorId - Optional advisor ID for advisor-specific branding
 * @returns Brand config (advisor-specific falls back to firm, then default)
 */
export function getBrandConfig(firmId: string, advisorId?: string): BrandConfig {
  // 1. Try advisor-specific branding
  if (advisorId) {
    const advisorBrandId = advisorBrandIndex.get(advisorId);
    if (advisorBrandId) {
      const brand = brandStore.get(advisorBrandId);
      if (brand) return brand;
    }
  }

  // 2. Try firm-level branding
  const firmBrandId = firmBrandIndex.get(firmId);
  if (firmBrandId) {
    const brand = brandStore.get(firmBrandId);
    if (brand) return brand;
  }

  // 3. Fall back to default Farther branding
  return DEFAULT_BRAND;
}

/**
 * Apply brand configuration to a template string
 * @param template - Template with {{placeholders}}
 * @param brand - Brand config to apply
 * @returns Template with placeholders replaced
 */
export function applyBrandToTemplate(
  template: string,
  brand: BrandConfig
): string {
  let result = template;

  // Replace all known placeholders
  const replacements: Record<string, string> = {
    '{{firmName}}': brand.firmName,
    '{{primaryColor}}': brand.primaryColor,
    '{{accentColor}}': brand.accentColor,
    '{{fontFamily}}': brand.fontFamily ?? DEFAULT_BRAND.fontFamily ?? '',
    '{{tagline}}': brand.tagline ?? '',
    '{{logoUrl}}': brand.logoUrl ?? '',
    '{{disclaimerText}}': brand.disclaimerText ?? DEFAULT_BRAND.disclaimerText ?? '',
    '{{contactPhone}}': brand.contactInfo.phone ?? '',
    '{{contactEmail}}': brand.contactInfo.email ?? '',
    '{{contactWebsite}}': brand.contactInfo.website ?? '',
    '{{contactAddress}}': brand.contactInfo.address ?? '',
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  // Replace social links
  if (brand.socialLinks) {
    for (const [platform, url] of Object.entries(brand.socialLinks)) {
      result = result.replace(
        new RegExp(`{{social_${platform}}}`, 'gi'),
        url
      );
    }
  }

  return result;
}

/**
 * Validate brand configuration
 * @param config - Partial brand config to validate
 * @returns Validation result with errors
 */
export function validateBrandConfig(config: Partial<BrandConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.primaryColor && !isValidHexColor(config.primaryColor)) {
    errors.push('primaryColor must be valid hex color (e.g., #1B3A4B)');
  }

  if (config.accentColor && !isValidHexColor(config.accentColor)) {
    errors.push('accentColor must be valid hex color (e.g., #D4A574)');
  }

  if (config.logoUrl && !isValidUrl(config.logoUrl)) {
    errors.push('logoUrl must be valid URL');
  }

  if (config.contactInfo?.website && !isValidUrl(config.contactInfo.website)) {
    errors.push('contactInfo.website must be valid URL');
  }

  if (config.contactInfo?.email && !isValidEmail(config.contactInfo.email)) {
    errors.push('contactInfo.email must be valid email');
  }

  if (config.customCSS && config.customCSS.includes('<script')) {
    errors.push('customCSS cannot contain script tags');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * List all brand configurations for a firm
 * @param firmId - Firm ID
 * @returns Array of brand configs (firm-level and advisor-specific)
 */
export function listFirmBrands(firmId: string): BrandConfig[] {
  const brands: BrandConfig[] = [];

  // Add firm-level brand
  const firmBrandId = firmBrandIndex.get(firmId);
  if (firmBrandId) {
    const brand = brandStore.get(firmBrandId);
    if (brand) brands.push(brand);
  }

  // Add all advisor-specific brands for this firm
  for (const brand of brandStore.values()) {
    if (brand.firmId === firmId && brand.advisorId) {
      brands.push(brand);
    }
  }

  return brands.sort((a, b) => {
    // Sort: firm-level first, then advisors alphabetically
    if (!a.advisorId && b.advisorId) return -1;
    if (a.advisorId && !b.advisorId) return 1;
    return (a.advisorId ?? '').localeCompare(b.advisorId ?? '');
  });
}

/**
 * Delete a brand configuration
 * @param brandId - Brand ID to delete
 * @returns true if deleted, false if not found
 */
export function deleteBrandConfig(brandId: string): boolean {
  const brand = brandStore.get(brandId);
  if (!brand) return false;

  // Remove from indexes
  if (brand.advisorId) {
    advisorBrandIndex.delete(brand.advisorId);
  } else {
    firmBrandIndex.delete(brand.firmId);
  }

  brandStore.delete(brandId);
  return true;
}

// Utility functions

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate CSS string from brand config
 * @param brand - Brand config
 * @returns CSS custom properties string
 */
export function generateBrandCSS(brand: BrandConfig): string {
  const css = `
:root {
  --brand-primary: ${brand.primaryColor};
  --brand-accent: ${brand.accentColor};
  --brand-font-family: ${brand.fontFamily ?? DEFAULT_BRAND.fontFamily};
}

.brand-header {
  background-color: var(--brand-primary);
  color: white;
  font-family: var(--brand-font-family);
}

.brand-accent {
  color: var(--brand-accent);
}

.brand-button {
  background-color: var(--brand-accent);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-family: var(--brand-font-family);
}

.brand-button:hover {
  opacity: 0.9;
}

${brand.customCSS ?? ''}
`.trim();

  return css;
}
