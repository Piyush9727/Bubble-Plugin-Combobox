function(instance, properties, context) {
  if (typeof instance.data.syncFont === 'function') {
    instance.data.syncFont();
  }

  // ── Sync config values into instance.data so other functions can read them
  instance.data.placeholder    = properties.placeholder    || 'Select options';
  instance.data.noResultsText  = properties.no_results_text || 'No options found';
  instance.data.maxSelections  = properties.max_selections  || 0;
  instance.data.captionField   = properties.caption_field;

  // Update placeholder only when nothing is selected
  if (instance.data.$searchInput && instance.data.selectedThings && instance.data.selectedThings.length === 0) {
    instance.data.$searchInput.attr('placeholder', instance.data.placeholder);
  }

  // ── Border radius ────────────────────────────────────────────────────────
  const borderRadius = (properties.border_radius !== undefined && properties.border_radius !== null)
    ? properties.border_radius + 'px'
    : '6px';
  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css('border-radius', borderRadius);
  }

  // ── Selection colors — CSS custom properties on both chips and list ──────
  const selBg   = properties.selected_bg_color   || 'rgba(79, 70, 229, 1)';
  const selText = properties.selected_text_color  || 'rgba(255, 255, 255, 1)';
  if (instance.data.$list && instance.data.$list[0]) {
    instance.data.$list[0].style.setProperty('--ms-sel-bg',   selBg);
    instance.data.$list[0].style.setProperty('--ms-sel-text', selText);
  }
  if (instance.data.$tagsWrapper && instance.data.$tagsWrapper[0]) {
    instance.data.$tagsWrapper[0].style.setProperty('--ms-sel-bg',   selBg);
    instance.data.$tagsWrapper[0].style.setProperty('--ms-sel-text', selText);
  }

  // ── Options list ─────────────────────────────────────────────────────────
  let things = [];
  if (properties.options_list && typeof properties.options_list.length === 'function') {
    try {
      const count = properties.options_list.length();
      things = properties.options_list.get(0, count);
    } catch (err) {
      if (err && err.message === 'not ready') throw err;
      console.warn('MultiSelect options_list read error:', err);
    }
  } else if (Array.isArray(properties.options_list)) {
    things = properties.options_list;
  }
  instance.data.things = things;

  // ── Default values — pre-select if nothing selected yet ──────────────────
  if (
    instance.data.selectedThings &&
    instance.data.selectedThings.length === 0 &&
    properties.default_values &&
    typeof instance.data.getItemLabel === 'function'
  ) {
    let defaults = [];
    if (typeof properties.default_values.length === 'function') {
      try {
        const count = properties.default_values.length();
        defaults = properties.default_values.get(0, count);
      } catch (e) { /* ignore */ }
    } else if (Array.isArray(properties.default_values)) {
      defaults = properties.default_values;
    }

    if (defaults.length > 0 && things.length > 0) {
      const matched = [];
      defaults.forEach(function(defVal) {
        const match = things.find(function(t) {
          try {
            const tKey = instance.data.getKey(t);
            const dKey = instance.data.getKey(defVal);
            if (tKey && dKey) return tKey === dKey;
            return instance.data.getItemLabel(t) === instance.data.getItemLabel(defVal);
          } catch (e) { return false; }
        });
        if (match !== undefined) matched.push(match);
      });
      if (matched.length > 0) {
        instance.data.selectedThings = matched;
        if (typeof instance.data.renderChips === 'function') instance.data.renderChips();
        instance.publishState('value', matched);
        instance.publishState('value_count', matched.length);
      }
    }
  }

  // Re-render dropdown if it's currently open
  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(
      instance.data.$searchInput ? instance.data.$searchInput.val() : ''
    );
  }
}
