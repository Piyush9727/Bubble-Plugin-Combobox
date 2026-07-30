function(instance, properties, context) {
  // ── Config into instance.data ────────────────────────────────────────────
  instance.data.placeholder   = properties.placeholder    || 'Select options';
  instance.data.noResultsText = properties.no_results_text || 'No options found';
  instance.data.maxSelections = properties.max_selections  || 0;
  instance.data.captionField  = properties.caption_field;

  // Re-render chips/placeholder so text stays in sync with updated placeholder property
  if (instance.data.selectedThings && instance.data.selectedThings.length === 0 && typeof instance.data.renderChips === 'function') {
    instance.data.renderChips();
  }

  // ── Border radius (canvas + dropdown) ────────────────────────────────────
  var br = (properties.border_radius !== undefined && properties.border_radius !== null)
    ? properties.border_radius + 'px' : '6px';
  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css('border-radius', br);
  }
  if (instance.data.$dropdown) {
    instance.data.$dropdown.css('border-radius', br);
  }

  // ── Chip + selected row colors → CSS custom properties ───────────────────
  var selBg   = properties.selected_bg_color   || 'rgba(79, 70, 229, 1)';
  var selText = properties.selected_text_color  || 'rgba(255, 255, 255, 1)';
  if (instance.data.$tagsWrapper && instance.data.$tagsWrapper[0]) {
    instance.data.$tagsWrapper[0].style.setProperty('--ms-sel-bg',   selBg);
    instance.data.$tagsWrapper[0].style.setProperty('--ms-sel-text', selText);
  }
  if (instance.data.$list && instance.data.$list[0]) {
    instance.data.$list[0].style.setProperty('--ms-sel-bg',   selBg);
    instance.data.$list[0].style.setProperty('--ms-sel-text', selText);
  }

  // ── Placeholder color ─────────────────────────────────────────────────────
  // ::placeholder pseudo-element must be set via a <style> tag (not jQuery .css)
  // Also update the trigger placeholder span color directly
  var pc = properties.placeholder_color || 'rgba(100, 116, 139, 1)';
  if (instance.data.$scopedStyle) {
    instance.data.$scopedStyle.text(
      '#' + instance.data.uid + '-search::placeholder { color: ' + pc + '; opacity: 1; }'
    );
  }
  if (instance.data.$tagsWrapper) {
    instance.data.$tagsWrapper.find('.ms-placeholder').css('color', pc);
  }

  // ── Sync canvas background + font → dropdown panel ───────────────────────
  if (typeof instance.data.syncStyles === 'function') {
    instance.data.syncStyles();
  }

  // ── Options list ─────────────────────────────────────────────────────────
  var things = [];
  if (properties.options_list && typeof properties.options_list.length === 'function') {
    try {
      var count = properties.options_list.length();
      things = properties.options_list.get(0, count);
    } catch (err) {
      if (err && err.message === 'not ready') throw err;
      console.warn('MultiSelect options_list read error:', err);
    }
  } else if (Array.isArray(properties.options_list)) {
    things = properties.options_list;
  }
  instance.data.things = things;

  // ── Default values — pre-select on first load ─────────────────────────────
  if (
    instance.data.selectedThings &&
    instance.data.selectedThings.length === 0 &&
    properties.default_values &&
    typeof instance.data.getItemLabel === 'function'
  ) {
    var defaults = [];
    if (typeof properties.default_values.length === 'function') {
      try {
        var dc = properties.default_values.length();
        defaults = properties.default_values.get(0, dc);
      } catch (e) { /* ignore */ }
    } else if (Array.isArray(properties.default_values)) {
      defaults = properties.default_values;
    }

    if (defaults.length > 0 && things.length > 0) {
      var matched = [];
      defaults.forEach(function(defVal) {
        var match = things.find(function(t) {
          try {
            var tKey = instance.data.getKey(t);
            var dKey = instance.data.getKey(defVal);
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

  // Re-render dropdown options if currently open
  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(
      instance.data.$searchInput ? instance.data.$searchInput.val() : ''
    );
  }
}
