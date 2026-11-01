Object.assign(DBML_SAMPLES, {
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
  "c4-crypto-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project ledger_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Wallet Service: double-entry ledger'
}

Enum entry_type {
  deposit
  withdrawal
  trade
  fee
}

Table accounts [headercolor: #1168bd] {
  id uuid [pk]
  user_id uuid [not null]
  asset varchar(12) [not null]
  available decimal(38,18) [not null, default: 0]
  locked decimal(38,18) [not null, default: 0]

  indexes {
    (user_id, asset) [unique]
  }
}

Table journal_entries {
  id uuid [pk]
  entry_type entry_type [not null]
  reference_id varchar(64) [not null, unique]
  created_at timestamp [not null]
}

Table journal_lines {
  id bigint [pk, increment]
  entry_id uuid [not null, ref: > journal_entries.id]
  account_id uuid [not null, ref: > accounts.id]
  amount decimal(38,18) [not null, note: 'Lines of one entry sum to zero']
}

Table withdrawals [headercolor: #b45309] {
  id uuid [pk]
  account_id uuid [not null, ref: > accounts.id]
  address varchar(128) [not null]
  amount decimal(38,18) [not null]
  tx_hash varchar(128) [unique]
  status varchar(20) [not null]
}`, "C4 — Sàn tiền ảo"],
  "c4-game-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project player_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Player Service: profiles and ratings'
}

Enum platform_type {
  pc
  android
  ios
}

Table players [headercolor: #1168bd] {
  id uuid [pk]
  display_name varchar(32) [not null, unique]
  platform platform_type [not null]
  region varchar(8) [not null]
  created_at timestamp [not null]
}

Table skill_ratings {
  player_id uuid [ref: > players.id]
  queue varchar(16)
  rating int [not null]
  deviation int [not null]

  indexes {
    (player_id, queue) [pk]
  }
}

Table match_history {
  id bigint [pk, increment]
  player_id uuid [not null, ref: > players.id]
  match_id uuid [not null]
  result varchar(8) [not null]
  rating_change int [not null]
  played_at timestamp [not null]
}

Table friendships {
  player_id uuid [ref: > players.id]
  friend_id uuid [ref: > players.id]
  since timestamp [not null]

  indexes {
    (player_id, friend_id) [pk]
  }
}`, "C4 — Game online"],
  "c4-logistics-code": ["L4 — Mã nguồn (Code): ERD dữ liệu", `Project dispatch_db {
  database_type: 'PostgreSQL'
  Note: 'C4 level 4 of the Dispatch Service: runs and stops'
}

Enum run_status {
  planned
  assigned
  in_progress
  completed
}

Table delivery_runs [headercolor: #1168bd] {
  id uuid [pk]
  driver_id uuid
  status run_status [not null]
  planned_date date [not null]
  depot_code varchar(12) [not null]
}

Table stops {
  id uuid [pk]
  run_id uuid [not null, ref: > delivery_runs.id]
  sequence int [not null]
  parcel_id uuid [not null]
  latitude decimal(9,6) [not null]
  longitude decimal(9,6) [not null]
  window_from timestamp
  window_to timestamp

  indexes {
    (run_id, sequence) [unique]
  }
}

Table driver_positions [headercolor: #b45309] {
  driver_id uuid [pk]
  latitude decimal(9,6) [not null]
  longitude decimal(9,6) [not null]
  reported_at timestamp [not null]
}`, "C4 — Logistics"],
});
