DBML_SAMPLES["db-shopping"] = ["Sàn mua sắm online", `Project online_marketplace {
  database_type: 'PostgreSQL'
  Note: 'Multi-seller marketplace: customers and loyalty, seller onboarding and payouts, catalog, inventory, cart and promotions, orders split per seller, payments, fulfilment and returns. Fictional schema.'
}

Enum customer_status {
  active
  suspended
  deleted
}

Enum loyalty_tx_type {
  earn
  redeem
  expire
  adjust
}

Enum seller_status {
  applied
  verified
  active
  suspended
  closed
}

Enum payout_status {
  scheduled
  processing
  paid
  failed
}

Enum product_status {
  draft
  pending_review
  active
  out_of_stock
  archived
}

Enum movement_type {
  purchase_receipt
  sale
  return_restock
  adjustment
  transfer
}

Enum reservation_status {
  held
  committed
  released
  expired
}

Enum cart_status {
  active
  converted
  abandoned
}

Enum discount_type {
  percentage
  fixed_amount
  free_shipping
}

Enum promotion_scope {
  platform
  seller
}

Enum order_status {
  pending_payment
  paid
  processing
  completed
  cancelled
  refunded
}

Enum seller_order_status {
  awaiting_confirmation
  confirmed
  packed
  shipped
  delivered
  cancelled
}

Enum payment_method {
  card
  bank_transfer
  e_wallet
  cash_on_delivery
}

Enum payment_status {
  initiated
  authorized
  captured
  failed
  voided
}

Enum refund_status {
  requested
  processing
  completed
  failed
}

Enum shipment_status {
  label_created
  picked_up
  in_transit
  out_for_delivery
  delivered
  failed_delivery
  returned
}

Enum return_status {
  requested
  approved
  rejected
  received
  refunded
}

Table customers [headercolor: #0e7490] {
  id bigint [pk, increment]
  email varchar(255) [not null, unique]
  phone varchar(20) [unique]
  password_hash varchar(255) [not null]
  full_name varchar(120) [not null]
  status customer_status [not null, default: 'active']
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table customer_addresses [headercolor: #0e7490] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > customers.id]
  recipient_name varchar(120) [not null]
  phone varchar(20) [not null]
  line1 varchar(160) [not null]
  city varchar(60) [not null]
  province varchar(60) [not null]
  country char(2) [not null]
  postal_code varchar(12)
  is_default boolean [not null, default: false]
}

Table loyalty_accounts [headercolor: #0e7490] {
  customer_id bigint [pk, ref: - customers.id]
  tier varchar(12) [not null, default: 'bronze']
  points_balance int [not null, default: 0]
  updated_at timestamp [not null]
}

Table loyalty_transactions [headercolor: #0e7490] {
  id bigint [pk, increment]
  customer_id bigint [not null, ref: > loyalty_accounts.customer_id]
  order_id uuid [ref: > orders.id]
  tx_type loyalty_tx_type [not null]
  points int [not null]
  expires_on date
  created_at timestamp [not null]
}

Table wishlist_items [headercolor: #0e7490] {
  customer_id bigint [ref: > customers.id]
  product_id bigint [ref: > products.id]
  added_at timestamp [not null]

  indexes {
    (customer_id, product_id) [pk]
  }
}

Table sellers [headercolor: #1168bd] {
  id bigint [pk, increment]
  shop_name varchar(120) [not null, unique]
  legal_name varchar(160) [not null]
  tax_code varchar(20) [not null]
  contact_email varchar(255) [not null]
  commission_rate decimal(5,2) [not null]
  rating decimal(3,2)
  status seller_status [not null, default: 'applied']
  created_at timestamp [not null]
}

Table seller_bank_accounts [headercolor: #1168bd] {
  id bigint [pk, increment]
  seller_id bigint [not null, ref: > sellers.id]
  bank_code varchar(11) [not null]
  account_no varchar(34) [not null]
  account_name varchar(120) [not null]
  is_default boolean [not null, default: false]
}

Table seller_payouts [headercolor: #1168bd] {
  id bigint [pk, increment]
  seller_id bigint [not null, ref: > sellers.id]
  bank_account_id bigint [not null, ref: > seller_bank_accounts.id]
  period_start date [not null]
  period_end date [not null]
  gross_amount decimal(14,2) [not null]
  commission_amount decimal(14,2) [not null]
  refund_deduction decimal(14,2) [not null, default: 0, note: 'Refunds raised after an earlier payout']
  net_amount decimal(14,2) [not null]
  status payout_status [not null, default: 'scheduled']
  paid_at timestamp

  indexes {
    (seller_id, period_start) [unique]
  }
}

Table brands [headercolor: #15803d] {
  id int [pk, increment]
  name varchar(100) [not null, unique]
  logo_url varchar(255)
}

Table categories [headercolor: #15803d] {
  id int [pk, increment]
  parent_id int [ref: > categories.id]
  name varchar(100) [not null]
  slug varchar(120) [not null, unique]
  sort_rank int [not null, default: 0]
}

Table products [headercolor: #15803d] {
  id bigint [pk, increment]
  seller_id bigint [not null, ref: > sellers.id]
  category_id int [not null, ref: > categories.id]
  brand_id int [ref: > brands.id]
  name varchar(200) [not null]
  slug varchar(220) [not null, unique]
  description text
  status product_status [not null, default: 'draft']
  rating_average decimal(3,2)
  rating_count int [not null, default: 0]
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    (seller_id, status)
    (category_id, status)
  }
}

Table product_variants [headercolor: #15803d] {
  id bigint [pk, increment]
  product_id bigint [not null, ref: > products.id]
  sku varchar(40) [not null, unique, note: 'Generated by the platform']
  seller_sku varchar(40)
  variant_name varchar(120) [not null, note: 'Size M / Blue']
  list_price decimal(12,2) [not null]
  sale_price decimal(12,2)
  weight_grams int [not null]
  is_active boolean [not null, default: true]

  indexes {
    product_id
  }
}

Table product_images [headercolor: #15803d] {
  id bigint [pk, increment]
  product_id bigint [not null, ref: > products.id]
  variant_id bigint [ref: > product_variants.id]
  image_url varchar(255) [not null]
  sort_rank int [not null, default: 0]
}

Table attributes [headercolor: #15803d] {
  id int [pk, increment]
  category_id int [not null, ref: > categories.id]
  name varchar(60) [not null]
  is_filterable boolean [not null, default: false]
}

Table product_attribute_values [headercolor: #15803d] {
  product_id bigint [ref: > products.id]
  attribute_id int [ref: > attributes.id]
  attribute_value varchar(120) [not null]

  indexes {
    (product_id, attribute_id) [pk]
    (attribute_id, attribute_value)
  }
}

Table product_reviews [headercolor: #15803d] {
  id bigint [pk, increment]
  product_id bigint [not null, ref: > products.id]
  customer_id bigint [not null, ref: > customers.id]
  order_item_id bigint [not null, unique, ref: - order_items.id, note: 'Verified purchase, one review per line']
  rating smallint [not null]
  body text
  is_published boolean [not null, default: true]
  created_at timestamp [not null]

  indexes {
    product_id
  }
}

Table warehouses [headercolor: #b45309] {
  id int [pk, increment]
  seller_id bigint [ref: > sellers.id, note: 'Empty when run by the platform']
  code varchar(12) [not null, unique]
  name varchar(120) [not null]
  city varchar(60) [not null]
  is_active boolean [not null, default: true]
}

Table inventory_levels [headercolor: #b45309] {
  warehouse_id int [ref: > warehouses.id]
  variant_id bigint [ref: > product_variants.id]
  on_hand int [not null, default: 0]
  reserved int [not null, default: 0]
  reorder_point int [not null, default: 0]
  version int [not null, default: 0, note: 'Optimistic locking: stops overselling']

  indexes {
    (warehouse_id, variant_id) [pk]
    variant_id
  }
}

Table stock_reservations [headercolor: #b45309] {
  id bigint [pk, increment]
  order_item_id bigint [not null, ref: > order_items.id]
  warehouse_id int [not null, ref: > warehouses.id]
  variant_id bigint [not null, ref: > product_variants.id]
  quantity int [not null]
  status reservation_status [not null, default: 'held']
  expires_at timestamp [not null]

  indexes {
    (status, expires_at)
  }
}

Table stock_movements [headercolor: #b45309] {
  id bigint [pk, increment]
  warehouse_id int [not null, ref: > warehouses.id]
  variant_id bigint [not null, ref: > product_variants.id]
  movement_type movement_type [not null]
  quantity int [not null, note: 'Signed: negative leaves the warehouse']
  source_ref varchar(64) [not null]
  created_at timestamp [not null]

  indexes {
    (variant_id, created_at)
  }
}

Table carts [headercolor: #7c3aed] {
  id uuid [pk]
  customer_id bigint [ref: > customers.id, note: 'Empty for guests until sign-in']
  status cart_status [not null, default: 'active']
  updated_at timestamp [not null]

  indexes {
    (customer_id, status)
  }
}

Table cart_items [headercolor: #7c3aed] {
  cart_id uuid [ref: > carts.id]
  variant_id bigint [ref: > product_variants.id]
  quantity int [not null]
  added_at timestamp [not null]

  indexes {
    (cart_id, variant_id) [pk]
  }
}

Table promotions [headercolor: #7c3aed] {
  id bigint [pk, increment]
  seller_id bigint [ref: > sellers.id]
  name varchar(120) [not null]
  scope promotion_scope [not null]
  discount_type discount_type [not null]
  discount_value decimal(12,2) [not null]
  max_discount decimal(12,2)
  min_order_value decimal(12,2) [not null, default: 0]
  starts_at timestamp [not null]
  ends_at timestamp [not null]
}

Table coupons [headercolor: #7c3aed] {
  id bigint [pk, increment]
  promotion_id bigint [not null, ref: > promotions.id]
  code varchar(24) [not null, unique]
  usage_limit int
  per_customer_limit int [not null, default: 1]
  used_count int [not null, default: 0]
}

Table coupon_redemptions [headercolor: #7c3aed] {
  id bigint [pk, increment]
  coupon_id bigint [not null, ref: > coupons.id]
  customer_id bigint [not null, ref: > customers.id]
  order_id uuid [not null, ref: > orders.id]
  discount_amount decimal(12,2) [not null]
  redeemed_at timestamp [not null]

  indexes {
    (coupon_id, order_id) [unique]
    (coupon_id, customer_id)
  }
}

Table orders [headercolor: #be123c] {
  id uuid [pk]
  order_no varchar(20) [not null, unique]
  idempotency_key varchar(64) [not null, unique]
  customer_id bigint [not null, ref: > customers.id]
  shipping_address jsonb [not null, note: 'Snapshot at checkout, later address edits do not touch old orders']
  subtotal decimal(14,2) [not null]
  discount_total decimal(14,2) [not null, default: 0]
  shipping_total decimal(14,2) [not null, default: 0]
  tax_total decimal(14,2) [not null, default: 0]
  grand_total decimal(14,2) [not null]
  currency char(3) [not null]
  status order_status [not null, default: 'pending_payment']
  placed_at timestamp [not null]

  indexes {
    (customer_id, placed_at)
    (status, placed_at)
  }
}

Table seller_orders [headercolor: #be123c, note: 'One customer order splits into one parcel flow per seller'] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  seller_id bigint [not null, ref: > sellers.id]
  payout_id bigint [ref: > seller_payouts.id]
  items_total decimal(14,2) [not null]
  shipping_fee decimal(14,2) [not null, default: 0]
  commission_amount decimal(14,2) [not null, default: 0]
  status seller_order_status [not null, default: 'awaiting_confirmation']

  indexes {
    (order_id, seller_id) [unique]
    (seller_id, status)
    payout_id
  }
}

Table order_items [headercolor: #be123c, note: 'Name and price are copied so old orders survive catalog edits'] {
  id bigint [pk, increment]
  seller_order_id bigint [not null, ref: > seller_orders.id]
  variant_id bigint [not null, ref: > product_variants.id]
  product_name varchar(200) [not null]
  sku varchar(40) [not null]
  quantity int [not null]
  unit_price decimal(12,2) [not null]
  discount_amount decimal(12,2) [not null, default: 0]
  platform_discount_amount decimal(12,2) [not null, default: 0, note: 'Funded by the platform, not deducted from the seller']

  indexes {
    seller_order_id
  }
}

Table order_status_history [headercolor: #be123c] {
  id bigint [pk, increment]
  order_id uuid [not null, ref: > orders.id]
  from_status order_status
  to_status order_status [not null]
  changed_by varchar(60) [not null]
  changed_at timestamp [not null]
}

Table payments [headercolor: #0f766e] {
  id uuid [pk]
  order_id uuid [not null, ref: > orders.id]
  method payment_method [not null]
  provider varchar(30) [not null]
  provider_ref varchar(64)
  amount decimal(14,2) [not null]
  currency char(3) [not null]
  status payment_status [not null, default: 'initiated']
  failure_code varchar(30)
  created_at timestamp [not null]
  captured_at timestamp

  indexes {
    (order_id, status)
    (provider, provider_ref) [unique]
  }
}

Table refunds [headercolor: #0f766e] {
  id uuid [pk]
  payment_id uuid [not null, ref: > payments.id]
  seller_order_id bigint [not null, ref: > seller_orders.id]
  payout_id bigint [ref: > seller_payouts.id, note: 'Payout that deducts this refund']
  return_id bigint [ref: > return_requests.id]
  amount decimal(14,2) [not null]
  reason varchar(120) [not null]
  status refund_status [not null, default: 'requested']
  provider_ref varchar(64) [unique]
  created_at timestamp [not null]
  completed_at timestamp
}

Table carriers [headercolor: #475569] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(100) [not null]
  tracking_url_template varchar(255)
  is_active boolean [not null, default: true]
}

Table shipments [headercolor: #475569] {
  id bigint [pk, increment]
  seller_order_id bigint [not null, ref: > seller_orders.id]
  carrier_id int [not null, ref: > carriers.id]
  warehouse_id int [not null, ref: > warehouses.id]
  tracking_no varchar(40) [not null, unique]
  shipping_fee decimal(12,2) [not null]
  status shipment_status [not null, default: 'label_created']
  shipped_at timestamp
  delivered_at timestamp

  indexes {
    seller_order_id
  }
}

Table shipment_items [headercolor: #475569] {
  shipment_id bigint [ref: > shipments.id]
  order_item_id bigint [ref: > order_items.id]
  quantity int [not null]

  indexes {
    (shipment_id, order_item_id) [pk]
  }
}

Table shipment_events [headercolor: #475569] {
  id bigint [pk, increment]
  shipment_id bigint [not null, ref: > shipments.id]
  status shipment_status [not null]
  location varchar(120)
  occurred_at timestamp [not null]

  indexes {
    (shipment_id, occurred_at)
  }
}

Table return_requests [headercolor: #475569] {
  id bigint [pk, increment]
  seller_order_id bigint [not null, ref: > seller_orders.id]
  customer_id bigint [not null, ref: > customers.id]
  reason varchar(120) [not null]
  status return_status [not null, default: 'requested']
  requested_at timestamp [not null]
  resolved_at timestamp
}

Table return_items [headercolor: #475569] {
  return_id bigint [ref: > return_requests.id]
  order_item_id bigint [ref: > order_items.id]
  quantity int [not null]
  is_restockable boolean [not null, default: false]

  indexes {
    (return_id, order_item_id) [pk]
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

TableGroup customer_profile [color: #0e7490] {
  customers
  customer_addresses
  loyalty_accounts
  loyalty_transactions
  wishlist_items
}

TableGroup seller_center [color: #1168bd] {
  sellers
  seller_bank_accounts
  seller_payouts
}

TableGroup catalog [color: #15803d] {
  brands
  categories
  products
  product_variants
  product_images
  attributes
  product_attribute_values
  product_reviews
}

TableGroup inventory [color: #b45309] {
  warehouses
  inventory_levels
  stock_reservations
  stock_movements
}

TableGroup cart_promotion [color: #7c3aed] {
  carts
  cart_items
  promotions
  coupons
  coupon_redemptions
}

TableGroup order_processing [color: #be123c] {
  orders
  seller_orders
  order_items
  order_status_history
}

TableGroup payment_processing [color: #0f766e] {
  payments
  refunds
}

TableGroup fulfilment_returns [color: #475569] {
  carriers
  shipments
  shipment_items
  shipment_events
  return_requests
  return_items
  outbox_events
}`, "Database đầy đủ"];
