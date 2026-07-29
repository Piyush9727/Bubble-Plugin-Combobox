function(instance, context) {
  const uid = 'cb-' + Math.random().toString(36).slice(2, 10);

  const $container = $(`
    <div class="cb-wrapper" style="position:relative;width:100%;">
      <input type="text" class="cb-input" autocomplete="off" spellcheck="false"
        role="combobox" aria-autocomplete="list" aria-expanded="false"
        aria-controls="${uid}-listbox" style="width:100%;box-sizing:border-box;" />
    </div>
  `).appendTo(instance.canvas);

  const $input = $container.find('.cb-input');
  $input.attr('id', uid + '-input');

  const $list = $(`<ul class="cb-list" id="${uid}-listbox" role="listbox"></ul>`).css({
    position: 'fixed',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '240px',
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #ccc',
    zIndex: 2147483647,
    boxSizing: 'border-box',
    display: 'none'
  }).appendTo('body');

  instance.data.uid = uid;
  instance.data.$container = $container;
  instance.data.$input = $input;
  instance.data.$list = $list;
  instance.data.things = [];
  instance.data.captionField = null;
  instance.data.selectedThing = null;
  instance.data.activeIndex = -1;
  instance.data.filtered = [];

  instance.data.positionList = function() {
    if (!instance.data.$input.is(':visible')) {
      instance.data.closeList();
      return;
    }
    const rect = instance.data.$input[0].getBoundingClientRect();
    $list.css({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  instance.data.closeList = function() {
    $list.hide();
    $input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
    instance.data.activeIndex = -1;
  };

  instance.data.setActive = function(idx) {
    const $items = $list.find('.cb-item');
    $items.removeClass('cb-item-active').attr('aria-selected', 'false');
    instance.data.activeIndex = idx;
    if (idx >= 0 && idx < $items.length) {
      const $active = $items.eq(idx);
      $active.addClass('cb-item-active').attr('aria-selected', 'true');
      $input.attr('aria-activedescendant', $active.attr('id'));
      $active[0].scrollIntoView({ block: 'nearest' });
    } else {
      $input.removeAttr('aria-activedescendant');
    }
  };

  instance.data.selectItem = function(t) {
    const label = t.get(instance.data.captionField);
    $input.val(label);
    instance.data.selectedThing = t;
    instance.publishState('value', t);
    instance.triggerEvent('value_changed');
    instance.data.closeList();
  };

  instance.data.renderList = function(filterText, isFocusOpen) {
    const field = instance.data.captionField;
    const things = instance.data.things || [];
    if (!field) { instance.data.closeList(); return; }

    const query = isFocusOpen ? '' : (filterText || '');
    const filtered = things.filter(t =>
      String(t.get(field) || '').toLowerCase().includes(query.toLowerCase())
    );
    instance.data.filtered = filtered;

    $list.empty();
    filtered.forEach((t, i) => {
      const label = t.get(field);
      const isSelected = instance.data.selectedThing &&
        t.get('_id') === instance.data.selectedThing.get('_id');

      const $item = $('<li>')
        .attr({ id: uid + '-opt-' + i, role: 'option', 'aria-selected': isSelected ? 'true' : 'false' })
        .addClass('cb-item')
        .toggleClass('cb-item-selected', isSelected);

      $('<span>').addClass('cb-check').text(isSelected ? '✓' : '').appendTo($item);
      $('<span>').addClass('cb-label').text(label).appendTo($item);

      $item.on('mousedown', function(e) {
        e.preventDefault();
        instance.data.selectItem(t);
      });
      $item.on('mouseenter', function() { instance.data.setActive(i); });

      $item.appendTo($list);
    });

    if (filtered.length > 0) {
      instance.data.positionList();
      $list.show();
      $input.attr('aria-expanded', 'true');
      const preselectIdx = instance.data.selectedThing
        ? filtered.findIndex(t => t.get('_id') === instance.data.selectedThing.get('_id'))
        : -1;
      instance.data.setActive(preselectIdx);
    } else {
      instance.data.closeList();
    }
  };

  $input.on('input', function() {
    instance.publishState('search_term', $(this).val());
    instance.data.renderList($(this).val(), false);
  });

  $input.on('focus', function() {
    instance.data.renderList('', true);
  });

  $input.on('keydown', function(e) {
    const max = instance.data.filtered.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!$list.is(':visible')) { instance.data.renderList('', true); return; }
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
      instance.data.closeList();
    }
  });

  $input.on('blur', function() {
    // slight delay so mousedown on an option registers before list is torn down
    setTimeout(() => {
      if (!$list.is(':focus-within')) instance.data.closeList();
    }, 100);
  });

  $(window).on('scroll.' + uid + ' resize.' + uid, instance.data.positionList);

  $(document).on('click.' + uid, function(e) {
    if (!$container[0].contains(e.target) && !$list[0].contains(e.target)) {
      instance.data.closeList();
    }
  });
}