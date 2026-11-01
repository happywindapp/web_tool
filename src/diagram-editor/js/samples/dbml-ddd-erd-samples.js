Object.assign(DBML_SAMPLES, {
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
  routed
  partially_filled
  filled
  rejected
  cancelled
}

Table orders [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  account_no varchar(20) [not null, note: 'Other aggregate: id only, no FK']
  symbol varchar(12) [not null]
  board varchar(8) [not null]
  side varchar(4) [not null]
  quantity bigint [not null]
  limit_price decimal(18,4)
  status order_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table executions {
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
  executions
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
  "ddd-crypto-aggregates": ["Aggregate → ERD theo bounded context", `Project spot_trading_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum order_status {
  placed
  open
  partially_filled
  filled
  cancelled
}

Table orders [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  account_id uuid [not null]
  pair varchar(20) [not null, note: 'Other aggregate: key only, no FK']
  side varchar(4) [not null]
  quantity decimal(38,18) [not null]
  price decimal(38,18)
  status order_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table trades {
  id uuid [pk]
  order_id uuid [not null, ref: > orders.id]
  quantity decimal(38,18) [not null]
  price decimal(38,18) [not null]
}

Table order_books [headercolor: #b45309] {
  pair varchar(20) [pk, note: 'Aggregate root']
  last_sequence bigint [not null]
}

Table price_levels {
  pair varchar(20) [ref: > order_books.pair]
  side varchar(4)
  price decimal(38,18)
  total_quantity decimal(38,18) [not null]

  indexes {
    (pair, side, price) [pk]
  }
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id varchar(64) [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup order_aggregate [color: #b45309] {
  orders
  trades
}

TableGroup order_book_aggregate [color: #0e7490] {
  order_books
  price_levels
}`, "DDD — Sàn tiền ảo"],
  "ddd-game-aggregates": ["Aggregate → ERD theo bounded context", `Project matchmaking_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum ticket_status {
  queued
  matched
  cancelled
  expired
}

Table match_tickets [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  region varchar(8) [not null]
  max_latency_ms int [not null]
  status ticket_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table ticket_members {
  ticket_id uuid [ref: > match_tickets.id]
  player_id uuid
  rating int [not null]
  deviation int [not null]

  indexes {
    (ticket_id, player_id) [pk]
  }
}

Table game_matches [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  server_id varchar(40)
  status varchar(16) [not null]
  created_at timestamp [not null]
}

Table match_teams {
  id uuid [pk]
  match_id uuid [not null, ref: > game_matches.id]
  ticket_ids uuid[] [not null, note: 'Other aggregate: ids only, no FK']
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id uuid [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup ticket_aggregate [color: #b45309] {
  match_tickets
  ticket_members
}

TableGroup game_match_aggregate [color: #0e7490] {
  game_matches
  match_teams
}`, "DDD — Game online"],
  "ddd-logistics-aggregates": ["Aggregate → ERD theo bounded context", `Project dispatch_context {
  database_type: 'PostgreSQL'
  Note: 'One schema per bounded context. Aggregates reference each other by id only, so there is no FK between them.'
}

Enum run_status {
  planned
  assigned
  in_progress
  completed
}

Table delivery_runs [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  driver_id uuid
  status run_status [not null]
  version int [not null, note: 'Optimistic locking']
}

Table stops {
  id uuid [pk]
  run_id uuid [not null, ref: > delivery_runs.id]
  sequence int [not null]
  parcel_id uuid [not null, note: 'Other aggregate: id only, no FK']
  latitude decimal(9,6) [not null, note: 'GeoPoint value object']
  longitude decimal(9,6) [not null]
  window_from timestamp [note: 'TimeWindow value object']
  window_to timestamp
}

Table parcels [headercolor: #b45309] {
  id uuid [pk, note: 'Aggregate root']
  status varchar(16) [not null]
  weight_kg decimal(8,3) [not null, note: 'ParcelSize value object']
  volume_litres decimal(8,2) [not null]
  version int [not null, note: 'Optimistic locking']
}

Table domain_events [headercolor: #0e7490] {
  id uuid [pk]
  aggregate_id uuid [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  published_at timestamp
}

TableGroup run_aggregate [color: #b45309] {
  delivery_runs
  stops
}

TableGroup parcel_aggregate [color: #0e7490] {
  parcels
}`, "DDD — Logistics"],
});
