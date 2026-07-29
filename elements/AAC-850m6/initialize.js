function(instance, context) {
  const uid = 'cb-' + Math.random().toString(36).substring(2, 9);

  const $wrapper = $(`
    <div class="cb-wrapper">
      <div class="cb-input-container">
        <input type="text" class="cb-input" autocomplete="off" spellcheck="false"
          role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-haspopup="listbox" id="${uid}-input" aria-controls="${uid}-listbox" />
        <div class="cb-icon-wrapper">
          <button type="button" class="cb-clear-btn" aria-label="Clear selection" title="Clear selection" style="display:none;">✕</button>
          <svg class="cb-chevron" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
        </div>
      </div>
    </div>
  `).appendTo(instance.canvas);

  const $input = $wrapper.find('.cb-input');
  const $clearBtn = $wrapper.find('.cb-clear-btn');

  const $list = $(`<ul class="cb-listbox" id="${uid}-listbox" role="listbox" tabindex="-1"></ul>`).appendTo('body');

  instance.data.uid = uid;
  instance.data.$wrapper = $wrapper;
  instance.data.$input = $input;
  instance.data.$clearBtn = $clearBtn;
  instance.data.$list = $list;
  instance.data.things = [];
  instance.data.captionField = null;
  instance.data.noResultsText = 'No options found';
  instance.data.selectedThing = null;
  instance.data.activeIndex = -1;
  instance.data.filtered = [];

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
    if (!$input.is(':visible') || !$list.is(':visible')) return;
    const rect = $input[0].getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const listHeight = Math.min(260, $list.outerHeight() || 200);

    let top = rect.bottom + 4;
    if (rect.bottom + listHeight > viewportHeight && rect.top - listHeight > 0) {
      top = rect.top - listHeight - 4;
    }

    $list.css({
      top: top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px'
    });
  };

  instance.data.openList = function() {
    $wrapper.addClass('cb-expanded');
    $input.attr('aria-expanded', 'true');
    instance.data.positionList();
    $list.show();
  };

  instance.data.closeList = function() {
    $list.hide();
    $wrapper.removeClass('cb-expanded');
    $input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
    instance.data.activeIndex = -1;
  };

  instance.data.setActive = function(idx) {
    const $options = $list.find('.cb-option');
    $options.removeClass('cb-option-active');
    instance.data.activeIndex = idx;

    if (idx >= 0 && idx < $options.length) {
      const $active = $options.eq(idx);
      $active.addClass('cb-option-active');
      const optId = $active.attr('id');
      if (optId) $input.attr('aria-activedescendant', optId);
      $active[0].scrollIntoView({ block: 'nearest' });
    } else {
      $input.removeAttr('aria-activedescendant');
    }
  };

  instance.data.selectItem = function(item) {
    const label = instance.data.getItemLabel(item);
    $input.val(label);
    instance.data.selectedThing = item;
    $clearBtn.show();

    instance.publishState('value', item);
    instance.triggerEvent('value_changed');
    instance.data.closeList();
  };

  instance.data.clearSelection = function() {
    instance.data.selectedThing = null;
    $input.val('');
    $clearBtn.hide();
    instance.publishState('value', null);
    instance.publishState('search_term', '');
    instance.triggerEvent('value_changed');
    if ($list.is(':visible')) {
      instance.data.renderList('', true);
    }
  };

  instance.data.renderList = function(filterText, isFocusOpen) {
    const things = instance.data.things || [];
    const query = (isFocusOpen ? '' : (filterText || '')).trim().toLowerCase();

    const filtered = things.filter(t => {
      if (!query) return true;
      const label = instance.data.getItemLabel(t).toLowerCase();
      return label.includes(query);
    });

    instance.data.filtered = filtered;
    $list.empty();

    if (filtered.length === 0) {
      $('<li>')
        .addClass('cb-no-results')
        .text(instance.data.noResultsText)
        .appendTo($list);
      instance.data.openList();
      instance.data.setActive(-1);
      return;
    }

    const selectedId = instance.data.selectedThing ? instance.data.getItemId(instance.data.selectedThing) : null;

    filtered.forEach((t, i) => {
      const label = instance.data.getItemLabel(t);
      const itemId = instance.data.getItemId(t);
      const isSelected = selectedId !== null && itemId === selectedId;

      const $option = $('<li>')
        .attr({
          id: `${uid}-opt-${i}`,
          role: 'option',
          'aria-selected': isSelected ? 'true' : 'false'
        })
        .addClass('cb-option')
        .toggleClass('cb-option-selected', isSelected);

      $('<span>').addClass('cb-option-label').text(label).appendTo($option);

      if (isSelected) {
        $('<span>').addClass('cb-option-check').text('✓').appendTo($option);
      }

      $option.on('mousedown', function(e) {
        e.preventDefault();
        instance.data.selectItem(t);
      });

      $option.on('mouseenter', function() {
        instance.data.setActive(i);
      });

      $option.appendTo($list);
    });

    instance.data.openList();

    const preselectIdx = selectedId !== null
      ? filtered.findIndex(t => instance.data.getItemId(t) === selectedId)
      : 0;

    instance.data.setActive(preselectIdx >= 0 ? preselectIdx : 0);
  };

  // Event Listeners
  $clearBtn.on('mousedown', function(e) {
    e.preventDefault();
    instance.data.clearSelection();
  });

  $input.on('input', function() {
    const val = $(this).val();
    if (!val) {
      $clearBtn.hide();
    } else if (instance.data.selectedThing) {
      $clearBtn.show();
    }
    instance.publishState('search_term', val);
    instance.data.renderList(val, false);
  });

  $input.on('focus', function() {
    instance.data.renderList($input.val(), true);
  });

  $input.on('keydown', function(e) {
    const max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!$list.is(':visible')) {
        instance.data.renderList($input.val(), true);
        return;
      }
      instance.data.setActive(Math.min(instance.data.activeIndex + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!$list.is(':visible')) {
        instance.data.renderList($input.val(), true);
        return;
      }
      instance.data.setActive(Math.max(instance.data.activeIndex - 1, 0));
    } else if (e.key === 'Home') {
      if ($list.is(':visible')) {
        e.preventDefault();
        instance.data.setActive(0);
      }
    } else if (e.key === 'End') {
      if ($list.is(':visible')) {
        e.preventDefault();
        instance.data.setActive(max);
      }
    } else if (e.key === 'Enter') {
      if ($list.is(':visible')) {
        e.preventDefault();
        const idx = instance.data.activeIndex;
        if (idx >= 0 && instance.data.filtered[idx]) {
          instance.data.selectItem(instance.data.filtered[idx]);
        }
      }
    } else if (e.key === 'Escape') {
      if ($list.is(':visible')) {
        e.preventDefault();
        instance.data.closeList();
      }
    } else if (e.key === 'Tab') {
      instance.data.closeList();
    }
  });

  $input.on('blur', function() {
    setTimeout(() => {
      if (!$list.is(':focus-within') && !document.activeElement.classList.contains('cb-clear-btn')) {
        instance.data.closeList();
      }
    }, 120);
  });

  $(window).on('scroll.' + uid + ' resize.' + uid, function() {
    instance.data.positionList();
  });

  $(document).on('click.' + uid, function(e) {
    if (!$wrapper[0].contains(e.target) && !$list[0].contains(e.target)) {
      instance.data.closeList();
    }
  });
}