DBML_SAMPLES["db-securities"] = ["Công ty chứng khoán", `Project securities_brokerage {
  database_type: 'PostgreSQL'
  Note: 'Equity brokerage back office: reference data, clients, order management, cash and stock balances, margin lending, T+2 settlement and fees. Fictional schema.'
}

Enum instrument_type {
  stock
  fund_certificate
  covered_warrant
  corporate_bond
}

Enum corporate_action_type {
  cash_dividend
  stock_dividend
  rights_issue
  shareholder_meeting
}

Enum entitlement_status {
  calculated
  confirmed
  paid
}

Enum client_type {
  individual
  institution
}

Enum kyc_status {
  pending
  verified
  rejected
  expired
}

Enum account_status {
  pending
  active
  restricted
  closed
}

Enum sub_account_type {
  normal
  margin
  derivative
}

Enum order_side {
  buy
  sell
}

Enum order_type {
  limit
  at_open
  at_close
  market_to_limit
}

Enum order_status {
  new
  pending_send
  accepted
  partially_filled
  filled
  pending_cancel
  cancelled
  rejected
  expired
}

Enum order_channel {
  web
  mobile
  broker_desk
  api
  system
}

Enum amendment_status {
  requested
  accepted
  rejected
}

Enum message_direction {
  inbound
  outbound
}

Enum hold_status {
  active
  partially_released
  released
  consumed
}

Enum cash_tx_type {
  deposit
  withdrawal
  trade_settlement
  dividend
  fee
  tax
  interest
  advance
  loan_disbursement
  loan_repayment
  internal_transfer
  rights_subscription
  adjustment
}

Enum transfer_direction {
  deposit
  withdrawal
}

Enum transfer_status {
  requested
  approved
  completed
  rejected
}

Enum advance_status {
  active
  settled
}

Enum stock_movement_type {
  deposit
  withdrawal
  buy_settlement
  sell_settlement
  stock_dividend
  rights_subscription
  block
  unblock
}

Enum contract_status {
  active
  suspended
  expired
  terminated
}

Enum loan_status {
  active
  overdue
  repaid
}

Enum margin_call_status {
  issued
  resolved
  force_sold
}

Enum settlement_status {
  pending
  confirmed
  settled
  failed
}

Enum fee_type {
  commission
  exchange_fee
  depository_fee
  sale_tax
}

Table exchanges [headercolor: #0e7490] {
  id int [pk, increment]
  code varchar(10) [not null, unique]
  name varchar(120) [not null]
  timezone varchar(40) [not null]
}

Table market_calendars [headercolor: #0e7490] {
  exchange_id int [ref: > exchanges.id]
  business_date date
  is_trading_day boolean [not null]
  settlement_date date [note: 'Trades of this day settle on this date']

  indexes {
    (exchange_id, business_date) [pk]
  }
}

Table instruments [headercolor: #0e7490] {
  id int [pk, increment]
  exchange_id int [not null, ref: > exchanges.id]
  symbol varchar(12) [not null]
  isin char(12) [not null, unique]
  instrument_type instrument_type [not null]
  name varchar(160) [not null]
  lot_size int [not null, default: 100]
  par_value decimal(18,2)
  listed_shares bigint
  is_active boolean [not null, default: true]

  indexes {
    (exchange_id, symbol) [unique]
  }
}

Table daily_price_limits [headercolor: #0e7490] {
  instrument_id int [ref: > instruments.id]
  business_date date
  reference_price decimal(18,4) [not null]
  ceiling_price decimal(18,4) [not null]
  floor_price decimal(18,4) [not null]
  close_price decimal(18,4)

  indexes {
    (instrument_id, business_date) [pk]
  }
}

Table corporate_actions [headercolor: #0e7490] {
  id bigint [pk, increment]
  instrument_id int [not null, ref: > instruments.id]
  action_type corporate_action_type [not null]
  ex_date date [not null]
  record_date date [not null]
  pay_date date
  cash_per_share decimal(18,4)
  ratio_held int [note: 'Two integers keep a 3:1 ratio exact']
  ratio_entitled int
  subscription_price decimal(18,4)
}

Table corporate_action_entitlements [headercolor: #0e7490] {
  id bigint [pk, increment]
  corporate_action_id bigint [not null, ref: > corporate_actions.id]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  record_quantity bigint [not null]
  entitled_cash decimal(18,2) [not null, default: 0]
  entitled_quantity bigint [not null, default: 0]
  subscribed_quantity bigint [not null, default: 0]
  tax_amount decimal(18,2) [not null, default: 0]
  status entitlement_status [not null, default: 'calculated']

  indexes {
    (corporate_action_id, sub_account_id) [unique]
  }
}

Table brokers [headercolor: #1168bd] {
  id int [pk, increment]
  broker_code varchar(12) [not null, unique]
  full_name varchar(120) [not null]
  license_no varchar(20) [not null, unique]
  branch_name varchar(60) [not null]
  is_active boolean [not null, default: true]
}

Table clients [headercolor: #1168bd] {
  id bigint [pk, increment]
  client_no varchar(20) [not null, unique]
  client_type client_type [not null]
  full_name varchar(160) [not null]
  identity_no varchar(30) [not null, unique]
  trading_code varchar(12) [unique, note: 'Issued by the depository to foreign investors']
  nationality char(2) [not null]
  tax_code varchar(20)
  kyc_status kyc_status [not null, default: 'pending']
  broker_id int [ref: > brokers.id]
  created_at timestamp [not null]
}

Table client_documents [headercolor: #1168bd] {
  id bigint [pk, increment]
  client_id bigint [not null, ref: > clients.id]
  doc_type varchar(30) [not null]
  storage_key varchar(255) [not null]
  expires_on date
  verified_at timestamp
}

Table trading_accounts [headercolor: #1168bd] {
  id bigint [pk, increment]
  account_no varchar(20) [not null, unique, note: 'Custody account registered at the depository']
  client_id bigint [not null, ref: > clients.id]
  status account_status [not null, default: 'pending']
  opened_on date
  closed_on date
}

Table sub_accounts [headercolor: #1168bd] {
  id bigint [pk, increment]
  trading_account_id bigint [not null, ref: > trading_accounts.id]
  sub_no char(2) [not null]
  sub_type sub_account_type [not null]
  status account_status [not null, default: 'active']

  indexes {
    (trading_account_id, sub_no) [unique]
  }
}

Table bank_links [headercolor: #1168bd] {
  id bigint [pk, increment]
  client_id bigint [not null, ref: > clients.id]
  bank_code varchar(11) [not null]
  bank_account_no varchar(34) [not null]
  account_name varchar(120) [not null]
  is_default boolean [not null, default: false]
  verified_at timestamp
}

Table orders [headercolor: #15803d] {
  id uuid [pk]
  client_order_id varchar(40) [not null, unique, note: 'Idempotency key, sent to the exchange gateway']
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  instrument_id int [not null, ref: > instruments.id]
  broker_id int [ref: > brokers.id]
  margin_call_id bigint [ref: > margin_calls.id, note: 'Set on force-sell orders']
  side order_side [not null]
  order_type order_type [not null]
  quantity bigint [not null]
  limit_price decimal(18,4)
  filled_quantity bigint [not null, default: 0]
  avg_fill_price decimal(18,4)
  status order_status [not null, default: 'new']
  channel order_channel [not null]
  exchange_order_id varchar(40)
  reject_reason varchar(120)
  business_date date [not null]
  version int [not null, default: 0, note: 'Optimistic locking']
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    (sub_account_id, business_date)
    (instrument_id, business_date, status)
    exchange_order_id
  }
}

Table order_amendments [headercolor: #15803d] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  old_quantity bigint [not null]
  new_quantity bigint [not null]
  old_price decimal(18,4)
  new_price decimal(18,4)
  status amendment_status [not null, default: 'requested']
  requested_at timestamp [not null]
}

Table order_status_history [headercolor: #15803d] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  from_status order_status
  to_status order_status [not null]
  reason varchar(120)
  changed_at timestamp [not null]

  indexes {
    order_id
  }
}

Table exchange_messages [headercolor: #15803d, note: 'Raw FIX traffic, kept for reconciliation and replay'] {
  id bigint [pk, increment]
  order_id uuid [ref: > orders.id]
  direction message_direction [not null]
  session_id varchar(40) [not null]
  session_date date [not null, note: 'Sequence numbers reset every day']
  msg_type varchar(4) [not null]
  seq_no bigint [not null]
  raw_message text [not null]
  logged_at timestamp [not null]

  indexes {
    (session_id, session_date, direction, seq_no) [unique]
    order_id
  }
}

Table executions [headercolor: #15803d] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  exec_id varchar(40) [not null, note: 'FIX ExecID is unique within a trading day only']
  quantity bigint [not null]
  price decimal(18,4) [not null]
  gross_value decimal(18,2) [not null]
  business_date date [not null]
  executed_at timestamp [not null]

  indexes {
    (order_id, executed_at)
    (order_id, exec_id) [unique]
  }
}

Table cash_balances [headercolor: #b45309] {
  sub_account_id bigint [pk, ref: - sub_accounts.id]
  balance decimal(18,2) [not null, default: 0]
  held_amount decimal(18,2) [not null, default: 0]
  receivable_t1 decimal(18,2) [not null, default: 0]
  receivable_t2 decimal(18,2) [not null, default: 0]
  version int [not null, default: 0]
  updated_at timestamp [not null]
}

Table cash_holds [headercolor: #b45309] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  order_id uuid [ref: > orders.id]
  cash_transfer_id bigint [ref: > cash_transfers.id, note: 'Withdrawal waiting for approval']
  amount decimal(18,2) [not null]
  released_amount decimal(18,2) [not null, default: 0]
  status hold_status [not null, default: 'active']
  created_at timestamp [not null]
  released_at timestamp

  indexes {
    order_id
  }
}

Table cash_transactions [headercolor: #b45309, note: 'Append-only cash ledger'] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  tx_type cash_tx_type [not null]
  amount decimal(18,2) [not null, note: 'Signed: negative leaves the account']
  balance_after decimal(18,2) [not null]
  source_ref varchar(64) [not null]
  business_date date [not null]
  posted_at timestamp [not null]

  indexes {
    (sub_account_id, posted_at)
    (sub_account_id, tx_type, source_ref) [unique]
  }
}

Table cash_transfers [headercolor: #b45309] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  bank_link_id bigint [not null, ref: > bank_links.id]
  direction transfer_direction [not null]
  amount decimal(18,2) [not null]
  status transfer_status [not null, default: 'requested']
  bank_ref varchar(40) [unique]
  requested_at timestamp [not null]
  completed_at timestamp
}

Table cash_advances [headercolor: #b45309, note: 'Advance on sale proceeds before settlement day'] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  amount decimal(18,2) [not null]
  fee_amount decimal(18,2) [not null]
  advance_on date [not null]
  repay_on date [not null]
  status advance_status [not null, default: 'active']
}

Table positions [headercolor: #7c3aed] {
  sub_account_id bigint [ref: > sub_accounts.id]
  instrument_id int [ref: > instruments.id]
  total_quantity bigint [not null, default: 0]
  available_quantity bigint [not null, default: 0]
  held_quantity bigint [not null, default: 0]
  receiving_quantity bigint [not null, default: 0, note: 'Bought, not settled yet']
  blocked_quantity bigint [not null, default: 0]
  avg_cost decimal(18,4) [not null, default: 0]
  version int [not null, default: 0]
  updated_at timestamp [not null]

  indexes {
    (sub_account_id, instrument_id) [pk]
    instrument_id
  }
}

Table stock_holds [headercolor: #7c3aed] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  instrument_id int [not null, ref: > instruments.id]
  order_id uuid [not null, ref: > orders.id]
  quantity bigint [not null]
  released_quantity bigint [not null, default: 0]
  status hold_status [not null, default: 'active']
  created_at timestamp [not null]

  indexes {
    order_id
  }
}

Table stock_movements [headercolor: #7c3aed, note: 'Append-only stock ledger'] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  instrument_id int [not null, ref: > instruments.id]
  movement_type stock_movement_type [not null]
  quantity bigint [not null, note: 'Signed: negative leaves the account']
  source_ref varchar(64) [not null]
  business_date date [not null]
  posted_at timestamp [not null]

  indexes {
    (sub_account_id, instrument_id, posted_at)
    (sub_account_id, instrument_id, movement_type, source_ref) [unique]
  }
}

Table margin_contracts [headercolor: #be123c] {
  id bigint [pk, increment]
  sub_account_id bigint [not null, ref: > sub_accounts.id]
  credit_limit decimal(18,2) [not null]
  annual_rate decimal(7,4) [not null]
  maintenance_ratio decimal(5,2) [not null]
  force_sell_ratio decimal(5,2) [not null]
  signed_on date [not null]
  expires_on date [not null]
  status contract_status [not null, default: 'active']

  indexes {
    (sub_account_id, signed_on) [unique]
  }
}

Table marginable_instruments [headercolor: #be123c] {
  instrument_id int [ref: > instruments.id]
  effective_from date
  loan_ratio decimal(5,2) [not null, note: 'Share of the price the broker lends']
  price_cap decimal(18,4)
  effective_to date

  indexes {
    (instrument_id, effective_from) [pk]
  }
}

Table margin_loans [headercolor: #be123c] {
  id bigint [pk, increment]
  contract_id bigint [not null, ref: > margin_contracts.id]
  order_id uuid [not null, ref: > orders.id]
  principal decimal(18,2) [not null]
  outstanding decimal(18,2) [not null]
  annual_rate decimal(7,4) [not null]
  disbursed_on date [not null]
  due_on date [not null]
  status loan_status [not null, default: 'active']

  indexes {
    (contract_id, status)
  }
}

Table margin_repayments [headercolor: #be123c] {
  id bigint [pk, increment]
  loan_id bigint [not null, ref: > margin_loans.id]
  cash_transaction_id bigint [not null, ref: > cash_transactions.id]
  principal_part decimal(18,2) [not null]
  interest_part decimal(18,2) [not null]
  repaid_at timestamp [not null]

  indexes {
    loan_id
  }
}

Table margin_interest_accruals [headercolor: #be123c] {
  id bigint [pk, increment]
  loan_id bigint [not null, ref: > margin_loans.id]
  accrual_date date [not null]
  amount decimal(18,6) [not null]

  indexes {
    (loan_id, accrual_date) [unique]
  }
}

Table margin_calls [headercolor: #be123c] {
  id bigint [pk, increment]
  contract_id bigint [not null, ref: > margin_contracts.id]
  business_date date [not null]
  asset_value decimal(18,2) [not null]
  debt_value decimal(18,2) [not null]
  margin_ratio decimal(5,2) [not null]
  required_amount decimal(18,2) [not null]
  due_on date [not null]
  status margin_call_status [not null, default: 'issued']
  resolved_at timestamp

  indexes {
    contract_id
  }
}

Table settlement_batches [headercolor: #0f766e] {
  id bigint [pk, increment]
  exchange_id int [not null, ref: > exchanges.id]
  trade_date date [not null]
  settlement_date date [not null]
  net_cash decimal(18,2) [not null, default: 0]
  status settlement_status [not null, default: 'pending']
  confirmed_at timestamp

  indexes {
    (exchange_id, trade_date) [unique]
  }
}

Table settlement_instructions [headercolor: #0f766e] {
  id bigint [pk, increment]
  batch_id bigint [not null, ref: > settlement_batches.id]
  execution_id bigint [not null, unique, ref: - executions.id]
  gross_value decimal(18,2) [not null]
  total_fees decimal(18,2) [not null, default: 0]
  net_amount decimal(18,2) [not null]
  status settlement_status [not null, default: 'pending']
  settled_at timestamp
}

Table fee_schedules [headercolor: #0f766e] {
  id int [pk, increment]
  fee_type fee_type [not null]
  channel order_channel
  min_order_value decimal(18,2) [not null, default: 0]
  rate decimal(7,5) [not null]
  effective_from date [not null]
  effective_to date
}

Table fee_charges [headercolor: #0f766e] {
  id bigint [pk, increment]
  execution_id bigint [not null, ref: > executions.id]
  schedule_id int [not null, ref: > fee_schedules.id]
  fee_type fee_type [not null]
  rate decimal(7,5) [not null]
  amount decimal(18,2) [not null]

  indexes {
    (execution_id, fee_type) [unique]
  }
}

Table audit_logs [headercolor: #475569] {
  id bigint [pk, increment]
  actor varchar(60) [not null]
  entity_type varchar(40) [not null]
  entity_id varchar(64) [not null]
  action varchar(40) [not null]
  before_data jsonb
  after_data jsonb
  created_at timestamp [not null]

  indexes {
    (entity_type, entity_id)
  }
}

Table outbox_events [headercolor: #475569, note: 'Transactional outbox: written with the business row, relayed to the broker'] {
  id bigint [pk, increment]
  aggregate_type varchar(40) [not null]
  aggregate_id varchar(64) [not null]
  event_type varchar(60) [not null]
  payload jsonb [not null]
  created_at timestamp [not null]
  published_at timestamp

  indexes {
    (published_at, id)
  }
}

TableGroup reference_data [color: #0e7490] {
  exchanges
  market_calendars
  instruments
  daily_price_limits
  corporate_actions
  corporate_action_entitlements
}

TableGroup clients_accounts [color: #1168bd] {
  brokers
  clients
  client_documents
  trading_accounts
  sub_accounts
  bank_links
}

TableGroup order_management [color: #15803d] {
  orders
  order_amendments
  order_status_history
  exchange_messages
  executions
}

TableGroup cash_management [color: #b45309] {
  cash_balances
  cash_holds
  cash_transactions
  cash_transfers
  cash_advances
}

TableGroup stock_positions [color: #7c3aed] {
  positions
  stock_holds
  stock_movements
}

TableGroup margin_lending [color: #be123c] {
  margin_contracts
  marginable_instruments
  margin_loans
  margin_repayments
  margin_interest_accruals
  margin_calls
}

TableGroup settlement_fees [color: #0f766e] {
  settlement_batches
  settlement_instructions
  fee_schedules
  fee_charges
}

TableGroup operations [color: #475569] {
  audit_logs
  outbox_events
}`, "Database đầy đủ"];
