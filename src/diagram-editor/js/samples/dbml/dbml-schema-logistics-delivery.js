DBML_SAMPLES["db-logistics"] = ["Logistics & giao hàng", `Project logistics_delivery {
  database_type: 'PostgreSQL'
  Note: 'Express delivery and 3PL carrier: merchants and rate cards, hub network, shipments and tracking, linehaul trips, last-mile runs, fleet, warehouse storage, COD and billing, customs. Fictional schema.'
}

Enum merchant_status {
  onboarding
  active
  suspended
  terminated
}

Enum service_level {
  same_day
  express
  standard
  economy
}

Enum facility_type {
  sorting_hub
  delivery_station
  fulfilment_warehouse
  drop_off_point
}

Enum shipment_status {
  created
  picked_up
  at_origin_hub
  in_linehaul
  at_destination_hub
  out_for_delivery
  delivered
  failed_delivery
  returning
  returned
  cancelled
}

Enum tracking_event_type {
  order_created
  picked_up
  arrived_facility
  departed_facility
  out_for_delivery
  delivered
  delivery_failed
  held_by_customs
  return_started
  return_completed
  customs_cleared
}

Enum attempt_result {
  delivered
  recipient_absent
  wrong_address
  refused
  rescheduled
}

Enum exception_type {
  damaged
  lost
  delayed
  address_issue
  customs_hold
}

Enum exception_status {
  open
  investigating
  resolved
  compensated
}

Enum container_status {
  open
  sealed
  in_transit
  unloaded
}

Enum vehicle_type {
  motorbike
  van
  truck_5t
  truck_15t
  container_truck
}

Enum vehicle_status {
  available
  on_trip
  maintenance
  retired
}

Enum driver_status {
  active
  on_leave
  suspended
  terminated
}

Enum trip_status {
  planned
  loading
  departed
  arrived
  completed
  cancelled
}

Enum run_status {
  planned
  in_progress
  completed
  cancelled
}

Enum stop_status {
  pending
  arrived
  completed
  skipped
}

Enum receipt_status {
  expected
  receiving
  put_away
  closed
}

Enum pick_status {
  assigned
  picked
  packed
  cancelled
}

Enum cod_status {
  collected
  deposited
  remitted
  disputed
}

Enum invoice_status {
  draft
  issued
  paid
  overdue
  void
}

Enum customs_status {
  drafted
  submitted
  inspecting
  cleared
  rejected
}

Table merchants [headercolor: #0e7490] {
  id bigint [pk, increment]
  merchant_code varchar(12) [not null, unique]
  legal_name varchar(160) [not null]
  tax_code varchar(20) [not null]
  contact_email varchar(255) [not null]
  api_key_hash varchar(255)
  status merchant_status [not null, default: 'onboarding']
  created_at timestamp [not null]
}

Table merchant_contracts [headercolor: #0e7490] {
  id bigint [pk, increment]
  merchant_id bigint [not null, ref: > merchants.id]
  rate_card_id int [not null, ref: > rate_cards.id]
  contract_no varchar(20) [not null, unique]
  credit_days int [not null, default: 15]
  cod_fee_rate decimal(5,4) [not null, default: 0]
  starts_on date [not null]
  ends_on date
}

Table addresses [headercolor: #0e7490, note: 'Immutable: an edit adds a row, so old shipments keep their address'] {
  id bigint [pk, increment]
  merchant_id bigint [ref: > merchants.id, note: 'Set for saved pickup addresses']
  contact_name varchar(120) [not null]
  phone varchar(20) [not null]
  line1 varchar(160) [not null]
  ward varchar(60)
  district varchar(60) [not null]
  province varchar(60) [not null]
  country char(2) [not null]
  latitude decimal(9,6)
  longitude decimal(9,6)
}

Table delivery_zones [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(80) [not null]
  station_id int [not null, ref: > facilities.id, note: 'Station serving the last mile of this zone']
  boundary jsonb [note: 'GeoJSON polygon']
}

Table rate_cards [headercolor: #1168bd] {
  id int [pk, increment]
  name varchar(80) [not null]
  currency char(3) [not null]
  effective_from date [not null]
  effective_to date
}

Table rate_card_lines [headercolor: #1168bd] {
  id bigint [pk, increment]
  rate_card_id int [not null, ref: > rate_cards.id]
  origin_zone_id int [not null, ref: > delivery_zones.id]
  destination_zone_id int [not null, ref: > delivery_zones.id]
  service_level service_level [not null]
  max_weight_kg decimal(8,2) [not null]
  base_fee decimal(12,2) [not null]
  extra_per_kg decimal(12,2) [not null, default: 0]

  indexes {
    (rate_card_id, origin_zone_id, destination_zone_id, service_level, max_weight_kg) [unique]
  }
}

Table facilities [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(120) [not null]
  facility_type facility_type [not null]
  address_id bigint [not null, ref: > addresses.id]
  parent_hub_id int [ref: > facilities.id]
  is_active boolean [not null, default: true]
}

Table routes [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(20) [not null, unique]
  name varchar(120) [not null]
  origin_facility_id int [not null, ref: > facilities.id]
  destination_facility_id int [not null, ref: > facilities.id]
  distance_km decimal(8,1) [not null]
  transit_minutes int [not null]
  is_active boolean [not null, default: true]
}

Table route_stops [headercolor: #1168bd] {
  route_id int [ref: > routes.id]
  stop_no smallint
  facility_id int [not null, ref: > facilities.id]
  offset_minutes int [not null]

  indexes {
    (route_id, stop_no) [pk]
  }
}

Table shipments [headercolor: #15803d] {
  id bigint [pk, increment]
  tracking_no varchar(24) [not null, unique]
  merchant_id bigint [not null, ref: > merchants.id]
  merchant_order_ref varchar(64) [not null, note: 'Idempotency key of the merchant API']
  pickup_address_id bigint [not null, ref: > addresses.id]
  delivery_address_id bigint [not null, ref: > addresses.id]
  destination_zone_id int [not null, ref: > delivery_zones.id]
  rate_card_line_id bigint [ref: > rate_card_lines.id, note: 'Line that priced this shipment']
  current_facility_id int [ref: > facilities.id]
  service_level service_level [not null]
  declared_value decimal(14,2) [not null, default: 0]
  cod_amount decimal(14,2) [not null, default: 0]
  shipping_fee decimal(12,2) [not null]
  status shipment_status [not null, default: 'created']
  promised_on date
  created_at timestamp [not null]
  delivered_at timestamp

  indexes {
    (merchant_id, merchant_order_ref) [unique]
    (merchant_id, created_at)
    (status, current_facility_id)
  }
}

Table parcels [headercolor: #15803d] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  barcode varchar(30) [not null, unique]
  weight_kg decimal(8,3) [not null]
  length_cm decimal(6,1)
  width_cm decimal(6,1)
  height_cm decimal(6,1)
  is_fragile boolean [not null, default: false]

  indexes {
    shipment_id
  }
}

Table tracking_events [headercolor: #15803d, note: 'Append-only, fed by scanners and partners, so events can arrive late'] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  parcel_id bigint [ref: > parcels.id]
  facility_id int [ref: > facilities.id]
  event_type tracking_event_type [not null]
  description varchar(200)
  scan_id varchar(64) [unique, note: 'Drops events a scanner sends twice']
  scanned_by varchar(60)
  occurred_at timestamp [not null]
  received_at timestamp [not null]

  indexes {
    (shipment_id, occurred_at)
  }
}

Table delivery_attempts [headercolor: #15803d] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  run_stop_id bigint [ref: > delivery_run_stops.id]
  attempt_no smallint [not null]
  result attempt_result [not null]
  failure_reason varchar(120)
  attempted_at timestamp [not null]

  indexes {
    (shipment_id, attempt_no) [unique]
  }
}

Table proofs_of_delivery [headercolor: #15803d] {
  id bigint [pk, increment]
  attempt_id bigint [not null, unique, ref: - delivery_attempts.id]
  receiver_name varchar(120) [not null]
  signature_key varchar(255)
  photo_key varchar(255)
  latitude decimal(9,6)
  longitude decimal(9,6)
  captured_at timestamp [not null]
}

Table shipment_exceptions [headercolor: #15803d] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  facility_id int [ref: > facilities.id]
  exception_type exception_type [not null]
  description varchar(240) [not null]
  compensation_amount decimal(14,2) [not null, default: 0]
  status exception_status [not null, default: 'open']
  raised_at timestamp [not null]
  resolved_at timestamp

  indexes {
    shipment_id
  }
}

Table vehicles [headercolor: #b45309] {
  id int [pk, increment]
  plate_no varchar(12) [not null, unique]
  vehicle_type vehicle_type [not null]
  home_facility_id int [not null, ref: > facilities.id]
  payload_kg decimal(9,1) [not null]
  volume_m3 decimal(6,2) [not null]
  status vehicle_status [not null, default: 'available']
  next_service_on date
}

Table drivers [headercolor: #b45309] {
  id int [pk, increment]
  employee_no varchar(12) [not null, unique]
  full_name varchar(120) [not null]
  phone varchar(20) [not null]
  license_no varchar(20) [not null, unique]
  license_class varchar(4) [not null]
  license_expires_on date [not null]
  home_facility_id int [not null, ref: > facilities.id]
  status driver_status [not null, default: 'active']
}

Table vehicle_maintenance [headercolor: #b45309] {
  id bigint [pk, increment]
  vehicle_id int [not null, ref: > vehicles.id]
  service_type varchar(40) [not null]
  odometer_km int [not null]
  cost decimal(12,2) [not null]
  serviced_on date [not null]
}

Table fuel_logs [headercolor: #b45309] {
  id bigint [pk, increment]
  vehicle_id int [not null, ref: > vehicles.id]
  driver_id int [not null, ref: > drivers.id]
  liters decimal(7,2) [not null]
  cost decimal(12,2) [not null]
  odometer_km int [not null]
  filled_at timestamp [not null]
}

Table trips [headercolor: #7c3aed, note: 'Linehaul between hubs'] {
  id bigint [pk, increment]
  trip_no varchar(20) [not null, unique]
  route_id int [not null, ref: > routes.id]
  vehicle_id int [not null, ref: > vehicles.id]
  driver_id int [not null, ref: > drivers.id]
  status trip_status [not null, default: 'planned']
  planned_departure timestamp [not null]
  departed_at timestamp
  arrived_at timestamp

  indexes {
    (status, planned_departure)
  }
}

Table trip_stop_logs [headercolor: #7c3aed] {
  id bigint [pk, increment]
  trip_id bigint [not null, ref: > trips.id]
  stop_no smallint [not null]
  facility_id int [not null, ref: > facilities.id]
  arrived_at timestamp
  departed_at timestamp

  indexes {
    (trip_id, stop_no) [unique]
  }
}

Table containers [headercolor: #7c3aed, note: 'Sealed bag or roll cage moved as one unit'] {
  id bigint [pk, increment]
  seal_no varchar(20) [unique, note: 'Empty until sealed']
  origin_facility_id int [not null, ref: > facilities.id]
  destination_facility_id int [not null, ref: > facilities.id]
  trip_id bigint [ref: > trips.id]
  status container_status [not null, default: 'open']
  sealed_at timestamp
}

Table container_parcels [headercolor: #7c3aed] {
  container_id bigint [ref: > containers.id]
  parcel_id bigint [ref: > parcels.id]
  scanned_at timestamp [not null]

  indexes {
    (container_id, parcel_id) [pk]
    parcel_id
  }
}

Table delivery_runs [headercolor: #be123c, note: 'Last-mile route of one driver from a station'] {
  id bigint [pk, increment]
  station_id int [not null, ref: > facilities.id]
  driver_id int [not null, ref: > drivers.id]
  vehicle_id int [not null, ref: > vehicles.id]
  run_date date [not null]
  status run_status [not null, default: 'planned']
  started_at timestamp
  finished_at timestamp

  indexes {
    (station_id, run_date)
    (driver_id, run_date)
  }
}

Table delivery_run_stops [headercolor: #be123c] {
  id bigint [pk, increment]
  run_id bigint [not null, ref: > delivery_runs.id]
  shipment_id bigint [not null, ref: > shipments.id]
  stop_no smallint [not null]
  eta timestamp
  status stop_status [not null, default: 'pending']

  indexes {
    (run_id, stop_no) [unique]
    shipment_id
  }
}

Table storage_bins [headercolor: #0f766e] {
  id bigint [pk, increment]
  facility_id int [not null, ref: > facilities.id]
  bin_code varchar(16) [not null]
  zone_code varchar(8) [not null, note: 'ambient, chilled, high-value']
  max_weight_kg decimal(8,2) [not null]

  indexes {
    (facility_id, bin_code) [unique]
  }
}

Table merchant_skus [headercolor: #0f766e] {
  id bigint [pk, increment]
  merchant_id bigint [not null, ref: > merchants.id]
  sku varchar(40) [not null]
  name varchar(160) [not null]
  unit_weight_kg decimal(8,3) [not null]
  is_lot_tracked boolean [not null, default: false]

  indexes {
    (merchant_id, sku) [unique]
  }
}

Table bin_stock [headercolor: #0f766e] {
  bin_id bigint [ref: > storage_bins.id]
  sku_id bigint [ref: > merchant_skus.id]
  lot_no varchar(24) [not null, default: '']
  quantity int [not null, default: 0]
  allocated int [not null, default: 0]
  expires_on date

  indexes {
    (bin_id, sku_id, lot_no) [pk]
    sku_id
  }
}

Table inbound_receipts [headercolor: #0f766e] {
  id bigint [pk, increment]
  receipt_no varchar(20) [not null, unique]
  merchant_id bigint [not null, ref: > merchants.id]
  facility_id int [not null, ref: > facilities.id]
  status receipt_status [not null, default: 'expected']
  expected_on date [not null]
  received_at timestamp
}

Table inbound_receipt_lines [headercolor: #0f766e] {
  id bigint [pk, increment]
  receipt_id bigint [not null, ref: > inbound_receipts.id]
  sku_id bigint [not null, ref: > merchant_skus.id]
  lot_no varchar(24) [not null, default: '']
  expires_on date
  expected_quantity int [not null]
  received_quantity int [not null, default: 0]
  damaged_quantity int [not null, default: 0]
}

Table pick_tasks [headercolor: #0f766e] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  bin_id bigint [not null, ref: > storage_bins.id]
  sku_id bigint [not null, ref: > merchant_skus.id]
  lot_no varchar(24) [not null, default: '']
  quantity int [not null]
  picker varchar(60)
  status pick_status [not null, default: 'assigned']
  completed_at timestamp

  indexes {
    (status, bin_id)
    shipment_id
  }
}

Table cod_remittances [headercolor: #475569] {
  id bigint [pk, increment]
  merchant_id bigint [not null, ref: > merchants.id]
  period_end date [not null]
  gross_amount decimal(14,2) [not null]
  fee_amount decimal(14,2) [not null]
  net_amount decimal(14,2) [not null]
  bank_code varchar(11) [not null]
  bank_account_no varchar(34) [not null]
  account_name varchar(120) [not null]
  bank_ref varchar(40) [unique]
  paid_at timestamp

  indexes {
    (merchant_id, period_end) [unique]
  }
}

Table cod_collections [headercolor: #475569] {
  id bigint [pk, increment]
  shipment_id bigint [not null, unique, ref: - shipments.id]
  driver_id int [not null, ref: > drivers.id]
  remittance_id bigint [ref: > cod_remittances.id]
  amount decimal(14,2) [not null]
  status cod_status [not null, default: 'collected']
  collected_at timestamp [not null]
  deposited_at timestamp

  indexes {
    (driver_id, status)
  }
}

Table invoices [headercolor: #475569] {
  id bigint [pk, increment]
  invoice_no varchar(20) [not null, unique]
  merchant_id bigint [not null, ref: > merchants.id]
  contract_id bigint [not null, ref: > merchant_contracts.id]
  period_start date [not null]
  period_end date [not null]
  subtotal decimal(14,2) [not null]
  tax_amount decimal(14,2) [not null]
  total_amount decimal(14,2) [not null]
  status invoice_status [not null, default: 'draft']
  due_on date [not null]
  paid_at timestamp
}

Table invoice_lines [headercolor: #475569] {
  id bigint [pk, increment]
  invoice_id bigint [not null, ref: > invoices.id]
  shipment_id bigint [ref: > shipments.id]
  charge_type varchar(30) [not null, note: 'freight, cod_fee, storage, surcharge, compensation']
  amount decimal(12,2) [not null]

  indexes {
    invoice_id
  }
}

Table customs_declarations [headercolor: #475569] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  declaration_no varchar(24) [unique]
  origin_country char(2) [not null]
  destination_country char(2) [not null]
  hs_code varchar(12) [not null]
  declared_value decimal(14,2) [not null]
  currency char(3) [not null]
  duty_amount decimal(14,2) [not null, default: 0]
  status customs_status [not null, default: 'drafted']
  submitted_at timestamp
  cleared_at timestamp
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

TableGroup merchants_contracts [color: #0e7490] {
  merchants
  merchant_contracts
  addresses
}

TableGroup network_pricing [color: #1168bd] {
  delivery_zones
  rate_cards
  rate_card_lines
  facilities
  routes
  route_stops
}

TableGroup shipment_tracking [color: #15803d] {
  shipments
  parcels
  tracking_events
  delivery_attempts
  proofs_of_delivery
  shipment_exceptions
}

TableGroup fleet [color: #b45309] {
  vehicles
  drivers
  vehicle_maintenance
  fuel_logs
}

TableGroup linehaul [color: #7c3aed] {
  trips
  trip_stop_logs
  containers
  container_parcels
}

TableGroup last_mile [color: #be123c] {
  delivery_runs
  delivery_run_stops
}

TableGroup warehouse_3pl [color: #0f766e] {
  storage_bins
  merchant_skus
  bin_stock
  inbound_receipts
  inbound_receipt_lines
  pick_tasks
}

TableGroup billing_customs [color: #475569] {
  cod_remittances
  cod_collections
  invoices
  invoice_lines
  customs_declarations
  outbox_events
}`, "Database đầy đủ"];
