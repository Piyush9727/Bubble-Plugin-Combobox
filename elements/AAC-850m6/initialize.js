function(instance, context) {
  const uid = 'cb-' + Math.random().toString(36).substring(2, 9);

  instance.data.uid = uid;
  instance.data.things = [];
  instance.data.captionField = null;
  instance.data.selectedThing = null;
  instance.data.activeIndex = -1;
  instance.data.filtered = [];
  instance.data.isOpen = false;

  // Unique key helper
  instance.data.getKey = function(t) {
    if (t === null || t === undefined) return null;
    try {
      if (typeof t.get === 'function') {
        const id = t.get('_id');
        if (id !== undefined && id !== null) return 'id:' + String(id);
      }
    } catch (e) { /* ignore */ }
    return 'label:' + String(instance.data.getItemLabel(t));
  };

  const $container = $(`
    <div class="cb-wrapper">
      <input type="text" class="cb-input" autocomplete="off" spellcheck="false"
        role="combobox" aria-autocomplete="list" aria-expanded="false"
        aria-controls="${uid}-listbox" id="${uid}-input" />
      <button type="button" class="cb-clear" tabindex="-1" aria-label="Clear" style="right:4px;">&times;</button>
    </div>
  `).appendTo(instance.canvas);

  const $input = $container.find('.cb-input');
  const $clear = $container.find('.cb-clear');

  const $list = $(`<ul class="cb-list" id="${uid}-listbox" role="listbox"></ul>`).appendTo('body');

  instance.data.$container = $container;
  instance.data.$input = $input;
  instance.data.$clear = $clear;
  instance.data.$list = $list;

  // Sync canvas style settings from Bubble's Property Editor onto $input and $list
  instance.data.syncFont = function() {
    if (!instance.canvas) return;
    const canvasEl = instance.canvas[0] || instance.canvas;
    const cs = window.getComputedStyle(canvasEl);

    $input.css({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      color: cs.color,
      textAlign: cs.textAlign
    });

    $list.css({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize
    });
  };

  // Robust label extraction for custom data types, Option Sets, strings, numbers
  instance.data.getItemLabel = function(item) {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);

    if (typeof item === 'object') {
      if (typeof item.get === 'function') {
        const field = instance.data.captionField;
        if (field) {
          try {
            const val = item.get(field);
            if (val !== null && val !== undefined && String(val).trim() !== '') return String(val);
          } catch (e) { /* ignore */ }
        }
        try {
          const display = item.get('display');
          if (display !== null && display !== undefined && String(display).trim() !== '') return String(display);
        } catch (e) { /* ignore */ }

        try {
          const name = item.get('name') || item.get('_id');
          if (name !== null && name !== undefined && String(name).trim() !== '') return String(name);
        } catch (e) { /* ignore */ }
      }

      if (item.display !== undefined && item.display !== null) return String(item.display);
      if (item.name !== undefined && item.name !== null) return String(item.name);
      if (item.value !== undefined && item.value !== null) return String(item.value);
    }

    return String(item);
  };

  // Calculate floating listbox position relative to outer canvas box
  instance.data.positionList = function() {
    if (!instance.canvas) return;
    const canvasEl = instance.canvas[0] || instance.canvas;
    const canvasRect = canvasEl.getBoundingClientRect();

    $list.css({
      top: (canvasRect.bottom + 4) + 'px',
      left: canvasRect.left + 'px',
      width: canvasRect.width + 'px',
      boxSizing: 'border-box'
    });
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
      if ($el[0] && typeof $el[0].scrollIntoView === 'function') {
        $el[0].scrollIntoView({ block: 'nearest' });
      }
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
    instance.publishState('search_term', '');
    instance.triggerEvent('value_changed');
    instance.data.renderOptions('');
    $input.trigger('focus');
  };

  // Single source of truth for rendering the option list
  instance.data.renderOptions = function(query) {
    const things = instance.data.things || [];

    const q = (query || '').trim().toLowerCase();
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
    instance.data.setActive(preselectIdx >= 0 ? preselectIdx : 0);
  };

  // --- Events ---
  $input.on('focus', function() {
    instance.data.syncFont();
    instance.data.renderOptions('');
  });

  $input.on('click', function() {
    if (!instance.data.isOpen) {
      instance.data.syncFont();
      instance.data.renderOptions('');
    }
  });

  $input.on('input', function() {
    const val = $(this).val();
    instance.publishState('search_term', val);
    if (!val) {
      instance.data.selectedThing = null;
      $clear.toggle(false);
      instance.publishState('value', null);
    }
    instance.data.renderOptions(val);
  });

  $input.on('keydown', function(e) {
    if (!instance.data.isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      instance.data.renderOptions($input.val() === (instance.data.selectedThing && instance.data.getItemLabel(instance.data.selectedThing)) ? '' : $input.val());
      return;
    }
    const max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      instance.data.setActive(Math.min(instance.data.activeIndex + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      instance.data.setActive(Math.max(instance.data.activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = instance.data.activeIndex;
      if (idx >= 0 && instance.data.filtered[idx]) {
        instance.data.selectItem(instance.data.filtered[idx]);
      }
    } else if (e.key === 'Escape') {
      instance.data.close();
    }
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