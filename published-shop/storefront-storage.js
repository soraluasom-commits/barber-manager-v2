// Interface used by the accepted shop renderer and two-phase restore journal.
(() => {
  const memory = new Map();
  let businessKey, persist, pending = Promise.resolve(), pendingCount = 0;
  if(!window.BarberStoreHost?.usesLegacyAccount)document.documentElement.inert = true;
  window.OwnerStorageReady = new Promise(resolve => { window.ownerStorageReady = resolve; });
  const scope = window.BarberStoreHost?.scope;
  const preferences = new Set(['barberCommercialV1Theme','barberCommercialV1MenuOrder']);
  const prefix = 'barber-storefront-ui-v1:' + JSON.stringify(scope ?? '') + ':';

  window.WorkspaceStorage = {
    getItem(key) {
      if (key === businessKey) return memory.get(key) ?? null;
      return preferences.has(key) ? localStorage.getItem(prefix + key) : null;
    },
    setItem(key, value) {
      if (key !== businessKey) {
        if (preferences.has(key)) localStorage.setItem(prefix + key, value);
        return;
      }
      const text = String(value);
      memory.set(key, text);
      if (!persist) return;
      pendingCount++;
      pending = pending.catch(() => {}).then(() => persist(text)).finally(() => { pendingCount--; });
      pending.catch(e => window.dispatchEvent(new CustomEvent('storefront-save-error', {detail:e.message})));
    },
    removeItem(key) {
      if (key === businessKey) memory.delete(key);
      else if (preferences.has(key)) localStorage.removeItem(prefix + key);
    },
    configure(key, value, handler) {
      businessKey = key;
      memory.set(key, value);
      persist = handler;
    },
    seed(value) { memory.set(businessKey, value); },
    flush() { return pending; },
    clearFailure() {
      if (pendingCount) throw Error('BUSINESS_SAVE_PENDING');
      pending = Promise.resolve();
    },
    get busy() { return pendingCount > 0; }
  };

  window.addEventListener('beforeunload', event => {
    if (pendingCount) { event.preventDefault(); event.returnValue = ''; }
  });
  window.OwnerSubscriptionAccess = {
    allowed:false, expires:0, recoveryPending:false,
    hasWriteLease() { return this.allowed && Date.now() < this.expires; },
    canWrite() { return this.hasWriteLease() && !this.recoveryPending; }
  };
  window.CommercialLicense = {
    canWrite: () => OwnerSubscriptionAccess.canWrite(),
    getStatus: () => ({status:OwnerSubscriptionAccess.canWrite()?'active':'expired',subscription:false})
  };
})();
