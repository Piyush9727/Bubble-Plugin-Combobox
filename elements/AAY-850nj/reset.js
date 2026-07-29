function(instance, context) {
  if (!instance.data) return;
  instance.data.selectedThings = [];
  if (typeof instance.data.renderChips === 'function') instance.data.renderChips();
  if (typeof instance.data.close === 'function') instance.data.close();
  if (instance.data.$searchInput) {
    instance.data.$searchInput.val('');
  }
  instance.publishState('value', []);
  instance.publishState('value_count', 0);
  instance.publishState('search_term', '');
}