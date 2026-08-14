/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { AppCustomization, User } from '../types';

/**
 * Cleans and normalizes image URLs from Google Drive, Dropbox, GitHub, Imgur, etc.
 * to ensure direct embedding in <img src="..." referrerPolicy="no-referrer" />
 */
export function normalizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // 0. Clean wrapping quotes, angle brackets, or markdown link syntax
  url = url.replace(/^[<"'\s]+|[>"'\s]+$/g, '');
  const mdMatch = url.match(/\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch && mdMatch[1]) {
    url = mdMatch[1];
  }

  // If already a base64 data url or blob url, return as-is
  if (url.startsWith('data:image/') || url.startsWith('blob:')) {
    return url;
  }

  // 1. Google Drive URLs
  // Handles:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/file/u/0/d/FILE_ID/view
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://drive.google.com/uc?export=view&id=FILE_ID
  // - https://docs.google.com/uc?id=FILE_ID
  // - https://lh3.googleusercontent.com/d/FILE_ID
  // - https://drive.google.com/thumbnail?id=FILE_ID
  if (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com') ||
    url.includes('googleusercontent.com')
  ) {
    // Try extract file ID from /file/d/FILE_ID or /d/FILE_ID
    const fileDMatch = url.match(/\/file(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)/i) || url.match(/\/d\/([a-zA-Z0-9_-]+)/i);
    if (fileDMatch && fileDMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileDMatch[1]}&sz=w1000`;
    }

    // Try extract file ID from ?id=FILE_ID or &id=FILE_ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
  }

  // 2. GitHub Raw URLs (convert github.com/user/repo/blob/... to raw.githubusercontent.com)
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  // 3. Dropbox URLs (convert ?dl=0 to ?raw=1)
  if (url.includes('dropbox.com')) {
    if (url.includes('?dl=0')) {
      return url.replace('?dl=0', '?raw=1');
    }
    if (url.includes('&dl=0')) {
      return url.replace('&dl=0', '&raw=1');
    }
    if (!url.includes('raw=1')) {
      return url.includes('?') ? `${url}&raw=1` : `${url}?raw=1`;
    }
  }

  // 4. Imgur URLs (convert page link to direct image link if no extension)
  if (url.includes('imgur.com/') && !url.includes('i.imgur.com') && !/\.(png|jpe?g|gif|webp|svg)/i.test(url)) {
    const parts = url.split('/');
    const id = parts[parts.length - 1].split('?')[0];
    if (id) {
      return `https://i.imgur.com/${id}.png`;
    }
  }

  // 5. PostImages (postimg.cc direct image helper)
  if (url.includes('postimg.cc/') && !url.includes('i.postimg.cc') && !/\.(png|jpe?g|gif|webp)/i.test(url)) {
    const parts = url.split('/');
    const id = parts[parts.length - 1].split('?')[0];
    if (id) {
      return `https://i.postimg.cc/${id}/image.png`;
    }
  }

  return url;
}

/**
 * Resilient lookup helper to find a user's photo from customization settings.
 * Matches username, NIP, name, ID with case-insensitive and whitespace-tolerant fallback.
 */
export function getUserPhotoUrl(
  customization?: AppCustomization | null,
  user?: { username?: string; nip?: string; nama?: string; id?: string; role?: string } | null
): string {
  if (!customization?.userPhotos || !user) return '';
  const photos = customization.userPhotos;

  // 1. Direct candidates to check in priority order
  const candidates = [
    user.username,
    user.username?.toLowerCase(),
    user.username?.trim(),
    user.nip,
    user.nip?.trim(),
    user.nama,
    user.nama?.trim(),
    user.id,
    user.id?.trim(),
    user.role === 'Admin' ? 'admin' : '',
  ].filter((c): c is string => Boolean(c && typeof c === 'string' && c.length > 0));

  for (const candidate of candidates) {
    if (photos[candidate] && typeof photos[candidate] === 'string' && photos[candidate].trim()) {
      return normalizeImageUrl(photos[candidate].trim());
    }
  }

  // 2. Case-insensitive lookup across all keys
  const keys = Object.keys(photos);
  for (const candidate of candidates) {
    const candLower = candidate.toLowerCase().trim();
    const matchedKey = keys.find((k) => k.toLowerCase().trim() === candLower);
    if (matchedKey && photos[matchedKey] && typeof photos[matchedKey] === 'string' && photos[matchedKey].trim()) {
      return normalizeImageUrl(photos[matchedKey].trim());
    }
  }

  // 3. Email username prefix matching (e.g. "mohammad.rizaldy168@admin.smp.belajar.id" -> "mohammad.rizaldy168")
  if (user.username && user.username.includes('@')) {
    const userPrefix = user.username.split('@')[0].toLowerCase().trim();
    const matchedKey = keys.find((k) => {
      const kLow = k.toLowerCase().trim();
      return kLow === userPrefix || userPrefix.includes(kLow) || kLow.includes(userPrefix);
    });
    if (matchedKey && photos[matchedKey]?.trim()) {
      return normalizeImageUrl(photos[matchedKey].trim());
    }
  }

  return '';
}

/**
 * On-error handler for img tags that automatically tries alternative CDN/proxy formats
 * for Google Drive and external images before failing to display.
 */
export function handleImageFallbackError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  onFinalFail?: () => void
) {
  const img = e.currentTarget;
  const currentSrc = img.src;

  // If failed on drive.google.com/thumbnail, try lh3.googleusercontent.com/d/
  if (currentSrc.includes('drive.google.com/thumbnail')) {
    const idMatch = currentSrc.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      img.src = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
      return;
    }
  }

  // If failed on lh3, try drive.google.com/uc?export=view&id=
  if (currentSrc.includes('lh3.googleusercontent.com/d/')) {
    const parts = currentSrc.split('/d/');
    if (parts[1]) {
      const fileId = parts[1].split(/[?#/]/)[0];
      img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return;
    }
  }

  // Final failure callback
  if (onFinalFail) {
    onFinalFail();
  } else {
    img.style.display = 'none';
  }
}

