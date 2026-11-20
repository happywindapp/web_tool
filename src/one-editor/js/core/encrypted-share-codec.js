// Password protection (WebCrypto): PBKDF2-SHA-256 600 000 rounds → AES-GCM 256. Share link "#enc:" = base64url(version 1 | salt 16 | iv 12 | ciphertext of the "pako:…" payload); the password is never in the link or stored.
const Crypt = (() => {
  const ITER = 600000, te = new TextEncoder(), td = new TextDecoder();
  const b64u = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const bad = () => new Error(T("Sai mật khẩu hoặc dữ liệu đã hỏng."));

  async function key(pw, salt, iterations = ITER) {
    const base = await crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  const salt = () => crypto.getRandomValues(new Uint8Array(16));

  // Text ⇄ { iv, ct } with an already derived key (locked notes keep the key in memory while unlocked).
  async function seal(text, k) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, te.encode(text)));
    return { iv: b64u(iv), ct: b64u(ct) };
  }
  async function unseal(rec, k) {
    try { return td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64u(rec.iv) }, k, unb64u(rec.ct))); } catch { throw bad(); }
  }

  async function encodeLink(obj, pw) {
    const s = salt(), iv = crypto.getRandomValues(new Uint8Array(12)), plain = te.encode(await ShareCodec.encode(obj));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pw, s), plain)), all = new Uint8Array(29 + ct.length);
    all[0] = 1; all.set(s, 1); all.set(iv, 17); all.set(ct, 29);
    return "enc:" + b64u(all);
  }
  // Any failure (wrong password, cut link, tampering) is the same message: nothing about the content leaks.
  async function decodeLink(hash, pw) {
    let obj;
    try {
      const all = unb64u(hash.replace(/^enc:/, ""));
      if (all[0] !== 1) throw bad();
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.subarray(17, 29) }, await key(pw, all.subarray(1, 17)), all.subarray(29));
      obj = await ShareCodec.decode(td.decode(plain));
    } catch { throw bad(); }
    if (!obj) throw bad();
    return obj;
  }

  // Password dialog → the password, or null when cancelled; confirm asks twice; at least 8 characters.
  function ask({ title, confirm = false }) {
    const dlg = $("pwDlg"), a = $("pwInput"), b = $("pwInput2"), msg = $("pwMsg");
    $("pwTitle").textContent = title;
    a.value = b.value = ""; msg.textContent = "";
    b.hidden = !confirm;
    return new Promise(done => {
      dlg.querySelector("form").onsubmit = e => {
        if (e.submitter && e.submitter.value === "cancel") return;
        const err = a.value.length < 8 ? T("Mật khẩu cần ít nhất 8 ký tự.") : confirm && a.value !== b.value ? T("Hai lần nhập không khớp.") : "";
        if (err) { e.preventDefault(); msg.textContent = err; }
      };
      dlg.onclose = () => { const pw = dlg.returnValue === "ok" ? a.value : null; a.value = b.value = ""; done(pw); };
      dlg.returnValue = "";
      dlg.showModal();
      a.focus();
    });
  }

  return { key, salt, seal, unseal, encodeLink, decodeLink, ask, b64u, unb64u, bad, ITER };
})();
