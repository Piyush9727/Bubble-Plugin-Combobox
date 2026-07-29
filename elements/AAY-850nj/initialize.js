function(instance, context) {
  const uid = 'ms-' + Math.random().toString(36).substring(2, 9);

  instance.data.uid = uid;
  instance.data.things = [];
  instance.data.captionField = null;
  instance.data.selectedThings = [];
  instance.data.activeIndex = -1;
  instance.data.filtered = [];
  instance.data.isOpen = false;
  instance.data.maxSelections = 0;
  instance.data.placeholder = 'Select options';
  instance.data.noResultsText = 'No options found';

  // ── Unique key helper ────────────────────────────────────────────────────
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

  // ── DOM Structure ────────────────────────────────────────────────────────
  const $container = $(`
    <div class="ms-wrapper">
      <div class="ms-tags-wrapper" id="${uid}-tags">
        <input type="text" class="ms-search-input" autocomplete="off" spellcheck="false"
          role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-multiselectable="true"
          aria-controls="${uid}-listbox" id="${uid}-input" />
      </div>
      <button type="button" class="ms-clear-all" tabindex="-1" aria-label="Clear all">&times;</button>
    </div>
  `).appendTo(instance.canvas);

  const $tagsWrapper = $container.find('.ms-tags-wrapper');
  const $searchInput = $container.find('.ms-search-input');
  const $clearAll    = $container.find('.ms-clear-all');

  const $list = $(`<ul class="ms-list" id="${uid}-listbox" role="listbox" aria-multiselectable="true"></ul>`)
    .appendTo('body');

  instance.data.$container   = $container;
  instance.data.$tagsWrapper = $tagsWrapper;
  instance.data.$searchInput = $searchInput;
  instance.data.$clearAll    = $clearAll;
  instance.data.$list        = $list;

  // ── Sync canvas font/color onto search input and list ────────────────────
  instance.data.syncFont = function() {
    if (!instance.canvas) return;
    const canvasEl = instance.canvas[0] || instance.canvas;
    const cs = window.getComputedStyle(canvasEl);
    $searchInput.css({
      fontFamily:  cs.fontFamily,
      fontSize:    cs.fontSize,
      fontWeight:  cs.fontWeight,
      fontStyle:   cs.fontStyle,
      color:       cs.color
    });
    $list.css({ fontFamily: cs.fontFamily, fontSize: cs.fontSize });
  };

  // ── Label extraction: Option Sets, custom types, primitives ─────────────
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
      if (item.name    !== undefined && item.name    !== null) return String(item.name);
      if (item.value   !== undefined && item.value   !== null) return String(item.value);
    }
    return String(item);
  };

  // ── Position floating dropdown aligned to outer canvas ───────────────────
  instance.data.positionList = function() {
    if (!instance.canvas) return;
    const canvasEl = instance.canvas[0] || instance.canvas;
    const rect = canvasEl.getBoundingClientRect();
    $list.css({
      top:        (rect.bottom + 4) + 'px',
      left:       rect.left + 'px',
      width:      rect.width + 'px',
      boxSizing:  'border-box'
    });
  };

  instance.data.open = function() {
    instance.data.isOpen = true;
    instance.data.positionList();
    $list.addClass('ms-list-open');
    $searchInput.attr('aria-expanded', 'true');
  };

  instance.data.close = function() {
    instance.data.isOpen = false;
    $list.removeClass('ms-list-open');
    $searchInput.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
    instance.data.activeIndex = -1;
  };

  // ── Render chips with smart overflow collapse ────────────────────────────
  instance.data.renderChips = function() {
    $tagsWrapper.find('.ms-chip, .ms-overflow-badge').remove();

    const selections = instance.data.selectedThings;

    if (selections.length === 0) {
      $searchInput.attr('placeholder', instance.data.placeholder || 'Select options');
      $clearAll.css('display', 'none');
      return;
    }

    $searchInput.attr('placeholder', '');
    $clearAll.css('display', '');

    // Render all chips before the search input
    const $chips = selections.map(function(t) {
      const label = instance.data.getItemLabel(t);
      const $chip = $('<span class="ms-chip">').append(
        $('<span class="ms-chip-label">').text(label),
        $('<button type="button" class="ms-chip-remove" tabindex="-1">\u00d7</button>')
          .on('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            instance.data.deselectItem(t);
          })
      );
      $chip.insertBefore($searchInput);
      return $chip;
    });

    // Measure which chips overflow the available horizontal space
    const wrapperRect  = $tagsWrapper[0].getBoundingClientRect();
    const clearWidth   = ($clearAll[0].offsetWidth || 24) + 8;
    const searchMin    = 60; // minimum px reserved for typing
    const cutoffX      = wrapperRect.right - clearWidth - searchMin;

    let firstHiddenIdx = -1;
    $chips.forEach(function($chip, i) {
      const chipRight = $chip[0].getBoundingClientRect().right;
      if (chipRight > cutoffX) {
        $chip.css('display', 'none');
        if (firstHiddenIdx === -1) firstHiddenIdx = i;
      }
    });

    if (firstHiddenIdx !== -1) {
      const hiddenCount = selections.length - firstHiddenIdx;
      $('<span class="ms-overflow-badge">').text('+' + hiddenCount).insertBefore($searchInput);
    }
  };

  // ── Toggle an item in/out of the selection ───────────────────────────────
  instance.data.toggleItem = function(t) {
    const key = instance.data.getKey(t);
    const idx = instance.data.selectedThings.findIndex(function(s) {
      return instance.data.getKey(s) === key;
    });

    if (idx >= 0) {
      instance.data.selectedThings.splice(idx, 1);
    } else {
      const max = instance.data.maxSelections;
      if (max && max > 0 && instance.data.selectedThings.length >= max) return;
      instance.data.selectedThings.push(t);
    }

    instance.data.renderChips();
    instance.publishState('value', instance.data.selectedThings);
    instance.publishState('value_count', instance.data.selectedThings.length);
    instance.triggerEvent('value_changed');
    // Keep dropdown open and re-render so checkmarks update
    instance.data.renderOptions($searchInput.val());
  };

  // ── Remove a single item (chip × button) ────────────────────────────────
  instance.data.deselectItem = function(t) {
    const key = instance.data.getKey(t);
    instance.data.selectedThings = instance.data.selectedThings.filter(function(s) {
      return instance.data.getKey(s) !== key;
    });
    instance.data.renderChips();
    instance.publishState('value', instance.data.selectedThings);
    instance.publishState('value_count', instance.data.selectedThings.length);
    instance.triggerEvent('value_changed');
    if (instance.data.isOpen) {
      instance.data.renderOptions($searchInput.val());
    }
  };

  // ── Clear all selections ─────────────────────────────────────────────────
  instance.data.clearAll = function() {
    instance.data.selectedThings = [];
    instance.data.renderChips();
    instance.publishState('value', []);
    instance.publishState('value_count', 0);
    instance.triggerEvent('value_changed');
    $searchInput.val('');
    instance.publishState('search_term', '');
    if (instance.data.isOpen) {
      instance.data.renderOptions('');
    }
    $searchInput.trigger('focus');
  };

  // ── Keyboard active item ─────────────────────────────────────────────────
  instance.data.setActive = function(idx) {
    const $items = $list.find('.ms-item');
    $items.removeClass('ms-item-active');
    instance.data.activeIndex = idx;
    if (idx >= 0 && idx < $items.length) {
      const $el = $items.eq(idx);
      $el.addClass('ms-item-active');
      $searchInput.attr('aria-activedescendant', $el.attr('id'));
      if ($el[0] && typeof $el[0].scrollIntoView === 'function') {
        $el[0].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // ── Render dropdown options ──────────────────────────────────────────────
  instance.data.renderOptions = function(query) {
    const things = instance.data.things || [];
    const q = (query || '').trim().toLowerCase();
    const filtered = q
      ? things.filter(function(t) {
          return instance.data.getItemLabel(t).toLowerCase().includes(q);
        })
      : things.slice();

    instance.data.filtered = filtered;
    $list.empty();

    if (filtered.length === 0) {
      $('<li class="ms-empty">').text(instance.data.noResultsText || 'No options found').appendTo($list);
      instance.data.open();
      return;
    }

    filtered.forEach(function(t, i) {
      const label = instance.data.getItemLabel(t);
      const key = instance.data.getKey(t);
      const isSelected = instance.data.selectedThings.some(function(s) {
        return instance.data.getKey(s) === key;
      });

      const $item = $('<li>')
        .attr({
          id: uid + '-opt-' + i,
          role: 'option',
          'aria-selected': isSelected ? 'true' : 'false'
        })
        .addClass('ms-item')
        .toggleClass('ms-item-selected', isSelected);

      $('<span class="ms-check">').text(isSelected ? '\u2713' : '').appendTo($item);
      $('<span class="ms-item-label">').text(label).appendTo($item);

      $item.on('mousedown', function(e) { e.preventDefault(); instance.data.toggleItem(t); });
      $item.on('mouseenter', function() { instance.data.setActive(i); });
      $item.appendTo($list);
    });

    instance.data.open();
    // Highlight first selected, or first item
    const firstSelectedIdx = filtered.findIndex(function(t) {
      return instance.data.selectedThings.some(function(s) {
        return instance.data.getKey(s) === instance.data.getKey(t);
      });
    });
    instance.data.setActive(firstSelectedIdx >= 0 ? firstSelectedIdx : 0);
  };

  // ── Events ───────────────────────────────────────────────────────────────
  $searchInput.on('focus', function() {
    instance.data.syncFont();
    instance.data.renderOptions($searchInput.val());
  });

  $searchInput.on('click', function() {
    if (!instance.data.isOpen) {
      instance.data.syncFont();
      instance.data.renderOptions($searchInput.val());
    }
  });

  $searchInput.on('input', function() {
    const val = $(this).val();
    instance.publishState('search_term', val);
    instance.data.renderOptions(val);
  });

  $searchInput.on('keydown', function(e) {
    if (!instance.data.isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      instance.data.renderOptions($searchInput.val());
      return;
    }
    const max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      instance.data.setActive(Math.min(instance.data.activeIndex + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      instance.data.setActive(Math.max(instance.data.activeIndex - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const idx = instance.data.activeIndex;
      if (idx >= 0 && instance.data.filtered[idx]) {
        instance.data.toggleItem(instance.data.filtered[idx]);
      }
    } else if (e.key === 'Escape') {
      instance.data.close();
      $searchInput.blur();
    } else if (e.key === 'Backspace' && $searchInput.val() === '') {
      // Backspace with empty input removes the last chip
      if (instance.data.selectedThings.length > 0) {
        instance.data.deselectItem(
          instance.data.selectedThings[instance.data.selectedThings.length - 1]
        );
      }
    }
  });

  $searchInput.on('blur', function() {
    setTimeout(function() {
      instance.data.close();
      $searchInput.val('');
      instance.publishState('search_term', '');
    }, 120);
  });

  $clearAll.on('mousedown', function(e) { e.preventDefault(); instance.data.clearAll(); });
  $clearAll.css('display', 'none');

  // Reposition on scroll/resize; recalculate chip overflow on resize
  $(window).on('scroll.' + uid + ' resize.' + uid, function() {
    if (instance.data.isOpen) instance.data.positionList();
    instance.data.renderChips();
  });

  $(document).on('click.' + uid, function(e) {
    if (!$container[0].contains(e.target) && !$list[0].contains(e.target)) {
      instance.data.close();
    }
  });
}