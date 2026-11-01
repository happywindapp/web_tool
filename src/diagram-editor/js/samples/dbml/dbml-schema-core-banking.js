DBML_SAMPLES["db-banking"] = ["Ngân hàng (core banking)", `Project core_banking {
  database_type: 'PostgreSQL'
  Note: 'Retail core banking: customers and KYC, deposit accounts, double-entry ledger, payments, cards, lending, digital channels and compliance. Fictional schema.'
}

Enum customer_type {
  individual
  corporate
}

Enum kyc_status {
  pending
  verified
  rejected
  expired
}

Enum risk_rating {
  low
  medium
  high
}

Enum identity_type {
  national_id
  passport
  business_license
}

Enum account_status {
  pending
  active
  dormant
  frozen
  closed
}

Enum product_type {
  current
  savings
  term_deposit
}

Enum holder_role {
  primary
  joint
  authorized_signer
}

Enum hold_status {
  active
  captured
  released
  expired
}

Enum entry_direction {
  debit
  credit
}

Enum gl_class {
  asset
  liability
  equity
  income
  expense
}

Enum journal_status {
  draft
  posted
  reversed
}

Enum business_day_status {
  open
  closing
  closed
}

Enum payment_rail {
  internal
  interbank_instant
  rtgs
  swift
}

Enum payment_status {
  submitted
  held
  debited
  sent
  completed
  failed
  reversed
}

Enum schedule_frequency {
  weekly
  monthly
  quarterly
}

Enum card_type {
  debit
  prepaid
}

Enum card_status {
  issued
  active
  blocked
  expired
  closed
}

Enum authorization_status {
  approved
  declined
  reversed
  captured
}

Enum loan_application_status {
  draft
  submitted
  approved
  rejected
  cancelled
}

Enum loan_status {
  disbursed
  current
  overdue
  restructured
  written_off
  closed
}

Enum installment_status {
  due
  partially_paid
  paid
  overdue
}

Enum alert_status {
  open
  investigating
  escalated
  false_positive
  reported
}

Table branches [headercolor: #0e7490] {
  id int [pk, increment]
  code varchar(10) [not null, unique]
  name varchar(120) [not null]
  parent_id int [ref: > branches.id, note: 'Regional head office']
  city varchar(60) [not null]
  is_active boolean [not null, default: true]
}

Table employees [headercolor: #0e7490] {
  id int [pk, increment]
  branch_id int [not null, ref: > branches.id]
  employee_no varchar(12) [not null, unique]
  full_name varchar(120) [not null]
  job_role varchar(40) [not null]
  is_active boolean [not null, default: true]
}

Table customers [headercolor: #0e7490] {
  id bigint [pk, increment]
  cif_no varchar(20) [not null, unique, note: 'Customer information file number']
  customer_type customer_type [not null]
  full_name varchar(160) [not null]
  date_of_birth date
  tax_code varchar(20)
  nationality char(2) [not null]
  kyc_status kyc_status [not null, default: 'pending']
  risk_rating risk_rating [not null, default: 'low']
  home_branch_id int [not null, ref: > branches.id]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table customer_identities [headercolor: #0e7490] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  identity_type identity_type [not null]
  identity_no varchar(30) [not null]
  issued_on date [not null]
  expires_on date
  issuing_authority varchar(120)
  is_primary boolean [not null, default: false]

  indexes {
    (identity_type, identity_no) [unique]
  }
}

Table customer_addresses [headercolor: #0e7490] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  address_type varchar(12) [not null, note: 'home, mailing, business']
  line1 varchar(160) [not null]
  city varchar(60) [not null]
  country char(2) [not null]
  postal_code varchar(12)
}

Table kyc_reviews [headercolor: #0e7490] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  reviewer_id int [not null, ref: > employees.id]
  result kyc_status [not null]
  risk_rating risk_rating [not null]
  reviewed_at timestamp [not null]
  next_review_on date [not null]
}

Table deposit_products [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(120) [not null]
  product_type product_type [not null]
  currency char(3) [not null]
  min_balance decimal(18,2) [not null, default: 0]
  overdraft_allowed boolean [not null, default: false]
  is_active boolean [not null, default: true]
}

Table product_interest_rates [headercolor: #1168bd] {
  id bigint [pk, increment]
  product_id int [not null, ref: > deposit_products.id]
  tenor_months int [not null, default: 0]
  annual_rate decimal(7,4) [not null]
  effective_from date [not null]
  effective_to date

  indexes {
    (product_id, tenor_months, effective_from) [unique]
  }
}

Table accounts [headercolor: #1168bd] {
  id bigint [pk, increment]
  account_no varchar(20) [not null, unique]
  product_id int [not null, ref: > deposit_products.id]
  branch_id int [not null, ref: > branches.id]
  currency char(3) [not null]
  status account_status [not null, default: 'pending']
  ledger_balance decimal(18,2) [not null, default: 0]
  held_amount decimal(18,2) [not null, default: 0]
  opened_on date
  closed_on date
  version int [not null, default: 0, note: 'Optimistic locking']
}

Table account_holders [headercolor: #1168bd] {
  account_id bigint [ref: > accounts.id]
  customer_id bigint [ref: > customers.id]
  role holder_role [not null]

  indexes {
    (account_id, customer_id) [pk]
    customer_id
  }
}

Table account_holds [headercolor: #1168bd] {
  id bigint [pk, increment]
  account_id bigint [not null, ref: > accounts.id]
  amount decimal(18,2) [not null]
  reason varchar(40) [not null]
  status hold_status [not null, default: 'active']
  expires_at timestamp
  created_at timestamp [not null]

  indexes {
    (account_id, status)
    (status, expires_at)
  }
}

Table account_transactions [headercolor: #1168bd] {
  id bigint [pk, increment]
  account_id bigint [not null, ref: > accounts.id]
  journal_entry_id bigint [not null, ref: > journal_entries.id]
  direction entry_direction [not null]
  amount decimal(18,2) [not null]
  balance_after decimal(18,2) [not null]
  value_date date [not null]
  description varchar(200)
  posted_at timestamp [not null]

  indexes {
    (account_id, posted_at)
  }
}

Table term_deposits [headercolor: #1168bd] {
  account_id bigint [pk, ref: - accounts.id]
  funding_account_id bigint [not null, ref: > accounts.id]
  principal decimal(18,2) [not null]
  annual_rate decimal(7,4) [not null]
  tenor_months int [not null]
  start_on date [not null]
  maturity_on date [not null]
  auto_rollover boolean [not null, default: false]

  indexes {
    maturity_on
  }
}

Table interest_accruals [headercolor: #1168bd] {
  id bigint [pk, increment]
  account_id bigint [not null, ref: > accounts.id]
  accrual_date date [not null]
  annual_rate decimal(7,4) [not null]
  amount decimal(18,6) [not null]

  indexes {
    (account_id, accrual_date) [unique]
  }
}

Table business_days [headercolor: #15803d] {
  business_date date [pk]
  status business_day_status [not null]
  opened_at timestamp [not null]
  closed_at timestamp
}

Table gl_accounts [headercolor: #15803d] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(120) [not null]
  gl_class gl_class [not null]
  parent_id int [ref: > gl_accounts.id]
  is_postable boolean [not null, default: true]
}

Table journal_entries [headercolor: #15803d, note: 'Amounts are immutable once posted: corrections are reversal entries'] {
  id bigint [pk, increment]
  entry_no varchar(24) [not null, unique]
  business_date date [not null, ref: > business_days.business_date]
  status journal_status [not null, default: 'draft']
  source_module varchar(20) [not null]
  source_ref varchar(64) [not null]
  reversal_of_id bigint [unique, ref: > journal_entries.id]
  maker_id int [ref: > employees.id]
  checker_id int [ref: > employees.id]
  posted_at timestamp

  indexes {
    (source_module, source_ref) [unique]
    business_date
  }
}

Table journal_lines [headercolor: #15803d, note: 'Debits equal credits per entry and currency, cross-currency entries go through FX position accounts'] {
  id bigint [pk, increment]
  journal_entry_id bigint [not null, ref: > journal_entries.id]
  gl_account_id int [not null, ref: > gl_accounts.id]
  direction entry_direction [not null]
  amount decimal(18,2) [not null]
  currency char(3) [not null]

  indexes {
    journal_entry_id
    gl_account_id
  }
}

Table fx_rates [headercolor: #15803d] {
  id bigint [pk, increment]
  base_currency char(3) [not null]
  quote_currency char(3) [not null]
  buy_rate decimal(18,6) [not null]
  sell_rate decimal(18,6) [not null]
  effective_at timestamp [not null]

  indexes {
    (base_currency, quote_currency, effective_at) [unique]
  }
}

Table beneficiaries [headercolor: #b45309] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  nickname varchar(60)
  bank_code varchar(11) [not null]
  account_no varchar(34) [not null]
  account_name varchar(120) [not null]
  created_at timestamp [not null]

  indexes {
    (customer_id, bank_code, account_no) [unique]
  }
}

Table payment_orders [headercolor: #b45309] {
  id uuid [pk]
  idempotency_key varchar(64) [not null, unique]
  customer_id bigint [not null, ref: > customers.id]
  debit_account_id bigint [not null, ref: > accounts.id]
  beneficiary_id bigint [ref: > beneficiaries.id, note: 'Saved payee, empty for one-off payments']
  standing_order_id bigint [ref: > standing_orders.id]
  to_bank_code varchar(11) [not null]
  to_account_no varchar(34) [not null]
  to_account_name varchar(120) [not null, note: 'Destination snapshot, later payee edits do not touch old payments']
  hold_id bigint [ref: > account_holds.id]
  journal_entry_id bigint [ref: > journal_entries.id]
  rail payment_rail [not null]
  amount decimal(18,2) [not null]
  currency char(3) [not null]
  fee_amount decimal(18,2) [not null, default: 0]
  fx_rate_id bigint [ref: > fx_rates.id, note: 'Rate applied when the currency differs from the account']
  status payment_status [not null, default: 'submitted']
  external_ref varchar(64)
  requested_at timestamp [not null]
  completed_at timestamp

  indexes {
    (debit_account_id, requested_at)
    (status, requested_at)
  }
}

Table payment_status_history [headercolor: #b45309] {
  id bigint [pk, increment]
  payment_id uuid [not null, ref: > payment_orders.id]
  from_status payment_status
  to_status payment_status [not null]
  reason_code varchar(20)
  changed_at timestamp [not null]

  indexes {
    payment_id
  }
}

Table standing_orders [headercolor: #b45309] {
  id bigint [pk, increment]
  debit_account_id bigint [not null, ref: > accounts.id]
  beneficiary_id bigint [not null, ref: > beneficiaries.id]
  amount decimal(18,2) [not null]
  frequency schedule_frequency [not null]
  next_run_on date [not null]
  end_on date
  is_active boolean [not null, default: true]

  indexes {
    (is_active, next_run_on)
  }
}

Table cards [headercolor: #7c3aed] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  account_id bigint [not null, ref: > accounts.id]
  pan_token varchar(64) [not null, unique, note: 'Vault token, the full PAN is never stored here']
  last4 char(4) [not null]
  card_type card_type [not null]
  status card_status [not null, default: 'issued']
  daily_limit decimal(18,2) [not null]
  expires_on date [not null]

  indexes {
    customer_id
  }
}

Table card_authorizations [headercolor: #7c3aed] {
  id bigint [pk, increment]
  card_id bigint [not null, ref: > cards.id]
  hold_id bigint [ref: > account_holds.id]
  retrieval_ref char(12) [not null]
  merchant_name varchar(120) [not null]
  merchant_category char(4) [not null]
  amount decimal(18,2) [not null]
  currency char(3) [not null]
  status authorization_status [not null]
  response_code char(2) [not null]
  authorized_at timestamp [not null]

  indexes {
    (card_id, authorized_at)
    retrieval_ref
  }
}

Table card_settlements [headercolor: #7c3aed] {
  id bigint [pk, increment]
  card_id bigint [not null, ref: > cards.id]
  authorization_id bigint [ref: > card_authorizations.id, note: 'Empty for merchant refunds and force posts']
  journal_entry_id bigint [not null, ref: > journal_entries.id]
  settled_amount decimal(18,2) [not null]
  currency char(3) [not null]
  settled_on date [not null]
}

Table loan_products [headercolor: #be123c] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(120) [not null]
  annual_rate decimal(7,4) [not null]
  max_tenor_months int [not null]
  max_amount decimal(18,2) [not null]
}

Table loan_applications [headercolor: #be123c] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  product_id int [not null, ref: > loan_products.id]
  officer_id int [not null, ref: > employees.id]
  approver_id int [ref: > employees.id]
  requested_amount decimal(18,2) [not null]
  tenor_months int [not null]
  status loan_application_status [not null, default: 'draft']
  submitted_at timestamp
  decided_at timestamp
}

Table loans [headercolor: #be123c] {
  id bigint [pk, increment]
  loan_no varchar(20) [not null, unique]
  application_id bigint [not null, unique, ref: - loan_applications.id]
  customer_id bigint [not null, ref: > customers.id]
  disbursement_account_id bigint [not null, ref: > accounts.id]
  principal decimal(18,2) [not null]
  outstanding_principal decimal(18,2) [not null]
  annual_rate decimal(7,4) [not null]
  start_on date [not null]
  maturity_on date [not null]
  status loan_status [not null]
  days_past_due int [not null, default: 0]
  debt_group smallint [not null, default: 1, note: 'Credit classification group 1 to 5']

  indexes {
    customer_id
  }
}

Table repayment_schedules [headercolor: #be123c] {
  id bigint [pk, increment]
  loan_id bigint [not null, ref: > loans.id]
  schedule_version smallint [not null, default: 1, note: 'Bumped when the loan is restructured']
  installment_no int [not null]
  due_on date [not null]
  principal_due decimal(18,2) [not null]
  interest_due decimal(18,2) [not null]
  paid_amount decimal(18,2) [not null, default: 0]
  status installment_status [not null, default: 'due']

  indexes {
    (loan_id, schedule_version, installment_no) [unique]
    (status, due_on)
  }
}

Table loan_repayments [headercolor: #be123c] {
  id bigint [pk, increment]
  loan_id bigint [not null, ref: > loans.id]
  schedule_id bigint [not null, ref: > repayment_schedules.id]
  journal_entry_id bigint [not null, ref: > journal_entries.id]
  principal_part decimal(18,2) [not null]
  interest_part decimal(18,2) [not null]
  penalty_part decimal(18,2) [not null, default: 0]
  paid_at timestamp [not null]

  indexes {
    loan_id
  }
}

Table collaterals [headercolor: #be123c] {
  id bigint [pk, increment]
  owner_id bigint [not null, ref: > customers.id]
  collateral_type varchar(30) [not null]
  description varchar(240) [not null]
  appraised_value decimal(18,2) [not null]
  appraised_on date [not null]
}

Table loan_collaterals [headercolor: #be123c] {
  loan_id bigint [ref: > loans.id]
  collateral_id bigint [ref: > collaterals.id]
  pledged_value decimal(18,2) [not null]

  indexes {
    (loan_id, collateral_id) [pk]
  }
}

Table digital_users [headercolor: #0f766e] {
  id bigint [pk, increment]
  customer_id bigint [not null, unique, ref: - customers.id]
  username varchar(60) [not null, unique]
  password_hash varchar(255) [not null]
  mfa_enabled boolean [not null, default: true]
  is_locked boolean [not null, default: false]
  last_login_at timestamp
}

Table user_devices [headercolor: #0f766e] {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > digital_users.id]
  device_fingerprint varchar(128) [not null]
  platform varchar(12) [not null]
  is_trusted boolean [not null, default: false]
  last_seen_at timestamp

  indexes {
    (user_id, device_fingerprint) [unique]
  }
}

Table login_sessions [headercolor: #0f766e] {
  id uuid [pk]
  user_id bigint [not null, ref: > digital_users.id]
  device_id bigint [ref: > user_devices.id]
  ip_address varchar(45) [not null]
  started_at timestamp [not null]
  ended_at timestamp
}

Table aml_alerts [headercolor: #475569] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  payment_id uuid [ref: > payment_orders.id]
  assignee_id int [ref: > employees.id]
  rule_code varchar(20) [not null]
  severity risk_rating [not null]
  status alert_status [not null, default: 'open']
  raised_at timestamp [not null]
  closed_at timestamp

  indexes {
    (status, raised_at)
  }
}

Table audit_logs [headercolor: #475569] {
  id bigint [pk, increment]
  actor_id int [ref: > employees.id]
  entity_type varchar(40) [not null]
  entity_id varchar(64) [not null]
  action varchar(40) [not null]
  before_data jsonb
  after_data jsonb
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

TableGroup customer_party [color: #0e7490] {
  branches
  employees
  customers
  customer_identities
  customer_addresses
  kyc_reviews
}

TableGroup deposit_accounts [color: #1168bd] {
  deposit_products
  product_interest_rates
  accounts
  account_holders
  account_holds
  account_transactions
  term_deposits
  interest_accruals
}

TableGroup general_ledger [color: #15803d] {
  business_days
  gl_accounts
  journal_entries
  journal_lines
  fx_rates
}

TableGroup payments [color: #b45309] {
  beneficiaries
  payment_orders
  payment_status_history
  standing_orders
}

TableGroup card_issuing [color: #7c3aed] {
  cards
  card_authorizations
  card_settlements
}

TableGroup lending [color: #be123c] {
  loan_products
  loan_applications
  loans
  repayment_schedules
  loan_repayments
  collaterals
  loan_collaterals
}

TableGroup digital_channels [color: #0f766e] {
  digital_users
  user_devices
  login_sessions
}

TableGroup compliance_ops [color: #475569] {
  aml_alerts
  audit_logs
  outbox_events
}`, "Database đầy đủ"];
