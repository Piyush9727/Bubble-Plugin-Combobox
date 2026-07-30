function(instance, context) {
  var uid = 'ecs-' + Math.random().toString(36).substring(2, 9);

  instance.data.uid            = uid;
  instance.data.things         = [];
  instance.data.captionField   = null;
  instance.data.avatarField    = null;
  instance.data.selectedThings = [];
  instance.data.activeIndex    = -1;
  instance.data.filtered       = [];
  instance.data.isOpen         = false;
  instance.data.allowMultiple  = false;
  instance.data.maxSelections  = 0;
  instance.data.isRequired             = false;
  instance.data.hasInitializedDefaults = false;
  instance.data.placeholder            = 'Select options';
  instance.data.noResultsText          = 'No options found';

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

  instance.data.getItemAvatar = function(item) {
    if (item === null || item === undefined) return null;
    var field = instance.data.avatarField;
    if (!field) return null;

    if (typeof item === 'object' && typeof item.get === 'function') {
      try {
        var val = item.get(field);
        if (val !== null && val !== undefined && String(val).trim() !== '') return String(val);
      } catch (e) { /* ignore */ }
    }

    if (typeof item === 'object' && item[field] !== undefined && item[field] !== null) {
      var raw = item[field];
      if (String(raw).trim() !== '') return String(raw);
    }

    return null;
  };

  instance.data.makeAvatarEl = function(url, sizeClass) {
    var $avatar = $('<span>').addClass('ecs-avatar ' + (sizeClass || 'ecs-avatar-sm'));
    if (url) {
      $('<img>').attr({ src: url, alt: '' }).on('error', function() {
        $(this).remove();
        $avatar.addClass('ecs-avatar-empty');
      }).appendTo($avatar);
    } else {
      $avatar.addClass('ecs-avatar-empty');
    }
    return $avatar;
  };

  instance.data.updateValidation = function() {
    var isReq = !!instance.data.isRequired;
    var hasVal = Array.isArray(instance.data.selectedThings) && instance.data.selectedThings.length > 0;
    var isValid = isReq ? hasVal : true;
    instance.publishState('is_valid', isValid);
    return isValid;
  };

  instance.data.publishSelection = function() {
    var selections = instance.data.selectedThings || [];
    instance.publishState('value', selections);
    instance.publishState('value_count', selections.length);
  };

  var $wrapper = $([
    '<div class="ecs-wrapper" tabindex="0" role="combobox"',
    ' aria-haspopup="listbox" aria-expanded="false" aria-owns="' + uid + '-dropdown">',
    '  <div class="ecs-content"></div>',
    '  <button type="button" class="ecs-clear-all" tabindex="-1" aria-label="Clear all">&times;</button>',
    '  <button type="button" class="ecs-toggle" tabindex="-1" aria-label="Toggle options">',
    '    <svg viewBox="0 0 20 20" aria-hidden="true">',
    '      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>',
    '    </svg>',
    '  </button>',
    '</div>'
  ].join('')).appendTo(instance.canvas);

  if (instance.canvas && typeof instance.canvas.css === 'function') {
    instance.canvas.css({ display: 'flex', alignItems: 'center' });
  }

  var $content   = $wrapper.find('.ecs-content');
  var $clearAll  = $wrapper.find('.ecs-clear-all');
  var $toggle    = $wrapper.find('.ecs-toggle');

  var $dropdown = $([
    '<div class="ecs-dropdown" id="' + uid + '-dropdown">',
    '  <div class="ecs-search-bar">',
    '    <span class="ecs-search-icon" aria-hidden="true">',
    '      <svg viewBox="0 0 20 20">',
    '        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>',
    '      </svg>',
    '    </span>',
    '    <input type="text" class="ecs-search-input" id="' + uid + '-search"',
    '      role="searchbox" aria-label="Search options"',
    '      autocomplete="off" spellcheck="false" />',
    '  </div>',
    '  <ul class="ecs-list" id="' + uid + '-listbox" role="listbox"></ul>',
    '</div>'
  ].join('')).appendTo('body');

  var $searchInput = $dropdown.find('.ecs-search-input');
  var $list        = $dropdown.find('.ecs-list');
  var $scopedStyle = $('<style>').attr('id', uid + '-pstyle').appendTo('head');

  instance.data.$wrapper     = $wrapper;
  instance.data.$content     = $content;
  instance.data.$clearAll    = $clearAll;
  instance.data.$toggle      = $toggle;
  instance.data.$dropdown    = $dropdown;
  instance.data.$searchInput   = $searchInput;
  instance.data.$list        = $list;
  instance.data.$scopedStyle = $scopedStyle;

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

    var isTransparent = (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)');
    var dropdownBg = isTransparent ? '#ffffff' : bg;

    $searchInput.css({ fontFamily: ff, fontSize: fs, fontWeight: fw, fontStyle: fi, color: color });
    $dropdown.css({ backgroundColor: dropdownBg, color: color, fontFamily: ff, fontSize: fs });
  };

  instance.data.makeChip = function(t) {
    var label = instance.data.getItemLabel(t);
    var avatar = instance.data.getItemAvatar(t);
    var $chip = $('<span class="ecs-chip">');

    instance.data.makeAvatarEl(avatar).appendTo($chip);
    $('<span class="ecs-chip-label">').text(label).appendTo($chip);
    $('<button type="button" class="ecs-chip-remove" tabindex="-1" aria-label="Remove">\u00d7</button>')
      .on('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        instance.data.deselectItem(t);
      })
      .appendTo($chip);

    return $chip;
  };

  instance.data.renderSingleDisplay = function() {
    $content.empty().addClass('ecs-single-display').removeClass('ecs-tags-wrapper');
    var selections = instance.data.selectedThings;

    if (selections.length === 0) {
      $('<span class="ecs-placeholder">').text(instance.data.placeholder || 'Select option').appendTo($content);
      $clearAll.css('display', 'none');
      return;
    }

    $clearAll.css('display', '');
    var t = selections[0];
    instance.data.makeAvatarEl(instance.data.getItemAvatar(t)).appendTo($content);
    $('<span class="ecs-trigger-label">').text(instance.data.getItemLabel(t)).appendTo($content);
  };

  instance.data.renderChips = function() {
    $content.empty().addClass('ecs-tags-wrapper').removeClass('ecs-single-display');
    var selections = instance.data.selectedThings;

    if (selections.length === 0) {
      $('<span class="ecs-placeholder">').text(instance.data.placeholder || 'Select options').appendTo($content);
      $clearAll.css('display', 'none');
      return;
    }
    $clearAll.css('display', '');

    var BADGE_W = 44;
    var GAP     = 4;
    var avail   = Math.max($content[0].clientWidth - 56, 80);

    var widths = selections.map(function(t) {
      var $tmp = instance.data.makeChip(t)
        .css({ position: 'absolute', visibility: 'hidden', left: '-9999px', top: '-9999px', maxWidth: 'none' })
        .appendTo('body');
      var w = $tmp[0].offsetWidth;
      $tmp.remove();
      return w;
    });

    var visible = 0;
    var used    = 0;
    for (var i = 0; i < widths.length; i++) {
      var chipW     = widths[i];
      var moreAfter = widths.length - i - 1;
      var budgetHere = avail - (moreAfter > 0 ? BADGE_W + GAP : 0);

      if (i === 0) {
        visible = 1;
        used = Math.min(chipW, budgetHere) + GAP;
      } else if (used + chipW <= budgetHere) {
        visible++;
        used += chipW + GAP;
      } else {
        break;
      }
    }

    var hiddenCount = selections.length - visible;
    for (var j = 0; j < visible; j++) {
      var $chip = instance.data.makeChip(selections[j]);
      if (j === 0 && hiddenCount > 0) {
        var firstBudget = avail - BADGE_W - GAP;
        $chip.css('max-width', Math.max(firstBudget, 60) + 'px');
      }
      $chip.appendTo($content);
    }

    if (hiddenCount > 0) {
      $('<span class="ecs-overflow-badge">').text('+' + hiddenCount).appendTo($content);
    }
  };

  instance.data.renderTrigger = function() {
    if (instance.data.allowMultiple) {
      instance.data.renderChips();
    } else {
      instance.data.renderSingleDisplay();
    }
  };

  instance.data.positionDropdown = function() {
    if (!instance.canvas) return;
    var canvasEl = instance.canvas[0] || instance.canvas;
    var rect = canvasEl.getBoundingClientRect();
    var DROPDOWN_H = 44 + Math.min(220, (instance.data.things.length || 5) * 46 + 12);
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    var openUpward = spaceBelow < DROPDOWN_H + 8 && spaceAbove > spaceBelow;

    if (openUpward) {
      $dropdown.css({
        top:       'auto',
        bottom:    (window.innerHeight - rect.top + 4) + 'px',
        left:      rect.left + 'px',
        width:     rect.width + 'px',
        boxSizing: 'border-box'
      });
    } else {
      $dropdown.css({
        top:       (rect.bottom + 4) + 'px',
        bottom:    'auto',
        left:      rect.left + 'px',
        width:     rect.width + 'px',
        boxSizing: 'border-box'
      });
    }
  };

  window.__cb_scroll_lock = window.__cb_scroll_lock || {
    count: 0,
    prevOverflow: '',
    prevPaddingRight: '',
    lock: function() {
      if (this.count === 0) {
        this.prevOverflow = document.body.style.overflow || '';
        this.prevPaddingRight = document.body.style.paddingRight || '';
        var sbw = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (sbw > 0) {
          var currPad = parseFloat(window.getComputedStyle(document.body).paddingRight || 0);
          document.body.style.paddingRight = (currPad + sbw) + 'px';
        }
      }
      this.count++;
    },
    unlock: function() {
      if (this.count > 0) this.count--;
      if (this.count === 0) {
        document.body.style.overflow = this.prevOverflow;
        document.body.style.paddingRight = this.prevPaddingRight;
      }
    }
  };

  instance.data.open = function() {
    instance.data.syncStyles();
    instance.data.positionDropdown();
    if (!instance.data.isOpen) {
      instance.data.isOpen = true;
      window.__cb_scroll_lock.lock();
    }
    $dropdown.addClass('ecs-dropdown-open');
    $wrapper.attr('aria-expanded', 'true');
    $list.attr('aria-multiselectable', instance.data.allowMultiple ? 'true' : 'false');
    $searchInput.val('');
    instance.publishState('search_term', '');
    instance.data.renderOptions('');
    setTimeout(function() { $searchInput.trigger('focus'); }, 0);
  };

  instance.data.close = function() {
    if (!instance.data.isOpen) return;
    instance.data.isOpen = false;
    $dropdown.removeClass('ecs-dropdown-open');
    $wrapper.attr('aria-expanded', 'false');
    $searchInput.val('');
    instance.publishState('search_term', '');
    instance.data.activeIndex = -1;
    window.__cb_scroll_lock.unlock();
  };

  instance.data.setActive = function(idx) {
    var $items = $list.find('.ecs-item');
    $items.removeClass('ecs-item-active');
    instance.data.activeIndex = idx;
    if (idx >= 0 && idx < $items.length) {
      var $el = $items.eq(idx);
      $el.addClass('ecs-item-active');
      if ($el[0] && typeof $el[0].scrollIntoView === 'function') {
        $el[0].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  instance.data.isSelected = function(t) {
    var key = instance.data.getKey(t);
    return instance.data.selectedThings.some(function(s) {
      return instance.data.getKey(s) === key;
    });
  };

  instance.data.toggleItem = function(t) {
    instance.data.hasInitializedDefaults = true;
    var key = instance.data.getKey(t);

    if (!instance.data.allowMultiple) {
      var already = instance.data.selectedThings.length === 1 &&
        instance.data.getKey(instance.data.selectedThings[0]) === key;
      instance.data.selectedThings = already ? [] : [t];
      instance.data.renderTrigger();
      instance.data.publishSelection();
      instance.data.updateValidation();
      instance.triggerEvent('value_changed');
      instance.data.close();
      return;
    }

    var idx = instance.data.selectedThings.findIndex(function(s) {
      return instance.data.getKey(s) === key;
    });
    if (idx >= 0) {
      instance.data.selectedThings.splice(idx, 1);
    } else {
      var max = instance.data.maxSelections;
      if (max && max > 0 && instance.data.selectedThings.length >= max) return;
      instance.data.selectedThings.push(t);
    }
    instance.data.renderTrigger();
    instance.data.publishSelection();
    instance.data.updateValidation();
    instance.triggerEvent('value_changed');
    instance.data.renderOptions($searchInput.val());
  };

  instance.data.deselectItem = function(t) {
    instance.data.hasInitializedDefaults = true;
    var key = instance.data.getKey(t);
    instance.data.selectedThings = instance.data.selectedThings.filter(function(s) {
      return instance.data.getKey(s) !== key;
    });
    instance.data.renderTrigger();
    instance.data.publishSelection();
    instance.data.updateValidation();
    instance.triggerEvent('value_changed');
    if (instance.data.isOpen) instance.data.renderOptions($searchInput.val());
  };

  instance.data.clearAll = function() {
    instance.data.hasInitializedDefaults = true;
    instance.data.selectedThings = [];
    instance.data.renderTrigger();
    instance.publishState('value', []);
    instance.publishState('value_count', 0);
    instance.data.updateValidation();
    instance.triggerEvent('value_changed');
    instance.publishState('search_term', '');
    if (instance.data.isOpen) {
      $searchInput.val('');
      instance.data.renderOptions('');
    }
    $wrapper.trigger('focus');
  };

  instance.data.renderOptions = function(query) {
    var things = instance.data.things || [];
    var q = (query || '').trim().toLowerCase();
    var filtered = q
      ? things.filter(function(t) { return instance.data.getItemLabel(t).toLowerCase().includes(q); })
      : things.slice();

    instance.data.filtered = filtered;
    $list.empty();

    if (filtered.length === 0) {
      $('<li class="ecs-empty">').text(instance.data.noResultsText || 'No options found').appendTo($list);
      return;
    }

    filtered.forEach(function(t, i) {
      var label      = instance.data.getItemLabel(t);
      var avatar     = instance.data.getItemAvatar(t);
      var isSelected = instance.data.isSelected(t);

      var $item = $('<li>')
        .attr({ id: uid + '-opt-' + i, role: 'option', 'aria-selected': isSelected ? 'true' : 'false' })
        .addClass('ecs-item')
        .toggleClass('ecs-item-selected', isSelected);

      instance.data.makeAvatarEl(avatar).appendTo($item);
      $('<span class="ecs-item-label">').text(label).appendTo($item);
      $('<span class="ecs-check">').text(isSelected ? '\u2713' : '').appendTo($item);

      $item.on('mousedown', function(e) { e.preventDefault(); instance.data.toggleItem(t); });
      $item.on('mouseenter', function() { instance.data.setActive(i); });
      $item.appendTo($list);
    });

    var firstSelIdx = filtered.findIndex(function(t) { return instance.data.isSelected(t); });
    instance.data.setActive(firstSelIdx >= 0 ? firstSelIdx : 0);
  };

  $wrapper.on('focus', function() {
    instance.publishState('is_focused', true);
  });

  $wrapper.on('click', function(e) {
    if ($clearAll[0] && $clearAll[0].contains(e.target)) return;
    if ($(e.target).hasClass('ecs-chip-remove') || $(e.target).closest('.ecs-chip-remove').length) return;
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

  $searchInput.on('focus', function() {
    instance.publishState('is_focused', true);
  });

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
      if (!inDropdown && !inWrapper) {
        instance.data.close();
        instance.publishState('is_focused', false);
      }
    }, 150);
  });

  $wrapper.on('blur', function() {
    setTimeout(function() {
      var active = document.activeElement;
      var inDropdown = $dropdown[0] && $dropdown[0].contains(active);
      var inWrapper  = $wrapper[0]  && $wrapper[0].contains(active);
      if (!inDropdown && !inWrapper) {
        instance.publishState('is_focused', false);
      }
    }, 150);
  });

  $(document).on('click.' + uid, function(e) {
    var inWrapper  = $wrapper[0]  && $wrapper[0].contains(e.target);
    var inDropdown = $dropdown[0] && $dropdown[0].contains(e.target);
    if (!inWrapper && !inDropdown) {
      instance.data.close();
      instance.publishState('is_focused', false);
    }
  });

  $(window).on('scroll.' + uid + ' resize.' + uid, function() {
    if (instance.data.isOpen) instance.data.positionDropdown();
    instance.data.renderTrigger();
  });

  $wrapper.on('remove', function() {
    $(document).off('click.' + uid);
    $(window).off('scroll.' + uid + ' resize.' + uid);
    if (instance.data.isOpen) instance.data.close();
    $dropdown.remove();
    $scopedStyle.remove();
  });

  instance.data.renderTrigger();
  instance.data.updateValidation();
}
