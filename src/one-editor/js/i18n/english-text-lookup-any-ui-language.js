// English text of a Vietnamese UI string whatever the UI language (Settings search matches both): keeps a copy of every dictionary added after it.
const EnglishText = (() => {
  const EN = {}, add = I18n.add;
  I18n.add = d => { Object.assign(EN, d); return add(d); };
  return vi => (Object.hasOwn(EN, vi) ? EN[vi] : vi);
})();
