import { URL } from "url";

export function isValidUrl(url: string): boolean {
  /**
   * Check if the URL is valid
   * @param {string} url - The URL to check
   * @returns {boolean} True if the URL is valid, False otherwise
   */
  try {
    const { protocol, host } = new URL(url);
    return !!(protocol && host);
  } catch (e) {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  /**
   * Sanitize the URL
   * @param {string} url - The URL to sanitize
   * @returns {string} The sanitized URL
   */
  const { pathname, hash, searchParams } = new URL(url);
  const queryParams = searchParams.toString() ? `?${searchParams}` : "";
  return `${pathname}${queryParams}${hash}`;
}

function checkLocalFileAccess(url: string): boolean {
  /**
   * Check if the URL is a local file
   * @param {string} url - The URL to check
   * @returns {boolean} True if the URL is a local file, False otherwise
   */
  const localPrefixes = [
    "file:///",
    "file://localhost/",
    "file://localhost",
    "http://localhost",
    "http://localhost/",
    "https://localhost",
    "https://localhost/",
    "http://2130706433",
    "http://2130706433/",
    "https://2130706433",
    "https://2130706433/",
    "http://127.0.0.1/",
    "http://127.0.0.1",
    "https://127.0.0.1/",
    "https://127.0.0.1",
    "https://0.0.0.0/",
    "https://0.0.0.0",
    "http://0.0.0.0/",
    "http://0.0.0.0",
    "http://0000",
    "http://0000/",
    "https://0000",
    "https://0000/",
  ];
  return localPrefixes.some((prefix) => url.startsWith(prefix));
}
