/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format minutes of tardiness into human readable string:
 * - < 60 minutes: "X menit"
 * - >= 60 minutes: "X jam Y menit" (or "X jam" if exact)
 * - <= 0 minutes: "-"
 */
export function formatKeterlambatan(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '-';

  // If already contains formatted string with jam / menit, check if it needs conversion
  let minutes = 0;
  if (typeof val === 'number') {
    minutes = val;
  } else {
    const str = String(val).trim();
    if (str === '-' || str.toLowerCase() === 'tepat waktu') return '-';
    
    // If string already has "jam" in it, return as is
    if (str.toLowerCase().includes('jam')) {
      return str;
    }

    // Extract digits
    const match = str.match(/\d+/);
    if (match) {
      minutes = parseInt(match[0], 10);
    } else {
      return str;
    }
  }

  if (isNaN(minutes) || minutes <= 0) {
    return '-';
  }

  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${remainingMinutes} menit`;
}

/**
 * Parse minute number from tardiness string or number
 */
export function parseMenitTerlambat(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.max(0, val);

  const str = String(val).trim();
  if (str === '-' || str.toLowerCase() === 'tepat waktu') return 0;

  // Handle "X jam Y menit" format
  const jamMatch = str.match(/(\d+)\s*jam/i);
  const menitMatch = str.match(/(\d+)\s*menit/i);

  let total = 0;
  if (jamMatch) {
    total += parseInt(jamMatch[1], 10) * 60;
  }
  if (menitMatch) {
    total += parseInt(menitMatch[1], 10);
  } else if (!jamMatch) {
    const rawDigits = str.match(/\d+/);
    if (rawDigits) {
      total = parseInt(rawDigits[0], 10);
    }
  }

  return Math.max(0, total);
}
