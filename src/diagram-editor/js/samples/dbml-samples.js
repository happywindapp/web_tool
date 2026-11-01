const DBML_SAMPLES = {
  shop: ["Cửa hàng online", `Project shop {
  database_type: 'PostgreSQL'
  Note: 'Sample online shop schema'
}

Enum order_status {
  pending
  paid
  shipped
  cancelled
}

Table customers [headercolor: #0e7490] {
  id int [pk, increment]
  email varchar(255) [not null, unique]
  full_name varchar(100) [not null]
  created_at timestamp
}

Table orders [headercolor: #15803d] {
  id int [pk, increment]
  customer_id int [not null, ref: > customers.id]
  status order_status [not null]
  total decimal(12,2)
  created_at timestamp
}

Table order_lines {
  order_id int [ref: > orders.id]
  product_id int [ref: > products.id]
  quantity int [not null]
  unit_price decimal(12,2)

  indexes {
    (order_id, product_id) [pk]
  }
}

Table products {
  id int [pk, increment]
  sku varchar(32) [unique]
  name varchar(200) [not null]
  price decimal(12,2)
}`],
  groups: ["Nhóm bảng & quan hệ 1-1", `Table accounts {
  id int [pk]
  owner_name varchar
}

Table account_settings {
  account_id int [pk]
  locale varchar
}

Table trades {
  id int [pk]
  account_id int
  symbol_id int
  quantity int
}

Table symbols {
  id int [pk]
  code varchar [unique]
}

TableGroup customer_data [color: #0e7490] {
  accounts
  account_settings
}

TableGroup market_data [color: #b45309] {
  trades
  symbols
}

Ref: account_settings.account_id - accounts.id
Ref: trades.account_id > accounts.id
Ref: trades.symbol_id > symbols.id`],
  broken: ["Mã lỗi — thử báo lỗi", `Table users {
  id int [pk]
  name
}

Ref: users.id > teams.id`],
};
