function(instance, properties, context) {
  instance.data.$input.attr('placeholder', properties.placeholder || '');
  instance.data.syncFont();

  const count = properties.options_list.length();
  const things = properties.options_list.get(0, count); // 'not ready' handled by Bubble automatically

  instance.data.things = things;
  instance.data.captionField = properties.caption_field;

  if (instance.data.isOpen) {
    instance.data.renderOptions(instance.data.$input.val());
  }
}