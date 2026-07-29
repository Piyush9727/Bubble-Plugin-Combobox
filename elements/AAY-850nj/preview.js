function(instance, properties) {
  instance.canvas.empty();
  const placeholder = properties.placeholder || 'Select options';
  const $preview = $(`
    <div style="width:100%; height:100%; display:flex; align-items:center; gap:6px; padding:0 8px; box-sizing:border-box; font-family:sans-serif; font-size:13px; color:#64748b; overflow:hidden;">
      <span style="display:inline-flex; align-items:center; gap:3px; padding:2px 4px 2px 8px; border-radius:9999px; background:rgba(79,70,229,0.15); color:#4f46e5; font-size:12px; font-weight:500; white-space:nowrap; flex-shrink:0;">
        Option 1
        <span style="font-size:14px; opacity:0.7;">&times;</span>
      </span>
      <span style="display:inline-flex; align-items:center; gap:3px; padding:2px 4px 2px 8px; border-radius:9999px; background:rgba(79,70,229,0.15); color:#4f46e5; font-size:12px; font-weight:500; white-space:nowrap; flex-shrink:0;">
        Option 2
        <span style="font-size:14px; opacity:0.7;">&times;</span>
      </span>
      <span style="flex:1; color:#94a3b8; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${placeholder}</span>
      <svg style="width:15px;height:15px;fill:#94a3b8;flex-shrink:0;" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
    </div>
  `);
  $preview.appendTo(instance.canvas);
}