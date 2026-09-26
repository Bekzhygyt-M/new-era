/**
 * Central runtime configuration.
 *
 * Rule: secrets are read from the environment only. Nothing in this file (or
 * anywhere else in the codebase) may contain a literal token or password.
 */

export const isProduction = process.env.NODE_ENV === 'production';

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  get isConfigured() {
    return Boolean(this.url && this.anonKey);
  },
  get hasServiceRole() {
    return Boolean(this.url && this.serviceRoleKey);
  },
};

export const appConfig = {
  /** Public origin, used for absolute links in certificates and reset links. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};

/** Upload limits (TZ §29: file type + file size validation). */
export const uploadLimits = {
  video: {
    maxBytes: 512 * 1024 * 1024, // 512 MB
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    extensions: ['.mp4', '.webm', '.mov'],
  },
  receipt: {
    maxBytes: 8 * 1024 * 1024, // 8 MB
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    extensions: ['.png', '.jpg', '.jpeg', '.webp', '.pdf'],
  },
  image: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
  },
};
