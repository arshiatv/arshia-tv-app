import semver from "semver";

/**
 * Utilities around version parsing & comparison.
 * We coerce to semver where possible to be tolerant of formats like "1.2" or "v1.2.3".
 */

export function isLocalOlder(localVersion: string, requiredVersion: string): boolean {
  const lv = semver.coerce(localVersion)?.version ?? localVersion;
  const rv = semver.coerce(requiredVersion)?.version ?? requiredVersion;
  if (semver.valid(lv) && semver.valid(rv)) {
    return semver.lt(lv, rv);
  }
  // fallback: lexical compare
  return lv < rv;
}
