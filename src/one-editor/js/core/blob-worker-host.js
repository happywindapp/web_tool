// Worker from a Blob URL (also on file://; CSP worker-src blob:): vendored libs + handlers; call(type, data) → Promise matched by id, stop() terminates (pending calls reject), the next call starts a fresh worker.
const BlobWorker = (() => {
  // Worker side: handlers[type](data, progress) → result; a result { $value, $transfer } hands buffers over instead of copying.
  function driver(handlers) {
    self.onmessage = async e => {
      const { id, type, data } = e.data || {};
      const send = (m, tr) => self.postMessage(Object.assign({ id }, m), tr || []);
      try {
        if (!Object.prototype.hasOwnProperty.call(handlers, type)) throw new Error("unknown call: " + type);
        const r = await handlers[type](data, p => send({ progress: p }));
        if (r && r.$transfer) send({ result: r.$value }, r.$transfer); else send({ result: r });
      } catch (err) { send({ error: String((err && err.message) || err) }); }
    };
  }

  // Libraries are OEWorkerLibs.<name> functions of tools/vendor/… (VendorPaths name = lib name); the page never runs them.
  async function source(spec) {
    const missing = file => new Error(T("Không nạp được thư viện ({file}) — cần thư mục vendor nằm cạnh one-editor.html.", { file }));
    await Promise.all(spec.libs.map(n => VendorPaths.load(n).catch(e => { throw missing(e.message); })));
    const libs = spec.libs.map(n => { const f = globalThis.OEWorkerLibs?.[n]; if (typeof f !== "function") throw missing(VendorPaths.PATHS[n]); return "self." + n + " = (" + f + ")();"; });
    return libs.join("\n") + "\n" + spec.code() + "\n;(" + driver + ")(HANDLERS);\n";
  }

  // spec: { libs: [names], code: () => source text defining const HANDLERS = { type(data, progress) {…} } }.
  function create(spec) {
    let w = null, url = "", seq = 0, gen = 0, epoch = 0, starting = null;
    const pending = new Map();
    const stoppedError = () => Object.assign(new Error(T("Đã dừng.")), { stopped: true });

    function stop(err = stoppedError()) {
      gen++;
      if (w) { w.terminate(); URL.revokeObjectURL(url); w = null; }
      for (const p of pending.values()) { clearTimeout(p.timer); p.no(err); }
      pending.clear();
    }

    async function start() {
      const g = gen, src = await source(spec);
      if (g !== gen) throw stoppedError();
      url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      try { w = new Worker(url); } catch (e) { URL.revokeObjectURL(url); throw new Error(T("Trình duyệt không cho chạy Worker: {msg}", { msg: e.message })); }
      epoch++;
      w.onmessage = e => {
        const m = e.data, p = m && pending.get(m.id);
        if (!p) return;
        if ("progress" in m) { p.progress?.(m.progress); return; }
        pending.delete(m.id);
        clearTimeout(p.timer);
        if (m.error != null) p.no(new Error(m.error)); else p.ok(m.result);
      };
      // An uncaught error (bad source, out of memory) leaves the worker in an unknown state: drop it.
      w.onerror = e => { e.preventDefault(); stop(new Error(e.message ? T("Worker lỗi: {msg}", { msg: e.message + (e.lineno ? " (" + e.lineno + ")" : "") }) : T("Worker không chạy được (trình duyệt / CSP chặn?)."))); };
      w.onmessageerror = () => stop(new Error(T("Worker trả dữ liệu không đọc được.")));
    }

    // opts: { timeout ms (0 = none), transfer: [ArrayBuffer], progress(p) }.
    async function call(type, data, opts = {}) {
      if (!w) await (starting ??= start().finally(() => { starting = null; }));
      if (!w) throw stoppedError();
      const id = ++seq;
      return new Promise((ok, no) => {
        const timer = opts.timeout ? setTimeout(() => stop(new Error(T("Chạy quá {s} giây — đã dừng.", { s: Math.round(opts.timeout / 1000) }))), opts.timeout) : 0;
        pending.set(id, { ok, no, timer, progress: opts.progress });
        try { w.postMessage({ id, type, data }, opts.transfer || []); } catch (e) { pending.delete(id); clearTimeout(timer); no(e); }
      });
    }

    // epoch changes whenever a new worker starts: state cached in the old one is gone.
    return { call, stop, get busy() { return pending.size > 0; }, get alive() { return !!w; }, get epoch() { return epoch; } };
  }

  return { create };
})();
