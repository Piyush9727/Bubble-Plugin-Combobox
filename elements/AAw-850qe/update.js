function(instance, properties, context) {
  instance.data.placeholder    = properties.placeholder     || (properties.allow_multiple ? 'Select options' : 'Select option');
  instance.data.noResultsText  = properties.no_results_text || 'No options found';
  instance.data.maxSelections  = properties.max_selections  || 0;
  instance.data.isRequired     = !!properties.is_required;
  instance.data.captionField   = properties.caption_field;
  instance.data.avatarField    = properties.avatar_field;
  instance.data.allowMultiple  = !!properties.allow_multiple;

  if (
    instance.data.selectedThings &&
    instance.data.selectedThings.length === 0 &&
    typeof instance.data.renderTrigger === 'function'
  ) {
    instance.data.renderTrigger();
  }

  if (!instance.data.allowMultiple && instance.data.selectedThings && instance.data.selectedThings.length > 1) {
    instance.data.selectedThings = instance.data.selectedThings.slice(0, 1);
    instance.data.renderTrigger();
    if (typeof instance.data.publishSelection === 'function') {
      instance.data.publishSelection();
    }
  }

  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css({ display: 'flex', alignItems: 'center' });
  }

  var selBg   = properties.selected_bg_color  || 'rgba(79, 70, 229, 1)';
  var selText = properties.selected_text_color || 'rgba(255, 255, 255, 1)';
  if (instance.data.$list && instance.data.$list[0]) {
    instance.data.$list[0].style.setProperty('--ecs-sel-bg',   selBg);
    instance.data.$list[0].style.setProperty('--ecs-sel-text', selText);
  }
  if (instance.data.$content && instance.data.$content[0]) {
    instance.data.$content[0].style.setProperty('--ecs-sel-bg',   selBg);
    instance.data.$content[0].style.setProperty('--ecs-sel-text', selText);
  }

  var pc = properties.placeholder_color || 'rgba(100, 116, 139, 1)';
  if (instance.data.$scopedStyle) {
    instance.data.$scopedStyle.text(
      '#' + instance.data.uid + '-search::placeholder { color: ' + pc + '; opacity: 1; }'
    );
  }
  if (instance.data.$content) {
    instance.data.$content.find('.ecs-placeholder').css('color', pc);
  }

  if (typeof instance.data.syncStyles === 'function') {
    instance.data.syncStyles();
  }

  var things = [];
  if (properties.options_list && typeof properties.options_list.length === 'function') {
    try {
      var count = properties.options_list.length();
      things = properties.options_list.get(0, count);
    } catch (err) {
      if (err && err.message === 'not ready') throw err;
      console.warn('Extended Custom Select options_list read error:', err);
    }
  } else if (Array.isArray(properties.options_list)) {
    things = properties.options_list;
  }
  instance.data.things = things;

  if (
    !instance.data.hasInitializedDefaults &&
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

      if (!instance.data.allowMultiple && matched.length > 1) {
        matched = matched.slice(0, 1);
      }

      if (matched.length > 0) {
        instance.data.selectedThings = matched;
        if (typeof instance.data.renderTrigger === 'function') instance.data.renderTrigger();
        instance.publishState('value', matched);
        instance.publishState('value_count', matched.length);
      }
      instance.data.hasInitializedDefaults = true;
    }
  }

  if (typeof instance.data.updateValidation === 'function') {
    instance.data.updateValidation();
  }

  if (instance.data.isOpen && typeof instance.data.renderOptions === 'function') {
    instance.data.renderOptions(
      instance.data.$searchInput ? instance.data.$searchInput.val() : ''
    );
  }
}
