/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppCustomization } from '../types';
import { normalizeImageUrl } from './imageUrl';

const COLOR_MAP: Record<string, string> = {
  'bg-blue-600': '#2563eb',
  'bg-indigo-600': '#4f46e5',
  'bg-emerald-600': '#059669',
  'bg-violet-600': '#7c3aed',
  'bg-rose-600': '#e11d48',
  'bg-amber-600': '#d97706',
};

/**
 * Generates an SVG Data URL with rounded background and centered emoji.
 */
export function generateEmojiSvgDataUrl(emoji: string = '🎓', colorClass: string = 'bg-blue-600'): string {
  const bgHex = COLOR_MAP[colorClass] || '#2563eb';
  const cleanEmoji = emoji || '🎓';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" rx="128" fill="${bgHex}"/>
    <text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-size="280">${cleanEmoji}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Synchronizes web app metadata, favicon, iOS/Android home screen icon (Apple Touch Icon),
 * and Web App Manifest so that installing/adding to home screen (APK/PWA) uses the web logo.
 */
export function updateAppMetadataAndIcon(customization: Partial<AppCustomization>) {
  if (typeof document === 'undefined') return;

  const appName = customization.appName?.trim() || 'E-ABSENSI';
  const appSubtitle = customization.appSubtitle?.trim() || 'SEKOLAH DIGITAL';
  const rawLogoUrl = customization.logoUrl?.trim();
  const logoUrl = rawLogoUrl ? normalizeImageUrl(rawLogoUrl) : '/logo_smpn11.jpg';
  const logoEmoji = customization.logoEmoji || '🎓';
  const logoColor = customization.logoColor || 'bg-blue-600';

  // 1. Update Document Title
  document.title = `${appName} - ${appSubtitle}`;

  // 2. Primary icon URL (custom image URL if provided, or generated high-res SVG data URL)
  const iconUrl = logoUrl || generateEmojiSvgDataUrl(logoEmoji, logoColor);

  // 3. Update Favicon (<link id="app-favicon" rel="icon">)
  let faviconLink = document.getElementById('app-favicon') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.id = 'app-favicon';
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  faviconLink.href = iconUrl;
  if (iconUrl.startsWith('data:image/svg+xml')) {
    faviconLink.type = 'image/svg+xml';
  } else {
    faviconLink.removeAttribute('type');
  }

  // 4. Update Apple Touch Icon (<link id="app-apple-touch-icon" rel="apple-touch-icon">)
  let appleIconLink = document.getElementById('app-apple-touch-icon') as HTMLLinkElement | null;
  if (!appleIconLink) {
    appleIconLink = document.createElement('link');
    appleIconLink.id = 'app-apple-touch-icon';
    appleIconLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleIconLink);
  }
  appleIconLink.href = iconUrl;

  // 5. Dynamic Web App Manifest (<link id="app-manifest" rel="manifest">)
  let manifestLink = document.getElementById('app-manifest') as HTMLLinkElement | null;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.id = 'app-manifest';
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }

  const themeHex = COLOR_MAP[logoColor] || '#2563eb';

  const manifestObject = {
    name: appName,
    short_name: appName,
    description: `${appName} - ${appSubtitle}`,
    start_url: './',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: themeHex,
    icons: [
      {
        src: iconUrl,
        sizes: '192x192 512x512',
        type: iconUrl.startsWith('data:image/svg+xml') ? 'image/svg+xml' : 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  try {
    const manifestBlob = new Blob([JSON.stringify(manifestObject, null, 2)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    if (manifestLink.href && manifestLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(manifestLink.href);
    }
    manifestLink.href = manifestUrl;
  } catch (err) {
    console.error('Failed to create manifest blob:', err);
  }

  // 6. Update PWA / Mobile Meta Tags
  const setMetaContent = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaContent('mobile-web-app-capable', 'yes');
  setMetaContent('apple-mobile-web-app-capable', 'yes');
  setMetaContent('apple-mobile-web-app-title', appName);
  setMetaContent('theme-color', themeHex);
}
