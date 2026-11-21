# One Editor: pane đồng bộ tab nguồn mà không kéo carousel điện thoại

**Triệu chứng:** ở màn ≤ 640px, đang xem pane ở View 2 (ví dụ FIX → Chi tiết message), chạm 1 dòng trong danh sách thì màn hình nhảy về View 1.

**Nguyên nhân:** code dời con trỏ tab nguồn bằng `Views.revealLine` / `view.focus()` / effect `EditorView.scrollIntoView`. `scrollIntoView` của CodeMirror cuộn cả các phần tử cha, gồm carousel ngang `#work.pane-scroller`; `focus()` cũng làm trình duyệt cuộn tới editor.

**Cách xử lý đúng:** pane muốn đứng yên thì chỉ dispatch `selection` rồi cuộn riêng khung cuộn của editor:

```js
ev.dispatch({ selection: { anchor: ln.from } });
ev.scrollDOM.scrollTop = Math.max(0, ev.lineBlockAt(ln.from).top - ev.scrollDOM.clientHeight / 3);
```

Mẫu: `showSource` trong `src/one-editor/js/log/fix-detail-pane-view.js`. Pane cố ý chuyển sang tab nguồn (cây, truy vấn) thì vẫn dùng `revealLine` + `PhoneLayout.show`.

**Kiểm:** headless 390px `isMobile`, so `Math.round(work.scrollLeft / work.clientWidth)` trước và sau khi tap.
