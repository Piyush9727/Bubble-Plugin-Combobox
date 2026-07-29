function(instance, properties, context) {
  instance.data.$input.attr('placeholder', properties.placeholder || '');
  if (typeof instance.data.syncFont === 'function') {
    instance.data.syncFont();
  }

  const borderRadius = (properties.border_radius !== undefined && properties.border_radius !== null)
    ? properties.border_radius + 'px'
    : '6px';

  if (instance.data.$container) {
    instance.data.$container.css('border-radius', borderRadius);
  }
  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css('border-radius', borderRadius);
  }

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
  instance.data.captionField = properties.caption_field;

  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(instance.data.$input.val());
  }
}