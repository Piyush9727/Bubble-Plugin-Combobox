function(instance, context) {
  const uid = 'cb-' + Math.random().toString(36).substring(2, 9);

  instance.data.uid = uid;
  instance.data.things = [];
  instance.data.captionField = null;
  instance.data.selectedThing = null;
  instance.data.activeIndex = -1;
  instance.data.filtered = [];
  instance.data.isOpen = false;

  // Unique key helper — never rely on _id alone (option sets don't have one)
  instance.data.getKey = function(t) {
    if (!t) return null;
    try {
      const id = t.get('_id');
      if (id !== undefined && id !== null) return 'id:' + String(id);
    } catch (e) { /* fall through */ }
    return 'label:' + String(t.get(instance.data.captionField));
  };

  const $container = $(`
    <div class="cb-wrapper">
      <input type="text" class="cb-input" autocomplete="off" spellcheck="false"
        role="combobox" aria-autocomplete="list" aria-expanded="false"
        aria-controls="${uid}-listbox" id="${uid}-input" />
      <button type="button" class="cb-clear" tabindex="-1" aria-label="Clear">&times;</button>
    </div>
  `).appendTo(instance.canvas);

  const $input = $container.find('.cb-input');
  const $clear = $container.find('.cb-clear');

  const $list = $(`<ul class="cb-list" id="${uid}-listbox" role="listbox"></ul>`)
    .appendTo('body');

  instance.data.$container = $container;
  instance.data.$input = $input;
  instance.data.$clear = $clear;
  instance.data.$list = $list;

  // Copy font from canvas (populated by Bubble's "Font style" property) onto our input
  instance.data.syncFont = function() {
    const cs = window.getComputedStyle(instance.canvas);
    $input.css({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color
    });
    $list.css({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize
    });
  };

  // Helper to extract display label from option (supports Bubble Thing objects & primitive strings)
  instance.data.getItemLabel = function(item) {
    if (item === null || item === undefined) return '';
    if (typeof item === 'object' && typeof item.get === 'function') {
      const field = instance.data.captionField;
      if (field) {
        const val = item.get(field);
        return val !== null && val !== undefined ? String(val) : '';
      }
      return String(item);
    }
    return String(item);
  };

  // Helper to extract unique ID from option
  instance.data.getItemId = function(item) {
    if (item === null || item === undefined) return '';
    if (typeof item === 'object' && typeof item.get === 'function') {
      const id = item.get('_id');
      if (id) return String(id);
    }
    return String(item);
  };

  // Calculate position & viewport bounds (flip dropdown above if needed)
  instance.data.positionList = function() {
    const rect = $input[0].getBoundingClientRect();
    $list.css({ top: rect.bottom + 4 + 'px', left: rect.left + 'px', width: rect.width + 'px' });
  };

  instance.data.open = function() {
    instance.data.isOpen = true;
    instance.data.positionList();
    $list.addClass('cb-list-open');
    $input.attr('aria-expanded', 'true');
  };

  instance.data.close = function() {
    instance.data.isOpen = false;
    $list.removeClass('cb-list-open');
    $input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
    instance.data.activeIndex = -1;
  };

  instance.data.setActive = function(idx) {
    const $items = $list.find('.cb-item');
    $items.removeClass('cb-item-active');
    instance.data.activeIndex = idx;
    if (idx >= 0 && idx < $items.length) {
      const $el = $items.eq(idx);
      $el.addClass('cb-item-active');
      $input.attr('aria-activedescendant', $el.attr('id'));
      $el[0].scrollIntoView({ block: 'nearest' });
    }
  };

  instance.data.selectItem = function(t) {
    const label = instance.data.getItemLabel(t);
    $input.val(label);
    instance.data.selectedThing = t;
    $clear.toggle(true);
    instance.publishState('value', t);
    instance.triggerEvent('value_changed');
    instance.data.close();
  };

  instance.data.clearSelection = function() {
    $input.val('');
    instance.data.selectedThing = null;
    $clear.toggle(false);
    instance.publishState('value', null);
    instance.triggerEvent('value_changed');
    instance.data.renderOptions('');
    $input.trigger('focus');
  };

  // Single source of truth for rendering the option list
  instance.data.renderOptions = function(query) {
    const things = instance.data.things || [];

    const q = (query || '').toLowerCase();
    const filtered = q
      ? things.filter(t => instance.data.getItemLabel(t).toLowerCase().includes(q))
      : things.slice();

    instance.data.filtered = filtered;
    $list.empty();

    if (filtered.length === 0) {
      $('<li class="cb-empty">No results</li>').appendTo($list);
      instance.data.open();
      return;
    }

    const selectedKey = instance.data.getKey(instance.data.selectedThing);
    let preselectIdx = -1;

    filtered.forEach((t, i) => {
      const label = instance.data.getItemLabel(t);
      const isSelected = selectedKey !== null && instance.data.getKey(t) === selectedKey;
      if (isSelected) preselectIdx = i;

      const $item = $('<li>')
        .attr({
          id: `${uid}-opt-${i}`,
          role: 'option',
          'aria-selected': isSelected ? 'true' : 'false'
        })
        .addClass('cb-item')
        .toggleClass('cb-item-selected', isSelected);

      $('<span class="cb-check">').text(isSelected ? '✓' : '').appendTo($item);
      $('<span class="cb-label">').text(label).appendTo($item);

      $item.on('mousedown', e => { e.preventDefault(); instance.data.selectItem(t); });
      $item.on('mouseenter', () => instance.data.setActive(i));
      $item.appendTo($list);
    });

    instance.data.open();
    instance.data.setActive(preselectIdx);
  };

  // --- Events ---
  $input.on('focus', function() {
    instance.data.renderOptions(''); // always show full list on focus
  });

  $input.on('input', function() {
    const val = $(this).val();
    instance.publishState('search_term', val);
    if (!val) { instance.data.selectedThing = null; $clear.toggle(false); instance.publishState('value', null); }
    instance.data.renderOptions(val);
  });

  $input.on('keydown', function(e) {
    if (!instance.data.isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      instance.data.renderOptions($input.val() === (instance.data.selectedThing && instance.data.getItemLabel(instance.data.selectedThing)) ? '' : $input.val());
      return;
    }
    const max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); instance.data.setActive(Math.min(instance.data.activeIndex + 1, max)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); instance.data.setActive(Math.max(instance.data.activeIndex - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = instance.data.activeIndex;
      if (idx >= 0 && instance.data.filtered[idx]) instance.data.selectItem(instance.data.filtered[idx]);
    } else if (e.key === 'Escape') { instance.data.close(); }
  });

  $input.on('blur', function() {
    setTimeout(() => { instance.data.close(); }, 120);
  });

  $clear.on('mousedown', function(e) { e.preventDefault(); instance.data.clearSelection(); });
  $clear.toggle(false);

  $(window).on('scroll.' + uid + ' resize.' + uid, () => {
    if (instance.data.isOpen) instance.data.positionList();
  });

  $(document).on('click.' + uid, function(e) {
    if (!$container[0].contains(e.target) && !$list[0].contains(e.target)) {
      instance.data.close();
    }
  });
}