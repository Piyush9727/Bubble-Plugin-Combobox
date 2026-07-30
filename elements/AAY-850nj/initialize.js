function(instance, context) {
  var uid = 'ms-' + Math.random().toString(36).substring(2, 9);

  // ── State ──────────────────────────────────────────────────────────────
  instance.data.uid            = uid;
  instance.data.things         = [];
  instance.data.captionField   = null;
  instance.data.selectedThings = [];
  instance.data.activeIndex    = -1;
  instance.data.filtered       = [];
  instance.data.isOpen         = false;
  instance.data.maxSelections  = 0;
  instance.data.placeholder    = 'Select options';
  instance.data.noResultsText  = 'No options found';

  // ── Key helper ──────────────────────────────────────────────────────────
  instance.data.getKey = function(t) {
    if (t === null || t === undefined) return null;
    try {
      if (typeof t.get === 'function') {
        var id = t.get('_id');
        if (id !== undefined && id !== null) return 'id:' + String(id);
      }
    } catch (e) { /* ignore */ }
    return 'label:' + String(instance.data.getItemLabel(t));
  };

  // ── Label extraction: Option Sets, custom types, primitives ─────────────
  instance.data.getItemLabel = function(item) {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (typeof item === 'object') {
      if (typeof item.get === 'function') {
        var field = instance.data.captionField;
        if (field) {
          try {
            var fv = item.get(field);
            if (fv !== null && fv !== undefined && String(fv).trim() !== '') return String(fv);
          } catch (e) { /* ignore */ }
        }
        try {
          var dv = item.get('display');
          if (dv !== null && dv !== undefined && String(dv).trim() !== '') return String(dv);
        } catch (e) { /* ignore */ }
        try {
          var nv = item.get('name') || item.get('_id');
          if (nv !== null && nv !== undefined && String(nv).trim() !== '') return String(nv);
        } catch (e) { /* ignore */ }
      }
      if (item.display !== undefined && item.display !== null) return String(item.display);
      if (item.name    !== undefined && item.name    !== null) return String(item.name);
      if (item.value   !== undefined && item.value   !== null) return String(item.value);
    }
    return String(item);
  };

  // ── DOM: Trigger ─────────────────────────────────────────────────────────
  var $wrapper = $([
    '<div class="ms-wrapper" tabindex="0" role="combobox"',
    ' aria-haspopup="listbox" aria-expanded="false" aria-owns="' + uid + '-dropdown">',
    '  <div class="ms-tags-wrapper"></div>',
    '  <button type="button" class="ms-clear-all" tabindex="-1" aria-label="Clear all">&times;</button>',
    '  <button type="button" class="ms-toggle" tabindex="-1" aria-label="Toggle options">',
    '    <svg viewBox="0 0 20 20" aria-hidden="true">',
    '      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>',
    '    </svg>',
    '  </button>',
    '</div>'
  ].join('')).appendTo(instance.canvas);

  var $tagsWrapper = $wrapper.find('.ms-tags-wrapper');
  var $clearAll    = $wrapper.find('.ms-clear-all');
  var $toggle      = $wrapper.find('.ms-toggle');

  // ── DOM: Floating Dropdown Panel ─────────────────────────────────────────
  var $dropdown = $([
    '<div class="ms-dropdown" id="' + uid + '-dropdown">',
    '  <div class="ms-search-bar">',
    '    <span class="ms-search-icon" aria-hidden="true">',
    '      <svg viewBox="0 0 20 20">',
    '        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>',
    '      </svg>',
    '    </span>',
    '    <input type="text" class="ms-search-input" id="' + uid + '-search"',
    '      role="searchbox" aria-label="Search options"',
    '      autocomplete="off" spellcheck="false" />',
    '  </div>',
    '  <ul class="ms-list" id="' + uid + '-listbox" role="listbox" aria-multiselectable="true"></ul>',
    '</div>'
  ].join('')).appendTo('body');

  var $searchInput = $dropdown.find('.ms-search-input');
  var $list        = $dropdown.find('.ms-list');

  // Scoped <style> tag for ::placeholder color (can't be set via jQuery .css())
  var $scopedStyle = $('<style>').attr('id', uid + '-pstyle').appendTo('head');

  instance.data.$wrapper      = $wrapper;
  instance.data.$tagsWrapper  = $tagsWrapper;
  instance.data.$clearAll     = $clearAll;
  instance.data.$toggle       = $toggle;
  instance.data.$dropdown     = $dropdown;
  instance.data.$searchInput  = $searchInput;
  instance.data.$list         = $list;
  instance.data.$scopedStyle  = $scopedStyle;

  // ── Sync canvas background + font into dropdown panel ───────────────────
  instance.data.syncStyles = function() {
    if (!instance.canvas) return;
    var canvasEl = instance.canvas[0] || instance.canvas;
    var cs = window.getComputedStyle(canvasEl);

    var bg    = cs.backgroundColor;
    var color = cs.color;
    var ff    = cs.fontFamily;
    var fs    = cs.fontSize;
    var fw    = cs.fontWeight;
    var fi    = cs.fontStyle;

    // Transparent canvas → default to white so dropdown is always readable
    var isTransparent = (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)');
    var dropdownBg = isTransparent ? '#ffffff' : bg;

    $searchInput.css({ fontFamily: ff, fontSize: fs, fontWeight: fw, fontStyle: fi, color: color });
    $dropdown.css({ backgroundColor: dropdownBg, color: color, fontFamily: ff, fontSize: fs });
  };

  // ── Chip factory ─────────────────────────────────────────────────────────
  instance.data.makeChip = function(t) {
    var label = instance.data.getItemLabel(t);
    return $('<span class="ms-chip">').append(
      $('<span class="ms-chip-label">').text(label),
      $('<button type="button" class="ms-chip-remove" tabindex="-1" aria-label="Remove">\u00d7</button>')
        .on('mousedown', function(e) {
          e.preventDefault();
          e.stopPropagation();
          instance.data.deselectItem(t);
        })
    );
  };

  // ── Render chips with first-chip priority overflow ───────────────────────
  instance.data.renderChips = function() {
    $tagsWrapper.empty();
    var selections = instance.data.selectedThings;

    if (selections.length === 0) {
      $('<span class="ms-placeholder">').text(instance.data.placeholder || 'Select options').appendTo($tagsWrapper);
      $clearAll.css('display', 'none');
      return;
    }
    $clearAll.css('display', '');

    var BADGE_W = 44;  // estimated "+N" badge width in px
    var GAP     = 4;   // gap between chips in px
    // Total available width (subtract clear + toggle + small padding)
    var avail = Math.max($tagsWrapper[0].clientWidth - 56, 80);

    // Step 1 — measure each chip's natural width off-screen
    var widths = selections.map(function(t) {
      var $tmp = instance.data.makeChip(t)
        .css({ position: 'absolute', visibility: 'hidden', left: '-9999px', top: '-9999px', maxWidth: 'none' })
        .appendTo('body');
      var w = $tmp[0].offsetWidth;
      $tmp.remove();
      return w;
    });

    // Step 2 — greedy fit: first chip always shown, rest fit if they can
    var visible = 0;
    var used    = 0;
    for (var i = 0; i < widths.length; i++) {
      var chipW     = widths[i];
      var moreAfter = widths.length - i - 1;
      // Reserve badge space when subsequent items exist
      var budgetHere = avail - (moreAfter > 0 ? BADGE_W + GAP : 0);

      if (i === 0) {
        // First chip always gets a slot (capped to budget)
        visible = 1;
        used = Math.min(chipW, budgetHere) + GAP;
      } else if (used + chipW <= budgetHere) {
        visible++;
        used += chipW + GAP;
      } else {
        break;
      }
    }

    // Step 3 — render visible chips
    var hiddenCount = selections.length - visible;
    for (var j = 0; j < visible; j++) {
      var $chip = instance.data.makeChip(selections[j]);
      if (j === 0 && hiddenCount > 0) {
        // Cap first chip width so badge has room
        var firstBudget = avail - BADGE_W - GAP;
        $chip.css('max-width', Math.max(firstBudget, 60) + 'px');
      }
      $chip.appendTo($tagsWrapper);
    }

    // Step 4 — overflow badge
    if (hiddenCount > 0) {
      $('<span class="ms-overflow-badge">').text('+' + hiddenCount).appendTo($tagsWrapper);
    }
  };

  // ── Position dropdown aligned to canvas outer box ────────────────────────
  instance.data.positionDropdown = function() {
    if (!instance.canvas) return;
    var canvasEl = instance.canvas[0] || instance.canvas;
    var rect = canvasEl.getBoundingClientRect();
    $dropdown.css({
      top:       (rect.bottom + 4) + 'px',
      left:      rect.left + 'px',
      width:     rect.width + 'px',
      boxSizing: 'border-box'
    });
  };

  // ── Open / Close ──────────────────────────────────────────────────────────
  instance.data.open = function() {
    instance.data.syncStyles();
    instance.data.positionDropdown();
    instance.data.isOpen = true;
    $dropdown.addClass('ms-dropdown-open');
    $wrapper.attr('aria-expanded', 'true');
    // Clear search and populate full list, then focus search bar
    $searchInput.val('');
    instance.publishState('search_term', '');
    instance.data.renderOptions('');
    setTimeout(function() { $searchInput.trigger('focus'); }, 0);
  };

  instance.data.close = function() {
    instance.data.isOpen = false;
    $dropdown.removeClass('ms-dropdown-open');
    $wrapper.attr('aria-expanded', 'false');
    $searchInput.val('');
    instance.publishState('search_term', '');
    instance.data.activeIndex = -1;
  };

  // ── Keyboard active item ──────────────────────────────────────────────────
  instance.data.setActive = function(idx) {
    var $items = $list.find('.ms-item');
    $items.removeClass('ms-item-active');
    instance.data.activeIndex = idx;
    if (idx >= 0 && idx < $items.length) {
      var $el = $items.eq(idx);
      $el.addClass('ms-item-active');
      if ($el[0] && typeof $el[0].scrollIntoView === 'function') {
        $el[0].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // ── Toggle item in / out of selection ────────────────────────────────────
  instance.data.toggleItem = function(t) {
    var key = instance.data.getKey(t);
    var idx = instance.data.selectedThings.findIndex(function(s) { return instance.data.getKey(s) === key; });
    if (idx >= 0) {
      instance.data.selectedThings.splice(idx, 1);
    } else {
      var max = instance.data.maxSelections;
      if (max && max > 0 && instance.data.selectedThings.length >= max) return;
      instance.data.selectedThings.push(t);
    }
    instance.data.renderChips();
    instance.publishState('value', instance.data.selectedThings);
    instance.publishState('value_count', instance.data.selectedThings.length);
    instance.triggerEvent('value_changed');
    // Keep dropdown open — re-render options with updated checkmarks
    instance.data.renderOptions($searchInput.val());
  };

  // ── Remove single item (chip × button) ───────────────────────────────────
  instance.data.deselectItem = function(t) {
    var key = instance.data.getKey(t);
    instance.data.selectedThings = instance.data.selectedThings.filter(function(s) {
      return instance.data.getKey(s) !== key;
    });
    instance.data.renderChips();
    instance.publishState('value', instance.data.selectedThings);
    instance.publishState('value_count', instance.data.selectedThings.length);
    instance.triggerEvent('value_changed');
    if (instance.data.isOpen) instance.data.renderOptions($searchInput.val());
  };

  // ── Clear all selections ──────────────────────────────────────────────────
  instance.data.clearAll = function() {
    instance.data.selectedThings = [];
    instance.data.renderChips();
    instance.publishState('value', []);
    instance.publishState('value_count', 0);
    instance.triggerEvent('value_changed');
    instance.publishState('search_term', '');
    if (instance.data.isOpen) {
      $searchInput.val('');
      instance.data.renderOptions('');
    }
    $wrapper.trigger('focus');
  };

  // ── Render dropdown options ───────────────────────────────────────────────
  instance.data.renderOptions = function(query) {
    var things = instance.data.things || [];
    var q = (query || '').trim().toLowerCase();
    var filtered = q
      ? things.filter(function(t) { return instance.data.getItemLabel(t).toLowerCase().includes(q); })
      : things.slice();

    instance.data.filtered = filtered;
    $list.empty();

    if (filtered.length === 0) {
      $('<li class="ms-empty">').text(instance.data.noResultsText || 'No options found').appendTo($list);
      return;
    }

    filtered.forEach(function(t, i) {
      var label      = instance.data.getItemLabel(t);
      var key        = instance.data.getKey(t);
      var isSelected = instance.data.selectedThings.some(function(s) { return instance.data.getKey(s) === key; });

      var $item = $('<li>')
        .attr({ id: uid + '-opt-' + i, role: 'option', 'aria-selected': isSelected ? 'true' : 'false' })
        .addClass('ms-item')
        .toggleClass('ms-item-selected', isSelected);

      $('<span class="ms-check">').text(isSelected ? '\u2713' : '').appendTo($item);
      $('<span class="ms-item-label">').text(label).appendTo($item);

      $item.on('mousedown', function(e) { e.preventDefault(); instance.data.toggleItem(t); });
      $item.on('mouseenter', function() { instance.data.setActive(i); });
      $item.appendTo($list);
    });

    // Highlight first selected item, or first item
    var firstSelIdx = filtered.findIndex(function(t) {
      return instance.data.selectedThings.some(function(s) { return instance.data.getKey(s) === instance.data.getKey(t); });
    });
    instance.data.setActive(firstSelIdx >= 0 ? firstSelIdx : 0);
  };

  // ── Events: Trigger wrapper ───────────────────────────────────────────────
  $wrapper.on('click', function(e) {
    // Let clear-all and chip remove buttons handle their own clicks
    if ($clearAll[0] && $clearAll[0].contains(e.target)) return;
    if ($(e.target).hasClass('ms-chip-remove') || $(e.target).closest('.ms-chip-remove').length) return;
    if (instance.data.isOpen) instance.data.close();
    else instance.data.open();
  });

  $wrapper.on('keydown', function(e) {
    if (!instance.data.isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        instance.data.open();
      }
    } else if (e.key === 'Escape') {
      instance.data.close();
    }
  });

  $clearAll.on('mousedown', function(e) { e.preventDefault(); instance.data.clearAll(); });
  $clearAll.css('display', 'none');

  // ── Events: Search input ──────────────────────────────────────────────────
  $searchInput.on('input', function() {
    var val = $(this).val();
    instance.publishState('search_term', val);
    instance.data.renderOptions(val);
  });

  $searchInput.on('keydown', function(e) {
    var max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      instance.data.setActive(Math.min(instance.data.activeIndex + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      instance.data.setActive(Math.max(instance.data.activeIndex - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      var idx = instance.data.activeIndex;
      if (idx >= 0 && instance.data.filtered[idx]) {
        instance.data.toggleItem(instance.data.filtered[idx]);
      }
    } else if (e.key === 'Escape') {
      instance.data.close();
      $wrapper.trigger('focus');
    }
  });

  $searchInput.on('blur', function() {
    setTimeout(function() {
      var active = document.activeElement;
      var inDropdown = $dropdown[0] && $dropdown[0].contains(active);
      var inWrapper  = $wrapper[0]  && $wrapper[0].contains(active);
      if (!inDropdown && !inWrapper) instance.data.close();
    }, 150);
  });

  // ── Outside click ─────────────────────────────────────────────────────────
  $(document).on('click.' + uid, function(e) {
    var inWrapper  = $wrapper[0]  && $wrapper[0].contains(e.target);
    var inDropdown = $dropdown[0] && $dropdown[0].contains(e.target);
    if (!inWrapper && !inDropdown) instance.data.close();
  });

  // ── Reposition + recalculate chip overflow on scroll/resize ───────────────
  $(window).on('scroll.' + uid + ' resize.' + uid, function() {
    if (instance.data.isOpen) instance.data.positionDropdown();
    instance.data.renderChips();
  });

  // Initial render — populate placeholder on first load
  instance.data.renderChips();
}