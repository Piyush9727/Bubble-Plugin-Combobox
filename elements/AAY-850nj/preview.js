function(instance, properties) {
  instance.canvas.empty();

  const placeholder = properties.placeholder || 'Select option';

  const $preview = $(`
    <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 10px; box-sizing:border-box; font-family:sans-serif; font-size:14px; color:#64748b;">
      <span>${placeholder}</span>
      <svg style="width:16px; height:16px; fill:#64748b;" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
    </div>
  `);

  $preview.appendTo(instance.canvas);
}