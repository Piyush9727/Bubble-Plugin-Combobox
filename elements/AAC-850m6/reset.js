function(instance, context) {
  if (instance.data) {
    instance.data.hasInitializedDefault = false;
    if (typeof instance.data.clearSelection === 'function') {
      instance.data.clearSelection();
    }
  }
}