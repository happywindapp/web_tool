// Phase 15b demo content (labels in demo-samples-format-compare.js): messy Go / C++ · Java · C# / Python run through ▶ Format, plus a tab with a syntax error for Shift+Alt+F. All data fake.
Object.assign(PowerDemos, (() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const GO = 'package orders\n\nimport (\n"fmt"\n    "strings"\n)\n\ntype Order struct{\nID string\n  Symbol   string\nQty int\n    Price float64\n}\n\nfunc (o Order) Notional() float64{ return float64(o.Qty)*o.Price }\n\nfunc Describe(list []Order) string {\nvar b strings.Builder\nfor i,o:=range list{\nif o.Qty<=0 {continue}\n  fmt.Fprintf(&b,"%d. %s %s x%d @ %.2f\\n",i+1,o.ID,o.Symbol,o.Qty,o.Price)\n}\nreturn b.String()\n}\n';
  const GO_BAD = 'package orders\n\nfunc Total(list []Order) float64 {\n\tsum := 0.0\n\tfor _, o := range list {\n\t\tsum += o.Notional(\n\t}\n\treturn sum\n}\n';
  const CPP = '#include <vector>\n#include <string>\nnamespace demo{\nstruct Order{std::string id;std::string symbol;int qty;double price;};\nclass OrderBook{\npublic:\nvoid add(const Order& o){if(o.qty<=0)return;orders_.push_back(o);}\ndouble notional() const{double s=0;for(const auto& o:orders_){s+=o.qty*o.price;}return s;}\nprivate:\nstd::vector<Order> orders_;\n};\n}  // namespace demo\n';
  const JAVA = 'package demo.orders;\nimport java.util.List;\npublic class OrderBook{\nprivate final List<Order> orders;\npublic OrderBook(List<Order> orders){this.orders=orders;}\npublic double notional(){return orders.stream().filter(o->o.qty()>0).mapToDouble(o->o.qty()*o.price()).sum();}\n}\n';
  const CS = 'namespace Demo.Orders{\npublic record Order(string Id,string Symbol,int Qty,decimal Price);\npublic static class OrderMath{\npublic static decimal Notional(IEnumerable<Order> list)=>list.Where(o=>o.Qty>0).Sum(o=>o.Qty*o.Price);\n}\n}\n';
  const PY = 'import json\nfrom dataclasses import dataclass\n@dataclass\nclass Order :\n    id:str\n    symbol:str\n    qty:int\n    price:float\ndef notional(orders:list[Order])->float:\n  return sum( o.qty*o.price for o in orders if o.qty>0 )\ndef to_json(orders):\n    return json.dumps([{ \'id\':o.id,\'symbol\':o.symbol,"qty":o.qty } for o in orders],indent=2)\nif __name__=="__main__":\n    book=[Order("ORD-1","ACME",100,25.5),Order(\'ORD-2\',\'DEMO\',0,10.0)]\n    print(notional(book),to_json(book))\n';
  const PY_BAD = 'def settle(orders):\n    for o in orders:\n        if o.qty > 0\n            print(o.id)\n';
  return {
    "format-go": { payload: () => ({ v: 1, views: [[t("orders.go", GO), t("broken.go", GO_BAD)], []], run: "format" }) },
    "format-cpp-clang": { payload: () => ({ v: 1, views: [[t("order_book.cpp", CPP), t("OrderBook.java", JAVA), t("OrderMath.cs", CS)], []], run: "format", opts: { clang: "Google" } }) },
    "format-python-ruff": { payload: () => ({ v: 1, views: [[t("orders.py", PY), t("broken.py", PY_BAD)], []], run: "format" }) },
  };
})());
