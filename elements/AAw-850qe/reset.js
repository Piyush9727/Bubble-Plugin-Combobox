function(instance, context) {
  if (!instance.data) return;
  instance.data.hasInitializedDefaults = false;
  if (typeof instance.data.clearAll === 'function') {
    instance.data.clearAll();
  } else {
    instance.data.selectedThings = [];
    if (typeof instance.data.renderTrigger === 'function') instance.data.renderTrigger();
    if (typeof instance.data.close === 'function') instance.data.close();
    instance.publishState('value', []);
    instance.publishState('value_count', 0);
    instance.publishState('search_term', '');
    if (typeof instance.data.updateValidation === 'function') instance.data.updateValidation();
  }
}
