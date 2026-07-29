function(instance, properties, context) {
  instance.data.$input.attr('placeholder', properties.placeholder || '');
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
    instance.canvas.css('border-radius', borderRadius);
  }

  // Selected row colors — applied as CSS custom properties on the list element
  if (instance.data.$list) {
    const selBg   = properties.selected_bg_color   || 'rgba(79, 70, 229, 1)';
    const selText = properties.selected_text_color  || 'rgba(255, 255, 255, 1)';
    instance.data.$list[0].style.setProperty('--cb-sel-bg',   selBg);
    instance.data.$list[0].style.setProperty('--cb-sel-text', selText);
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
  instance.data.captionField = properties.caption_field;

  // Default value — auto-select if nothing is selected yet
  if (
    properties.default_value !== undefined &&
    properties.default_value !== null &&
    instance.data.selectedThing === null &&
    typeof instance.data.getItemLabel === 'function' &&
    typeof instance.data.selectItem === 'function'
  ) {
    const defVal = properties.default_value;
    // Try to find the matching item from the list
    const match = things.find(t => {
      try {
        const tKey = typeof instance.data.getKey === 'function' ? instance.data.getKey(t) : null;
        const dKey = typeof instance.data.getKey === 'function' ? instance.data.getKey(defVal) : null;
        if (tKey && dKey) return tKey === dKey;
        return instance.data.getItemLabel(t) === instance.data.getItemLabel(defVal);
      } catch (e) { return false; }
    });
    if (match !== undefined) {
      // Use selectItem but keep list closed
      const label = instance.data.getItemLabel(match);
      instance.data.$input.val(label);
      instance.data.selectedThing = match;
      if (instance.data.$clear) instance.data.$clear.toggle(true);
      instance.publishState('value', match);
    }
  }

  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(instance.data.$input.val());
  }
}