function(instance, context) {
  if (instance.data && typeof instance.data.clearSelection === 'function') {
    instance.data.clearSelection();
  }
}