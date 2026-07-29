function(instance, properties, context) {
  instance.data.$input.attr('placeholder', properties.placeholder || '');

  const count = properties.options_list.length();
  const things = properties.options_list.get(0, count);

  instance.data.things = things;
  instance.data.captionField = properties.caption_field;

  if (instance.data.$list.is(':visible')) {
    instance.data.renderList(instance.data.$input.val(), true);
  }
}