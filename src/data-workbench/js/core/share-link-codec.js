// Share-link payload codec, same format as mermaid.live: "pako:" + base64url(zlib(JSON)); also reads uncompressed "base64:".
const ShareCodec = (() => {
  const b64url = u8 => {
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const unb64 = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0)); };
  const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());

  async function encode(obj) {
    return "pako:" + b64url(await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream("deflate")));
  }

  // null → not an encoded payload (caller may treat the value as raw text).
  async function decode(s) {
    let bytes;
    if (s.startsWith("pako:")) bytes = await pipe(unb64(s.slice(5)), new DecompressionStream("deflate"));
    else if (s.startsWith("base64:")) bytes = unb64(s.slice(7));
    else return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  return { encode, decode };
})();
