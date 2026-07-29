function(instance, properties, context) {
  instance.data.$input.attr('placeholder', properties.placeholder || '');
  instance.data.syncFont();

  const count = properties.options_list.length();
  const things = properties.options_list.get(0, count); // 'not ready' handled by Bubble automatically

  // 2. Extract options list safely (Bubble dynamic list property)
  let things = [];
  if (properties.options_list && typeof properties.options_list.length === 'function') {
    try {
      const count = properties.options_list.length();
      things = properties.options_list.get(0, count);
    } catch (err) {
      if (err && err.message === 'not ready') throw err;
      console.warn('Combobox options_list read error:', err);
    }
  } else if (Array.isArray(properties.options_list)) {
    things = properties.options_list;
  }
  instance.data.things = things;

  if (instance.data.isOpen) {
    instance.data.renderOptions(instance.data.$input.val());
  }
}