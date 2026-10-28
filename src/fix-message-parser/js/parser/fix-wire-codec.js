// FIX wire codec: split tag=value by any delimiter, BodyLength/CheckSum computed on the SOH form (UTF-8 bytes), rebuild with correct 9/10.
const FixCodec = (() => {
  const SOH = "\x01";
  const utf8 = new TextEncoder();
  const size = s => utf8.encode(s).length;
  const join = fields => fields.map(f => f.tag === null ? f.value : `${f.tag}=${f.value}`).join(SOH) + SOH;
  const checksum = s => String(utf8.encode(s).reduce((a, b) => a + b, 0) % 256).padStart(3, "0");

  // A token without "=" or with a non-numeric tag keeps tag null so the validator can point at it.
  function split(raw, delim) {
    const parts = delim ? raw.split(delim) : [raw];
    if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
    return parts.map(tok => {
      const i = tok.indexOf("=");
      const tag = i > 0 ? tok.slice(0, i).trim() : "";
      return /^\d+$/.test(tag) ? { tag, value: tok.slice(i + 1) } : { tag: null, value: tok };
    });
  }

  // Declared vs actual 9/10; actual is null when the message has no tag 10 (truncated) to measure against.
  function verify(fields) {
    const end = fields.length - 1, hasTrailer = end >= 0 && fields[end].tag === "10";
    const i9 = fields.findIndex(f => f.tag === "9");
    const bodyFrom = i9 >= 0 ? i9 + 1 : Math.min(1, fields.length);
    const bodyTo = hasTrailer ? end : fields.length;
    return {
      bodyLength: { declared: i9 >= 0 ? fields[i9].value : null, actual: hasTrailer ? String(size(join(fields.slice(bodyFrom, bodyTo)))) : null },
      checkSum: { declared: hasTrailer ? fields[end].value : null, actual: hasTrailer ? checksum(join(fields.slice(0, end))) : null },
    };
  }

  // Keeps 8 first, rewrites 9 right after it and 10 at the end; bodyLength forces a (wrong) value for test samples.
  function rebuild(fields, bodyLength) {
    const body = fields.filter((f, i) => !(i === 0 && f.tag === "8") && f.tag !== "9" && f.tag !== "10");
    const begin = fields[0] && fields[0].tag === "8" ? fields[0] : { tag: "8", value: "FIX.4.4" };
    const head = [begin, { tag: "9", value: String(bodyLength ?? size(join(body))) }];
    const all = [...head, ...body];
    return [...all, { tag: "10", value: checksum(join(all)) }];
  }

  const toWire = (fields, delim = SOH) => fields.map(f => f.tag === null ? f.value : `${f.tag}=${f.value}`).join(delim) + delim;
  const build = (pairs, { begin = "FIX.4.4", bodyLength } = {}) =>
    toWire(rebuild([{ tag: "8", value: begin }, ...pairs.map(([tag, value]) => ({ tag: String(tag), value: String(value) }))], bodyLength));

  return { SOH, split, verify, rebuild, toWire, build, checksum };
})();
