DBML_SAMPLES["db-crypto"] = ["Sàn tiền ảo (kiểu Binance)", `Project crypto_exchange {
  database_type: 'PostgreSQL'
  Note: 'Centralized crypto exchange: users and KYC, multi-network assets, custodial wallets with an append-only ledger, spot matching, perpetual futures, P2P, staking and compliance. Fictional schema.'
}

Enum user_status {
  active
  withdrawal_locked
  frozen
  closed
}

Enum kyc_level {
  none
  basic
  intermediate
  advanced
}

Enum kyc_review_status {
  submitted
  approved
  rejected
}

Enum network_status {
  enabled
  deposit_only
  withdraw_only
  suspended
}

Enum pair_status {
  pre_trading
  trading
  halted
  delisted
}

Enum wallet_type {
  spot
  funding
  futures
  earn
}

Enum custody_tier {
  hot
  warm
  cold
}

Enum ledger_reason {
  deposit
  withdrawal
  trade
  trade_fee
  transfer
  funding_fee
  realized_pnl
  liquidation
  p2p_escrow
  staking
  staking_redeem
  staking_reward
  withdrawal_refund
  deposit_reversal
  p2p_escrow_refund
}

Enum deposit_status {
  detected
  confirming
  credited
  reorged
  rejected
}

Enum withdrawal_status {
  requested
  risk_review
  approved
  broadcasting
  confirmed
  failed
  cancelled
}

Enum transfer_status {
  pending
  completed
  failed
}

Enum order_side {
  buy
  sell
}

Enum order_type {
  limit
  market
  stop_limit
  take_profit_limit
}

Enum time_in_force {
  gtc
  ioc
  fok
  post_only
}

Enum order_status {
  accepted
  partially_filled
  filled
  cancelled
  rejected
  expired
}

Enum candle_interval {
  m1
  m5
  m15
  h1
  h4
  d1
}

Enum margin_mode {
  cross
  isolated
}

Enum position_side {
  long
  short
}

Enum position_status {
  open
  closed
  liquidated
}

Enum liquidation_type {
  partial
  full
  auto_deleveraged
}

Enum insurance_entry_type {
  liquidation_surplus
  bankruptcy_cover
}

Enum ad_status {
  online
  paused
  closed
}

Enum p2p_order_status {
  created
  buyer_paid
  released
  cancelled
  disputed
}

Enum dispute_status {
  open
  resolved_for_buyer
  resolved_for_seller
}

Enum staking_status {
  active
  redeeming
  redeemed
}

Enum screening_result {
  clear
  flagged
  blocked
}

Table vip_tiers [headercolor: #0e7490] {
  tier smallint [pk]
  min_30d_volume_usd decimal(24,2) [not null]
  maker_fee_rate decimal(7,6) [not null]
  taker_fee_rate decimal(7,6) [not null]
  daily_withdrawal_limit_usd decimal(24,2) [not null]
}

Table users [headercolor: #0e7490] {
  id bigint [pk, increment]
  uid varchar(12) [not null, unique]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  totp_secret_encrypted varchar(255)
  vip_tier smallint [not null, default: 0, ref: > vip_tiers.tier]
  kyc_level kyc_level [not null, default: 'none']
  status user_status [not null, default: 'active']
  referrer_id bigint [ref: > users.id]
  created_at timestamp [not null]
}

Table kyc_submissions [headercolor: #0e7490] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  requested_level kyc_level [not null]
  full_name varchar(160) [not null]
  country char(2) [not null]
  document_key varchar(255) [not null]
  selfie_key varchar(255) [not null]
  status kyc_review_status [not null, default: 'submitted']
  submitted_at timestamp [not null]
  reviewed_at timestamp
}

Table api_keys [headercolor: #0e7490] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  key_id varchar(64) [not null, unique]
  secret_encrypted varchar(255) [not null, note: 'HMAC request signing needs the original secret, so a hash cannot verify it']
  can_trade boolean [not null, default: false]
  can_withdraw boolean [not null, default: false]
  ip_allowlist jsonb
  expires_at timestamp
  revoked_at timestamp
}

Table login_history [headercolor: #0e7490] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  ip_address varchar(45) [not null]
  device varchar(120)
  is_success boolean [not null]
  created_at timestamp [not null]

  indexes {
    (user_id, created_at)
  }
}

Table withdrawal_addresses [headercolor: #0e7490, note: 'Allowlist: a new address waits out a cooling period'] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  network_id int [not null, ref: > blockchain_networks.id]
  address varchar(128) [not null]
  memo varchar(64) [not null, default: '']
  label varchar(60)
  active_from timestamp [not null]
  revoked_at timestamp

  indexes {
    (user_id, network_id, address, memo) [unique]
  }
}

Table assets [headercolor: #1168bd] {
  id int [pk, increment]
  symbol varchar(16) [not null, unique]
  name varchar(80) [not null]
  decimals smallint [not null, note: 'Internal precision, on-chain decimals live in asset_networks']
  is_fiat boolean [not null, default: false]
  is_active boolean [not null, default: true]
}

Table blockchain_networks [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(16) [not null, unique]
  name varchar(80) [not null]
  explorer_url varchar(255)
  avg_block_seconds int [not null]
}

Table asset_networks [headercolor: #1168bd] {
  id int [pk, increment]
  asset_id int [not null, ref: > assets.id]
  network_id int [not null, ref: > blockchain_networks.id]
  contract_address varchar(128)
  token_decimals smallint [not null, note: 'The same token can use 6 on one chain and 18 on another']
  min_confirmations int [not null]
  min_withdrawal decimal(36,18) [not null]
  withdrawal_fee decimal(36,18) [not null]
  status network_status [not null, default: 'enabled']

  indexes {
    (asset_id, network_id) [unique]
  }
}

Table trading_pairs [headercolor: #1168bd] {
  id int [pk, increment]
  symbol varchar(24) [not null, unique]
  base_asset_id int [not null, ref: > assets.id]
  quote_asset_id int [not null, ref: > assets.id]
  price_tick decimal(36,18) [not null]
  quantity_step decimal(36,18) [not null]
  min_notional decimal(36,18) [not null]
  status pair_status [not null, default: 'pre_trading']
}

Table wallets [headercolor: #15803d] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  asset_id int [not null, ref: > assets.id]
  wallet_type wallet_type [not null]
  available decimal(36,18) [not null, default: 0]
  locked decimal(36,18) [not null, default: 0]
  version bigint [not null, default: 0]
  updated_at timestamp [not null]

  indexes {
    (user_id, asset_id, wallet_type) [unique]
  }
}

Table ledger_entries [headercolor: #15803d, note: 'Append-only: wallet balance is always the sum of its entries'] {
  id bigint [pk, increment]
  wallet_id bigint [not null, ref: > wallets.id]
  reason ledger_reason [not null]
  amount decimal(36,18) [not null, note: 'Signed: negative leaves the wallet']
  balance_after decimal(36,18) [not null]
  source_ref varchar(64) [not null]
  created_at timestamp [not null]

  indexes {
    (wallet_id, created_at)
    (reason, source_ref, wallet_id) [unique]
  }
}

Table internal_transfers [headercolor: #15803d] {
  id bigint [pk, increment]
  from_wallet_id bigint [not null, ref: > wallets.id]
  to_wallet_id bigint [not null, ref: > wallets.id]
  amount decimal(36,18) [not null]
  status transfer_status [not null, default: 'pending']
  created_at timestamp [not null]
}

Table custody_wallets [headercolor: #b45309] {
  id int [pk, increment]
  network_id int [not null, ref: > blockchain_networks.id]
  tier custody_tier [not null]
  address varchar(128) [not null]
  signer_policy varchar(40) [not null, note: 'Multisig or MPC threshold such as 3-of-5']
  is_active boolean [not null, default: true]

  indexes {
    (network_id, address) [unique]
  }
}

Table deposit_addresses [headercolor: #b45309] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  network_id int [not null, ref: > blockchain_networks.id]
  address varchar(128) [not null]
  memo varchar(64) [not null, default: '']
  created_at timestamp [not null]

  indexes {
    (network_id, address, memo) [unique]
    (user_id, network_id)
  }
}

Table deposits [headercolor: #b45309] {
  id bigint [pk, increment]
  deposit_address_id bigint [not null, ref: > deposit_addresses.id]
  asset_network_id int [not null, ref: > asset_networks.id]
  tx_hash varchar(128) [not null]
  log_index int [not null, default: 0]
  amount decimal(36,18) [not null]
  block_height bigint [not null]
  confirmations int [not null, default: 0]
  status deposit_status [not null, default: 'detected']
  detected_at timestamp [not null]
  credited_at timestamp

  indexes {
    (asset_network_id, tx_hash, log_index) [unique, note: 'Idempotent chain scan']
    (status, detected_at)
  }
}

Table withdrawals [headercolor: #b45309] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  address_id bigint [not null, ref: > withdrawal_addresses.id]
  to_address varchar(128) [not null, note: 'Snapshot for on-chain audit']
  to_memo varchar(64) [not null, default: '']
  asset_network_id int [not null, ref: > asset_networks.id]
  hot_wallet_id int [ref: > custody_wallets.id]
  idempotency_key varchar(64) [not null, unique]
  amount decimal(36,18) [not null]
  network_fee decimal(36,18) [not null]
  tx_hash varchar(128)
  status withdrawal_status [not null, default: 'requested']
  requested_at timestamp [not null]
  confirmed_at timestamp

  indexes {
    (user_id, requested_at)
    (status, requested_at)
  }
}

Table spot_orders [headercolor: #7c3aed] {
  id bigint [pk]
  client_order_id varchar(40)
  user_id bigint [not null, ref: > users.id]
  pair_id int [not null, ref: > trading_pairs.id]
  side order_side [not null]
  order_type order_type [not null]
  time_in_force time_in_force [not null, default: 'gtc']
  price decimal(36,18)
  stop_price decimal(36,18)
  quantity decimal(36,18) [note: 'Empty for market buys sized by quote_quantity']
  quote_quantity decimal(36,18)
  filled_quantity decimal(36,18) [not null, default: 0]
  filled_quote decimal(36,18) [not null, default: 0]
  status order_status [not null, default: 'accepted']
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    (user_id, client_order_id) [unique]
    (user_id, pair_id, status)
    (pair_id, created_at)
  }
}

Table spot_trades [headercolor: #7c3aed, note: 'One row per match, written from the engine event stream'] {
  id bigint [pk]
  pair_id int [not null, ref: > trading_pairs.id]
  maker_order_id bigint [not null, ref: > spot_orders.id]
  taker_order_id bigint [not null, ref: > spot_orders.id]
  taker_side order_side [not null]
  price decimal(36,18) [not null]
  quantity decimal(36,18) [not null]
  quote_amount decimal(36,18) [not null]
  sequence_no bigint [not null]
  executed_at timestamp [not null]

  indexes {
    (pair_id, sequence_no) [unique]
    (pair_id, executed_at)
    maker_order_id
    taker_order_id
  }
}

Table trade_fees [headercolor: #7c3aed] {
  id bigint [pk, increment]
  trade_id bigint [not null, ref: > spot_trades.id]
  user_id bigint [not null, ref: > users.id]
  fee_asset_id int [not null, ref: > assets.id]
  amount decimal(36,18) [not null]
  fee_rate decimal(7,6) [not null]
  is_maker boolean [not null]

  indexes {
    (trade_id, is_maker) [unique]
  }
}

Table candles [headercolor: #7c3aed] {
  pair_id int [ref: > trading_pairs.id]
  interval candle_interval
  open_time timestamp
  open_price decimal(36,18) [not null]
  high_price decimal(36,18) [not null]
  low_price decimal(36,18) [not null]
  close_price decimal(36,18) [not null]
  base_volume decimal(36,18) [not null]
  quote_volume decimal(36,18) [not null]
  trade_count int [not null]

  indexes {
    (pair_id, interval, open_time) [pk]
  }
}

Table perpetual_contracts [headercolor: #be123c] {
  id int [pk, increment]
  symbol varchar(24) [not null, unique]
  underlying_asset_id int [not null, ref: > assets.id]
  margin_asset_id int [not null, ref: > assets.id]
  max_leverage smallint [not null]
  maintenance_margin_rate decimal(7,6) [not null]
  funding_interval_hours smallint [not null, default: 8]
  status pair_status [not null, default: 'pre_trading']
}

Table futures_positions [headercolor: #be123c] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  contract_id int [not null, ref: > perpetual_contracts.id]
  side position_side [not null]
  margin_mode margin_mode [not null]
  leverage smallint [not null]
  quantity decimal(36,18) [not null]
  entry_price decimal(36,18) [not null]
  isolated_margin decimal(36,18) [not null, default: 0]
  realized_pnl decimal(36,18) [not null, default: 0]
  liquidation_price decimal(36,18)
  status position_status [not null, default: 'open']
  opened_at timestamp [not null]
  closed_at timestamp

  indexes {
    (user_id, contract_id, status)
    (contract_id, status)
  }
}

Table futures_orders [headercolor: #be123c] {
  id bigint [pk]
  user_id bigint [not null, ref: > users.id]
  contract_id int [not null, ref: > perpetual_contracts.id]
  position_id bigint [ref: > futures_positions.id]
  side order_side [not null]
  order_type order_type [not null]
  price decimal(36,18)
  quantity decimal(36,18) [not null]
  filled_quantity decimal(36,18) [not null, default: 0]
  reduce_only boolean [not null, default: false]
  status order_status [not null, default: 'accepted']
  created_at timestamp [not null]

  indexes {
    (user_id, contract_id, status)
  }
}

Table futures_fills [headercolor: #be123c] {
  id bigint [pk, increment]
  order_id bigint [not null, ref: > futures_orders.id]
  position_id bigint [not null, ref: > futures_positions.id]
  fee_asset_id int [not null, ref: > assets.id]
  price decimal(36,18) [not null]
  quantity decimal(36,18) [not null]
  fee_amount decimal(36,18) [not null]
  realized_pnl decimal(36,18) [not null, default: 0]
  is_maker boolean [not null]
  sequence_no bigint [not null]
  executed_at timestamp [not null]

  indexes {
    (order_id, sequence_no) [unique]
    position_id
  }
}

Table funding_rates [headercolor: #be123c] {
  id bigint [pk, increment]
  contract_id int [not null, ref: > perpetual_contracts.id]
  funding_time timestamp [not null]
  funding_rate decimal(12,8) [not null]
  mark_price decimal(36,18) [not null]

  indexes {
    (contract_id, funding_time) [unique]
  }
}

Table funding_payments [headercolor: #be123c] {
  id bigint [pk, increment]
  position_id bigint [not null, ref: > futures_positions.id]
  funding_rate_id bigint [not null, ref: > funding_rates.id]
  amount decimal(36,18) [not null, note: 'Positive: received, negative: paid']

  indexes {
    (position_id, funding_rate_id) [unique]
  }
}

Table liquidations [headercolor: #be123c] {
  id bigint [pk, increment]
  position_id bigint [not null, ref: > futures_positions.id]
  liquidation_type liquidation_type [not null]
  mark_price decimal(36,18) [not null]
  quantity decimal(36,18) [not null]
  bankruptcy_price decimal(36,18) [not null]
  executed_at timestamp [not null]
}

Table insurance_fund_entries [headercolor: #be123c] {
  id bigint [pk, increment]
  asset_id int [not null, ref: > assets.id]
  liquidation_id bigint [ref: > liquidations.id]
  entry_type insurance_entry_type [not null]
  amount decimal(36,18) [not null]
  balance_after decimal(36,18) [not null]
  created_at timestamp [not null]
}

Table p2p_ads [headercolor: #0f766e] {
  id bigint [pk, increment]
  merchant_id bigint [not null, ref: > users.id]
  asset_id int [not null, ref: > assets.id]
  fiat_asset_id int [not null, ref: > assets.id]
  side order_side [not null]
  unit_price decimal(36,18) [not null]
  available_quantity decimal(36,18) [not null]
  min_fiat decimal(24,2) [not null]
  max_fiat decimal(24,2) [not null]
  payment_window_minutes int [not null, default: 15]
  status ad_status [not null, default: 'online']
}

Table p2p_orders [headercolor: #0f766e] {
  id bigint [pk, increment]
  ad_id bigint [not null, ref: > p2p_ads.id]
  buyer_id bigint [not null, ref: > users.id]
  seller_id bigint [not null, ref: > users.id]
  quantity decimal(36,18) [not null, note: 'Held in escrow from the seller funding wallet']
  fiat_amount decimal(24,2) [not null]
  status p2p_order_status [not null, default: 'created']
  expires_at timestamp [not null]
  created_at timestamp [not null]
  released_at timestamp

  indexes {
    buyer_id
    seller_id
  }
}

Table p2p_disputes [headercolor: #0f766e] {
  id bigint [pk, increment]
  order_id bigint [not null, unique, ref: - p2p_orders.id]
  opened_by bigint [not null, ref: > users.id]
  reason varchar(200) [not null]
  status dispute_status [not null, default: 'open']
  opened_at timestamp [not null]
  resolved_at timestamp
}

Table staking_products [headercolor: #0f766e] {
  id int [pk, increment]
  asset_id int [not null, ref: > assets.id]
  annual_rate decimal(7,4) [not null]
  lock_days int [not null, default: 0]
  min_amount decimal(36,18) [not null]
  total_quota decimal(36,18) [not null]
  is_active boolean [not null, default: true]
}

Table staking_subscriptions [headercolor: #0f766e] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  product_id int [not null, ref: > staking_products.id]
  annual_rate decimal(7,4) [not null, note: 'Rate locked at subscription']
  amount decimal(36,18) [not null]
  status staking_status [not null, default: 'active']
  started_at timestamp [not null]
  unlock_at timestamp

  indexes {
    user_id
  }
}

Table staking_rewards [headercolor: #0f766e] {
  id bigint [pk, increment]
  subscription_id bigint [not null, ref: > staking_subscriptions.id]
  reward_date date [not null]
  amount decimal(36,18) [not null]

  indexes {
    (subscription_id, reward_date) [unique]
  }
}

Table aml_screenings [headercolor: #475569] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  deposit_id bigint [ref: > deposits.id]
  withdrawal_id bigint [ref: > withdrawals.id]
  provider varchar(30) [not null]
  risk_score smallint [not null]
  result screening_result [not null]
  screened_at timestamp [not null]
}

Table audit_logs [headercolor: #475569] {
  id bigint [pk, increment]
  actor varchar(60) [not null]
  entity_type varchar(40) [not null]
  entity_id varchar(64) [not null]
  action varchar(40) [not null]
  ip_address varchar(45)
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

TableGroup users_security [color: #0e7490] {
  vip_tiers
  users
  kyc_submissions
  api_keys
  login_history
  withdrawal_addresses
}

TableGroup asset_registry [color: #1168bd] {
  assets
  blockchain_networks
  asset_networks
  trading_pairs
}

TableGroup wallet_ledger [color: #15803d] {
  wallets
  ledger_entries
  internal_transfers
}

TableGroup on_chain_custody [color: #b45309] {
  custody_wallets
  deposit_addresses
  deposits
  withdrawals
}

TableGroup spot_market [color: #7c3aed] {
  spot_orders
  spot_trades
  trade_fees
  candles
}

TableGroup perpetual_futures [color: #be123c] {
  perpetual_contracts
  futures_positions
  futures_orders
  futures_fills
  funding_rates
  funding_payments
  liquidations
  insurance_fund_entries
}

TableGroup p2p_and_earn [color: #0f766e] {
  p2p_ads
  p2p_orders
  p2p_disputes
  staking_products
  staking_subscriptions
  staking_rewards
}

TableGroup compliance_ops [color: #475569] {
  aml_screenings
  audit_logs
  outbox_events
}`, "Database đầy đủ"];
