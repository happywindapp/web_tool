// Broken / realistic sample inputs per tab: starter content of an empty tab, the sample picker and ?demo=.
const DEMOS = {
  format: {
    json: { name: "broken.json", text: `{\n  // settings\n  name: 'Student forum',\n  "version": 1.0,\n  "active": True,\n  "tags": ["json", "xml" "html",],\n  "owner": { "id": 007, "email": "alice@school.example" }\n  "note": "missing closing quote\n}` },
    xml: { name: "broken.xml", text: `<?xml version="1.0" encoding="UTF-8"?>\n<library>\n<book id=1 code="B01">\n<title>Systems Analysis & Design</title>\n<price>120000\n</book>\n<book id="2" in-stock>\n<title>Database Systems</title>\n</author>\n</book>` },
    html: { name: "broken.html", text: `<!DOCTYPE html><html><head><title>Test page</title></head><body><div class=box><h1>Forum<p>Paragraph 1<p>Paragraph 2 <b>bold <i>italic</b></i><ul><li>Item 1<li>Item 2</ul></span><img src="a.png"></img></div></body></html>` },
    nested: { name: "log-payload.json", text: `{"event":"order.created","payload":"{\\"orderId\\":12345678901234567890,\\"items\\":[{\\"sku\\":\\"A01\\",\\"qty\\":2}]}","ts":"2026-10-28T09:00:00Z"}` },
  },
  convert: {
    json: { name: "customers.json", text: `{"data":[\n  {"id":12345678901234567890,"code":"C000123","name":"Alice Nguyen","address":{"city":"HCM","district":"1"},"tags":["vip"],"active":true},\n  {"id":2,"code":"C000002","name":"Bob Tran","address":{"city":"HN"},"active":false}\n]}` },
    csv: { name: "trades.csv", text: `date;symbol;quantity;price;note\n2026-10-27;HPG;1000;27500;"buy; batch 1"\n2026-10-28;VNM;200;61200;"sell ""take profit"""` },
    xml: { name: "config.xml", text: `<config env="test">\n  <db host="localhost" port="5432">shop_db</db>\n  <feature name="export" enabled="true"/>\n  <feature name="beta" enabled="false"/>\n</config>` },
    yaml: { name: "docker-compose.yml", text: `services:\n  api:\n    image: shop-api:1.4.2\n    ports: ["8080:8080"]\n    environment:\n      DB_HOST: db\n      RETRY: 3\n  db:\n    image: postgres:16` },
  },
  csv: {
    csv: { name: "customers.csv", text: `No,Full name,Customer ID,Balance,Note\n1,Alice Nguyen,C000123,15000000,"VIP customer, priority"\n2,Bob Tran,C000002,250000\n3,Carol "Le",C000003,1200000,ok\n4,Dave Pham,C000004,98000000,"unclosed quote` },
  },
  diff: {
    json: {
      left: `{\n  "orderId": 1001,\n  "status": "PENDING",\n  "items": [{"sku": "A01", "qty": 2}, {"sku": "B02", "qty": 1}],\n  "note": "deliver during office hours"\n}`,
      right: `{\n  "status": "FILLED",\n  "orderId": 1001,\n  "items": [{"sku": "A01", "qty": 3}],\n  "note": "deliver during office hours",\n  "filledAt": "2026-10-28T10:15:00Z"\n}`,
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
