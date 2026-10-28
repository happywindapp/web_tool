// Broken / realistic sample inputs per tab (also used by ?demo= for manual testing).
const DEMOS = {
  format: {
    json: { name: "mau-loi.json", text: `{\n  // cấu hình\n  name: 'Diễn đàn sinh viên',\n  "version": 1.0,\n  "active": True,\n  "tags": ["json", "xml" "html",],\n  "owner": { "id": 007, "email": "an@truong.edu.vn" }\n  "note": "thiếu dấu đóng\n}` },
    xml: { name: "mau-loi.xml", text: `<?xml version="1.0" encoding="UTF-8"?>\n<thuvien>\n<sach id=1 ma="S01">\n<ten>Phân tích & thiết kế HTTT</ten>\n<gia>120000\n</sach>\n<sach id="2" con-hang>\n<ten>Cơ sở dữ liệu</ten>\n</tacgia>\n</sach>` },
    html: { name: "mau-loi.html", text: `<!DOCTYPE html><html><head><title>Trang thử</title></head><body><div class=box><h1>Diễn đàn<p>Đoạn 1<p>Đoạn 2 <b>đậm <i>nghiêng</b></i><ul><li>Mục 1<li>Mục 2</ul></span><img src="a.png"></img></div></body></html>` },
    nested: { name: "log-payload.json", text: `{"event":"order.created","payload":"{\\"orderId\\":12345678901234567890,\\"items\\":[{\\"sku\\":\\"A01\\",\\"qty\\":2}]}","ts":"2026-10-28T09:00:00Z"}` },
  },
  convert: {
    json: { name: "khach-hang.json", text: `{"data":[\n  {"id":12345678901234567890,"ma":"KH000123","ten":"Nguyễn An","dia_chi":{"tinh":"HCM","quan":"1"},"tags":["vip"],"active":true},\n  {"id":2,"ma":"KH000002","ten":"Trần Bình","dia_chi":{"tinh":"HN"},"active":false}\n]}` },
    csv: { name: "giao-dich.csv", text: `ngay;ma_ck;so_luong;gia;ghi_chu\n2026-10-27;HPG;1000;27500;"mua; đợt 1"\n2026-10-28;VNM;200;61200;"bán ""chốt lời"""` },
    xml: { name: "cau-hinh.xml", text: `<config env="test">\n  <db host="localhost" port="5432">shop_db</db>\n  <feature name="export" enabled="true"/>\n  <feature name="beta" enabled="false"/>\n</config>` },
    yaml: { name: "docker-compose.yml", text: `services:\n  api:\n    image: shop-api:1.4.2\n    ports: ["8080:8080"]\n    environment:\n      DB_HOST: db\n      RETRY: 3\n  db:\n    image: postgres:16` },
  },
  csv: {
    csv: { name: "danh-sach.csv", text: `STT,Họ tên,Mã KH,Số dư,Ghi chú\n1,Nguyễn An,KH000123,15000000,"Khách VIP, ưu tiên"\n2,Trần Bình,KH000002,250000\n3,Lê "Cường",KH000003,1200000,ok\n4,Phạm Dung,KH000004,98000000,"chưa đóng nháy` },
  },
  diff: {
    json: {
      left: `{\n  "orderId": 1001,\n  "status": "PENDING",\n  "items": [{"sku": "A01", "qty": 2}, {"sku": "B02", "qty": 1}],\n  "note": "giao giờ hành chính"\n}`,
      right: `{\n  "status": "FILLED",\n  "orderId": 1001,\n  "items": [{"sku": "A01", "qty": 3}],\n  "note": "giao giờ hành chính",\n  "filledAt": "2026-10-28T10:15:00Z"\n}`,
    },
    text: {
      left: `server:\n  port: 8080\n  timeout: 30s\nlog:\n  level: info\n  file: /var/log/app.log`,
      right: `server:\n  port: 9090\n  timeout: 30s\nlog:\n  level: debug\n  file: /var/log/app.log\n  rotate: daily`,
    },
  },
  code: {
    css: { name: "style.min.css", text: `/* banner */.btn{color:#fff;background:#0e7490;padding:4px 8px}.btn:hover,.btn:focus{background:#155e75}@media (max-width:600px){.btn{width:100%}}` },
    js: { name: "app.min.js", text: `function sum(a,b){return a+b}const items=[1,2,3].map(x=>x*2).filter(x=>x>2);if(items.length){console.log("ok",sum(1,2))}else{console.warn("empty")}` },
  },
};
