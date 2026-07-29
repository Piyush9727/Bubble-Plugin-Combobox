function(instance, properties, context) {
  const $input = instance.data.$input;
  const $wrapper = instance.data.$wrapper;
  const $list = instance.data.$list;

  // 1. Update text properties
  $input.attr('placeholder', properties.placeholder || 'Select option');
  instance.data.captionField = properties.caption_field;
  instance.data.noResultsText = properties.no_results_text || 'No options found';

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

  // 3. Inherit Font & Typography from instance.canvas / properties.bubble
  if (properties.bubble) {
    if (properties.bubble.font_family) {
      $wrapper.css('font-family', properties.bubble.font_family);
      $list.css('font-family', properties.bubble.font_family);
    }
    if (properties.bubble.font_size) {
      const fontSize = typeof properties.bubble.font_size === 'number' ? properties.bubble.font_size + 'px' : properties.bubble.font_size;
      $input.css('font-size', fontSize);
      $list.css('font-size', fontSize);
    }
    if (properties.bubble.font_color) {
      $input.css('color', properties.bubble.font_color);
    }
  }

  // 4. Re-render open dropdown if active
  if ($list.is(':visible')) {
    instance.data.renderList($input.val(), false);
  }
}