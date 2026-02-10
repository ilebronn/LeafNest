const listeners = new Set();

const emit = (event) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn('Public feed listener error:', error?.message || error);
    }
  });
};

export const subscribePublicFeedUpdates = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitPublicFeedRemoval = (historyId) => {
  if (!historyId) return;
  emit({ type: 'remove', historyId: String(historyId) });
};
