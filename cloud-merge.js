(function (root) {
  'use strict';
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function equal(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
  }
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function merge(base, local, remote, path = '') {
    if (equal(local, base)) return copy(remote);
    if (equal(remote, base) || equal(local, remote)) return copy(local);
    if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
      const keyed = array => array.every(x => plain(x) && typeof x.id === 'string' && x.id) && new Set(array.map(x => x.id)).size === array.length;
      if ([base, local, remote].every(keyed)) {
        const maps = [base, local, remote].map(array => new Map(array.map(x => [x.id, x])));
        const ids = [...new Set([...remote, ...local, ...base].map(x => x.id))];
        return ids.map(id => merge(...maps.map(m => m.get(id)), `${path}/${id}`)).filter(x => x !== undefined);
      }
    }
    if (plain(local) && plain(remote) && (plain(base) || base === undefined)) {
      const result = {};
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid data key');
        const value = merge(base?.[key], local[key], remote[key], `${path}/${key}`);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    const error = new Error(`Conflicting edits: ${path}`);
    error.code = 'sync/conflict';
    throw error;
  }
  const api = { merge, equal, copy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BarberCloudMerge = api;
})(typeof window !== 'undefined' ? window : globalThis);
