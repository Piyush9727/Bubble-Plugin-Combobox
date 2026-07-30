function(instance, properties, context) {
  instance.data.placeholder  = properties.placeholder || '';
  instance.data.isRequired   = !!properties.is_required;
  instance.data.captionField = properties.caption_field;

  instance.data.$input.attr('placeholder', instance.data.placeholder);

  // Scoped placeholder color
  var pc = properties.placeholder_color || 'rgba(100, 116, 139, 1)';
  if (instance.data.$scopedStyle) {
    instance.data.$scopedStyle.text(
      '#' + instance.data.uid + '-input::placeholder { color: ' + pc + '; opacity: 1; }'
    );
  }

  if (typeof instance.data.syncFont === 'function') {
    instance.data.syncFont();
  }

  // Border radius
  const borderRadius = (properties.border_radius !== undefined && properties.border_radius !== null)
    ? properties.border_radius + 'px'
    : '6px';
  if (instance.data.$container) {
    instance.data.$container.css('border-radius', borderRadius);
  }
  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css({
      'border-radius': borderRadius,
      'display': 'flex',
      'align-items': 'center'
    });
  }

  // Options list
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

  // Default value — auto-select if nothing is selected yet
  if (
    properties.default_value !== undefined &&
    properties.default_value !== null &&
    instance.data.selectedThing === null &&
    typeof instance.data.getItemLabel === 'function'
  ) {
    const defVal = properties.default_value;
    const match = things.find(t => {
      try {
        const tKey = typeof instance.data.getKey === 'function' ? instance.data.getKey(t) : null;
        const dKey = typeof instance.data.getKey === 'function' ? instance.data.getKey(defVal) : null;
        if (tKey && dKey) return tKey === dKey;
        return instance.data.getItemLabel(t) === instance.data.getItemLabel(defVal);
      } catch (e) { return false; }
    });
    if (match !== undefined) {
      const label = instance.data.getItemLabel(match);
      instance.data.$input.val(label);
      instance.data.selectedThing = match;
      if (instance.data.$clear) instance.data.$clear.toggle(true);
      instance.publishState('value', match);
    }
  }

  // Update validation state
  if (typeof instance.data.updateValidation === 'function') {
    instance.data.updateValidation();
  }

  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(instance.data.currentQuery || '');
  }
}
