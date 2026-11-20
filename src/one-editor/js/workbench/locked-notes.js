// Locked notes: with a password the note is stored only encrypted (hot exit writes { salt, iv, ct }); after F5 it opens locked until the password is typed again — the key is never stored.
const Locks = (() => {
  const PLACEHOLDER = () => T("🔒 Ghi chú đã khoá — Command Palette → “Ghi chú: mở khoá…” để nhập mật khẩu.");

  // Hot exit calls this for every unlocked note with a password, just before writing it.
  const sealDoc = async d => ({ salt: d.crypt.salt, it: d.crypt.it, ...(await Crypt.seal(Docs.text(d), d.crypt.key)) });
  // Clones and result tabs (format, preview, translate…) of a note would show its text: closed when it locks.
  const closeCopies = doc => Docs.list().filter(d => d.cloneOf === doc.id || (d.link && d.link.src === doc.id)).forEach(d => Views.close(d.id, true));

  // Plain copies made before the password: local history snapshots and the text inside saved sessions.
  async function dropPlainCopies(doc) {
    try {
      const recs = await NotesDb.histList(), ids = recs.filter(r => r.key === "note:" + doc.id).map(r => r.id);
      if (ids.length) await NotesDb.histWrite(null, "", ids);
      const ss = await NotesDb.getMeta("sessions");
      if (Array.isArray(ss)) await NotesDb.putMeta("sessions", ss.map(a => ({ ...a, payload: { ...a.payload, groups: (a.payload?.groups || []).map(g => ({ ...g, tabs: (g.tabs || []).map(t => t && t.id === doc.id ? { ...t, text: undefined } : t) })) } })));
    } catch (e) { StatusBar.msg(T("Không xoá được bản thường cũ của ghi chú (lịch sử / phiên): {msg}", { msg: e.message }), "warn"); }
  }

  // Shows new text in the tab (read-only while locked), like a file re-read from disk.
  function show(doc, text, readOnly) {
    Object.assign(doc, { text, state: null, readOnly, langApplied: null });
    const gi = Views.where(doc.id);
    if (gi >= 0 && Views.groups[gi].active === doc.id) Views.activate(gi, doc.id, false);
    Docs.update(doc, {});
  }

  async function lock(doc) {
    if (doc.kind !== "note" || doc.sealed) return;
    const pw = await Crypt.ask({ title: T("Đặt mật khẩu cho “{name}”", { name: doc.name }), confirm: true });
    if (!pw) return;
    const salt = Crypt.b64u(Crypt.salt());
    doc.crypt = { key: await Crypt.key(pw, Crypt.unb64u(salt)), salt, it: Crypt.ITER };
    Docs.update(doc, {});
    await HotExit.flush();
    await dropPlainCopies(doc);
    StatusBar.msg(T("🔒 “{name}” giờ chỉ lưu dạng mã hoá. Quên mật khẩu là không mở lại được.", { name: doc.name }), "good");
  }

  async function relock(doc) {
    if (!doc.crypt) { StatusBar.msg(T("Ghi chú này chưa có mật khẩu."), "warn"); return; }
    doc.sealed = await sealDoc(doc);
    doc.crypt = null;
    closeCopies(doc);
    show(doc, PLACEHOLDER(), true);
    await HotExit.flush();
    StatusBar.msg(T("🔒 Đã khoá “{name}”.", { name: doc.name }), "good");
  }

  async function unlock(doc) {
    if (!doc.sealed) { StatusBar.msg(T("Ghi chú này không bị khoá."), "warn"); return; }
    const pw = await Crypt.ask({ title: T("Mật khẩu của “{name}”", { name: doc.name }) });
    if (!pw) return;
    try {
      const it = doc.sealed.it || 310000, k = await Crypt.key(pw, Crypt.unb64u(doc.sealed.salt), it), text = await Crypt.unseal(doc.sealed, k);
      doc.crypt = { key: k, salt: doc.sealed.salt, it };
      doc.sealed = null;
      show(doc, text, false);
      StatusBar.msg(T("🔓 Đã mở khoá “{name}” — vẫn lưu dạng mã hoá; F5 / đóng trang là khoá lại.", { name: doc.name }), "good");
    } catch { StatusBar.msg(Crypt.bad().message, "bad"); }
  }

  async function removePassword(doc) {
    if (doc.sealed) { StatusBar.msg(T("Mở khoá ghi chú trước."), "warn"); return; }
    if (!doc.crypt || !confirm(T("Bỏ mật khẩu — “{name}” sẽ lưu dạng thường trong trình duyệt?", { name: doc.name }))) return;
    doc.crypt = null;
    Docs.update(doc, {});
    StatusBar.msg(T("Đã bỏ mật khẩu của “{name}”.", { name: doc.name }), "good");
  }

  return { sealDoc, lock, relock, unlock, removePassword, PLACEHOLDER };
})();
