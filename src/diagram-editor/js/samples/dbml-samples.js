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
  "c4-bank-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project transfer_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Transfer Service: saga state and outbox'
}

Enum saga_state {
  started
  debited
  sent
  completed
  compensated
}

Table transfers [headercolor: #1168bd] {
  id uuid [pk]
  idempotency_key varchar(64) [not null, unique]
  source_account varchar(20) [not null]
  target_account varchar(20) [not null]
  amount decimal(18,2) [not null]
  currency char(3) [not null]
  state saga_state [not null]
  created_at timestamp [not null]
}

Table saga_steps {
  id bigint [pk, increment]
  transfer_id uuid [not null, ref: > transfers.id]
  step_name varchar(40) [not null]
  status varchar(20) [not null]
  executed_at timestamp
}

Table outbox_events [headercolor: #b45309] {
  id bigint [pk, increment]
  transfer_id uuid [not null, ref: > transfers.id]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}`, "C4 — Ngân hàng"],
  "c4-securities-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project order_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Order Management Service: orders and executions'
}

Enum order_status {
  new
  pending
  partially_filled
  filled
  cancelled
  rejected
}

Enum order_side {
  buy
  sell
}

Table orders [headercolor: #1168bd] {
  id uuid [pk]
  account_no varchar(20) [not null]
  symbol varchar(12) [not null]
  side order_side [not null]
  quantity bigint [not null]
  filled_quantity bigint [not null, default: 0]
  limit_price decimal(18,4)
  status order_status [not null]
  created_at timestamp [not null]

  indexes {
    (account_no, created_at)
  }
}

Table executions {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  exec_id varchar(40) [not null, unique]
  last_quantity bigint [not null]
  last_price decimal(18,4) [not null]
  executed_at timestamp [not null]
}

Table order_status_history {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  from_status order_status
  to_status order_status [not null]
  changed_at timestamp [not null]
}`, "C4 — Chứng khoán"],
  "c4-shop-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project checkout_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Order Service: orders, lines and outbox'
}

Enum checkout_status {
  pending
  paid
  confirmed
  cancelled
}

Table orders [headercolor: #1168bd] {
  id uuid [pk]
  shopper_id uuid [not null]
  status checkout_status [not null]
  total_amount decimal(12,2) [not null]
  currency char(3) [not null]
  created_at timestamp [not null]
}

Table order_lines {
  order_id uuid [ref: > orders.id]
  sku varchar(32)
  quantity int [not null]
  unit_price decimal(12,2) [not null]

  indexes {
    (order_id, sku) [pk]
  }
}

Table payments {
  id uuid [pk]
  order_id uuid [not null, ref: > orders.id]
  provider_ref varchar(64) [unique]
  amount decimal(12,2) [not null]
  captured_at timestamp
}

Table outbox_events [headercolor: #b45309] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}`, "C4 — Mua sắm online"],
  "ddd-bank-aggregates": ["Aggregate → ERD theo bounded context", `Project transfers_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum transfer_status {
  submitted
  held
  debited
  completed
  failed
}

Table transfers [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  beneficiary_id uuid [not null, note: 'Other aggregate: id only, no FK']
  amount decimal(18,2) [not null]
  currency char(3) [not null]
  status transfer_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table transfer_legs {
  id uuid [pk]
  transfer_id uuid [not null, ref: > transfers.id]
  account_no varchar(20) [not null]
  direction varchar(6) [not null]
}

Table beneficiaries [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  nickname varchar(60)
  bank_code varchar(11) [not null]
  account_number varchar(34) [not null]
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id uuid [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup transfer_aggregate [color: #b45309] {
  transfers
  transfer_legs
}

TableGroup beneficiary_aggregate [color: #0e7490] {
  beneficiaries
}`, "DDD — Ngân hàng"],
  "ddd-securities-aggregates": ["Aggregate → ERD theo bounded context", `Project order_management_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum order_status {
  placed
  accepted
  partially_filled
  filled
  cancelled
}

Table orders [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  account_no varchar(20) [not null, note: 'Other aggregate: id only, no FK']
  symbol varchar(12) [not null]
  board varchar(8) [not null]
  quantity bigint [not null]
  limit_price decimal(18,4)
  status order_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table fills {
  id uuid [pk]
  order_id uuid [not null, ref: > orders.id]
  exec_id varchar(40) [not null, unique]
  quantity bigint [not null]
  price decimal(18,4) [not null]
}

Table trading_accounts [headercolor: #b45309] {
  account_no varchar(20) [pk, note: 'Aggregate root']
  status varchar(12) [not null]
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id uuid [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup order_aggregate [color: #b45309] {
  orders
  fills
}

TableGroup account_aggregate [color: #0e7490] {
  trading_accounts
}`, "DDD — Chứng khoán"],
  "ddd-shop-aggregates": ["Aggregate → ERD theo bounded context", `Project ordering_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum order_status {
  placed
  paid
  confirmed
  cancelled
}

Table orders [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  cart_id uuid [not null, note: 'Other aggregate: id only, no FK']
  status order_status [not null]
  total_amount decimal(12,2) [not null]
  currency char(3) [not null]
  ship_street varchar(120) [not null, note: 'ShippingAddress value object']
  ship_city varchar(60) [not null]
  ship_postal_code varchar(12) [not null]
  version int [not null, note: 'Optimistic locking']
}

Table order_lines {
  id uuid [pk]
  order_id uuid [not null, ref: > orders.id]
  sku varchar(32) [not null]
  quantity int [not null]
  unit_price decimal(12,2) [not null]
}

Table carts [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  shopper_id uuid [not null]
}

Table cart_items {
  cart_id uuid [ref: > carts.id]
  sku varchar(32)
  quantity int [not null]

  indexes {
    (cart_id, sku) [pk]
  }
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id uuid [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup order_aggregate [color: #b45309] {
  orders
  order_lines
}

TableGroup cart_aggregate [color: #0e7490] {
  carts
  cart_items
}`, "DDD — Mua sắm online"],
};
