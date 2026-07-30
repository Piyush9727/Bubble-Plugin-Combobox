function(instance, properties) {
  instance.canvas.empty();
  var placeholder = properties.placeholder || 'Select options';
  var selBg = properties.selected_bg_color || 'rgba(79, 70, 229, 0.15)';
  var selText = properties.selected_bg_color ? '#ffffff' : '#4f46e5';

  var $preview = $([
    '<div style="width:100%;height:100%;display:flex;align-items:center;gap:5px;',
    'padding:0 8px;box-sizing:border-box;font-family:sans-serif;overflow:hidden;">',

    '<div style="flex:1;display:flex;align-items:center;gap:4px;overflow:hidden;min-width:0;">',

    // Sample chip 1
    '<span style="display:inline-flex;align-items:center;gap:3px;',
    'padding:2px 4px 2px 8px;border-radius:9999px;',
    'background:rgba(79,70,229,0.15);color:#4f46e5;',
    'font-size:12px;font-weight:500;white-space:nowrap;flex-shrink:0;">',
    'Option A',
    '<span style="font-size:13px;opacity:0.7;">&times;</span>',
    '</span>',

    // Sample chip 2
    '<span style="display:inline-flex;align-items:center;gap:3px;',
    'padding:2px 4px 2px 8px;border-radius:9999px;',
    'background:rgba(79,70,229,0.15);color:#4f46e5;',
    'font-size:12px;font-weight:500;white-space:nowrap;flex-shrink:0;">',
    'Option B',
    '<span style="font-size:13px;opacity:0.7;">&times;</span>',
    '</span>',

    // Placeholder hint
    '<span style="font-size:13px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">',
    placeholder,
    '</span>',
    '</div>',

    // Chevron
    '<svg style="width:15px;height:15px;fill:#94a3b8;flex-shrink:0;" viewBox="0 0 20 20" aria-hidden="true">',
    '<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>',
    '</svg>',

    '</div>'
  ].join('')).appendTo(instance.canvas);
}