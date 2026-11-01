DBML_SAMPLES["db-game"] = ["Game online (MMORPG)", `Project online_game {
  database_type: 'PostgreSQL'
  Note: 'MMORPG backend: player accounts and moderation, characters and skills, item instances, virtual economy, quests, guilds, PvP seasons and live events. Fictional schema.'
}

Enum player_status {
  active
  suspended
  banned
  deleted
}

Enum friendship_status {
  pending
  accepted
  blocked
}

Enum report_status {
  open
  reviewing
  actioned
  dismissed
}

Enum server_status {
  online
  maintenance
  merged
  closed
}

Enum skill_type {
  active
  passive
  ultimate
}

Enum item_category {
  weapon
  armor
  accessory
  consumable
  material
  cosmetic
  quest_item
}

Enum item_rarity {
  common
  uncommon
  rare
  epic
  legendary
}

Enum equipment_slot {
  head
  chest
  legs
  feet
  main_hand
  off_hand
  ring
  necklace
}

Enum item_source {
  monster_drop
  quest_reward
  crafted
  shop_purchase
  auction
  player_trade
  mail
}

Enum currency_kind {
  soft
  premium
}

Enum currency_reason {
  quest_reward
  monster_drop
  shop_purchase
  auction_sale
  auction_fee
  player_trade
  top_up
  refund
  repair
  crafting
  vendor_sale
  mail
  auction_bid
  guild_treasury
}

Enum purchase_status {
  pending
  paid
  delivered
  refunded
  charged_back
}

Enum auction_status {
  active
  sold
  expired
  cancelled
}

Enum trade_status {
  proposed
  completed
  cancelled
}

Enum quest_type {
  main_story
  side
  daily
  guild
}

Enum objective_type {
  kill
  collect
  talk
  reach_location
}

Enum quest_progress_status {
  accepted
  completed
  rewarded
  abandoned
}

Enum guild_role {
  leader
  officer
  member
  recruit
}

Enum mail_status {
  unread
  read
  claimed
  deleted
}

Enum match_mode {
  duel
  arena_3v3
  battleground_10v10
}

Enum match_status {
  queued
  in_progress
  finished
  aborted
}

Enum match_result {
  win
  loss
  draw
  left_early
}

Table players [headercolor: #0e7490] {
  id bigint [pk, increment]
  username varchar(40) [not null, unique]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  country char(2)
  birth_date date [note: 'Drives parental control and play-time limits']
  status player_status [not null, default: 'active']
  created_at timestamp [not null]
  last_login_at timestamp
}

Table player_sessions [headercolor: #0e7490] {
  id uuid [pk]
  player_id bigint [not null, ref: > players.id]
  server_id int [ref: > game_servers.id]
  ip_address varchar(45) [not null]
  client_version varchar(20) [not null]
  started_at timestamp [not null]
  ended_at timestamp

  indexes {
    (player_id, started_at)
  }
}

Table friendships [headercolor: #0e7490] {
  player_id bigint [ref: > players.id]
  friend_id bigint [ref: > players.id]
  status friendship_status [not null, default: 'pending']
  created_at timestamp [not null]

  indexes {
    (player_id, friend_id) [pk]
    friend_id
  }
}

Table player_reports [headercolor: #0e7490] {
  id bigint [pk, increment]
  reporter_id bigint [not null, ref: > players.id]
  accused_id bigint [not null, ref: > players.id]
  category varchar(30) [not null, note: 'cheating, toxicity, botting']
  evidence text
  status report_status [not null, default: 'open']
  created_at timestamp [not null]
}

Table player_bans [headercolor: #0e7490] {
  id bigint [pk, increment]
  player_id bigint [not null, ref: > players.id]
  report_id bigint [ref: > player_reports.id]
  reason varchar(200) [not null]
  issued_by varchar(60) [not null]
  starts_at timestamp [not null]
  ends_at timestamp [note: 'Empty means permanent']
}

Table game_servers [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(12) [not null, unique]
  name varchar(60) [not null]
  region varchar(12) [not null]
  max_online int [not null]
  status server_status [not null, default: 'online']
  merged_into_id int [ref: > game_servers.id]
  opened_on date [not null]
}

Table character_classes [headercolor: #1168bd] {
  id int [pk, increment]
  code varchar(20) [not null, unique]
  name varchar(60) [not null]
  base_health int [not null]
  base_mana int [not null]
  base_attack int [not null]
  base_defense int [not null]
}

Table characters [headercolor: #1168bd] {
  id bigint [pk, increment]
  player_id bigint [not null, ref: > players.id]
  server_id int [not null, ref: > game_servers.id]
  class_id int [not null, ref: > character_classes.id]
  name varchar(24) [not null]
  level int [not null, default: 1]
  experience bigint [not null, default: 0]
  zone_code varchar(30) [not null]
  pos_x real [not null]
  pos_y real [not null]
  pos_z real [not null]
  play_time_seconds bigint [not null, default: 0]
  is_deleted boolean [not null, default: false]
  created_at timestamp [not null]
  last_saved_at timestamp [not null]

  indexes {
    (server_id, name) [unique]
    player_id
  }
}

Table character_stats [headercolor: #1168bd] {
  character_id bigint [pk, ref: - characters.id]
  strength int [not null, default: 0]
  agility int [not null, default: 0]
  intellect int [not null, default: 0]
  vitality int [not null, default: 0]
  unspent_points int [not null, default: 0]
}

Table skills [headercolor: #1168bd] {
  id int [pk, increment]
  class_id int [not null, ref: > character_classes.id]
  prerequisite_id int [ref: > skills.id]
  code varchar(30) [not null, unique]
  name varchar(60) [not null]
  skill_type skill_type [not null]
  max_rank smallint [not null, default: 5]
  required_level int [not null, default: 1]
}

Table character_skills [headercolor: #1168bd] {
  character_id bigint [ref: > characters.id]
  skill_id int [ref: > skills.id]
  skill_rank smallint [not null, default: 1]
  learned_at timestamp [not null]

  indexes {
    (character_id, skill_id) [pk]
  }
}

Table item_definitions [headercolor: #15803d, note: 'Static design data, one row per item kind'] {
  id int [pk, increment]
  code varchar(40) [not null, unique]
  name varchar(80) [not null]
  category item_category [not null]
  rarity item_rarity [not null]
  slot equipment_slot
  required_level int [not null, default: 1]
  max_stack int [not null, default: 1]
  is_tradable boolean [not null, default: true]
  vendor_price bigint [not null, default: 0]
  base_attributes jsonb
}

Table item_instances [headercolor: #15803d, note: 'One row per owned item or stack, so every item can be traced'] {
  id bigint [pk, increment]
  definition_id int [not null, ref: > item_definitions.id]
  parent_instance_id bigint [ref: > item_instances.id, note: 'Stack this one was split from']
  owner_character_id bigint [ref: > characters.id, note: 'Empty while in mail or on the auction house']
  quantity int [not null, default: 1]
  enhancement_level smallint [not null, default: 0]
  durability int
  random_attributes jsonb
  source item_source [not null]
  created_at timestamp [not null]
  destroyed_at timestamp

  indexes {
    owner_character_id
    definition_id
  }
}

Table inventory_slots [headercolor: #15803d] {
  character_id bigint [ref: > characters.id]
  slot_no smallint
  item_instance_id bigint [not null, unique, ref: - item_instances.id]

  indexes {
    (character_id, slot_no) [pk]
  }
}

Table equipped_items [headercolor: #15803d] {
  character_id bigint [ref: > characters.id]
  slot equipment_slot
  item_instance_id bigint [not null, unique, ref: - item_instances.id]

  indexes {
    (character_id, slot) [pk]
  }
}

Table item_transfers [headercolor: #15803d, note: 'Trail used to catch item duplication exploits'] {
  id bigint [pk, increment]
  item_instance_id bigint [not null, ref: > item_instances.id]
  from_character_id bigint [ref: > characters.id]
  to_character_id bigint [ref: > characters.id]
  quantity int [not null, default: 1]
  source item_source [not null]
  source_ref varchar(64)
  transferred_at timestamp [not null]

  indexes {
    (item_instance_id, transferred_at)
  }
}

Table crafting_recipes [headercolor: #15803d] {
  id int [pk, increment]
  output_item_id int [not null, ref: > item_definitions.id]
  output_quantity int [not null, default: 1]
  gold_cost bigint [not null, default: 0]
  success_rate decimal(5,2) [not null, default: 100]
}

Table recipe_ingredients [headercolor: #15803d] {
  recipe_id int [ref: > crafting_recipes.id]
  item_id int [ref: > item_definitions.id]
  quantity int [not null]

  indexes {
    (recipe_id, item_id) [pk]
  }
}

Table currencies [headercolor: #b45309] {
  id smallint [pk]
  code varchar(12) [not null, unique]
  name varchar(40) [not null]
  kind currency_kind [not null]
}

Table wallets [headercolor: #b45309, note: 'Soft currency per character, premium currency shared across the player'] {
  id bigint [pk, increment]
  player_id bigint [not null, ref: > players.id]
  character_id bigint [not null, default: 0, note: '0 for account-wide premium wallets, no FK so NULL stays out of the unique key']
  currency_id smallint [not null, ref: > currencies.id]
  balance bigint [not null, default: 0]
  version int [not null, default: 0]

  indexes {
    (player_id, character_id, currency_id) [unique]
  }
}

Table currency_ledger [headercolor: #b45309, note: 'Append-only, drives inflation dashboards'] {
  id bigint [pk, increment]
  wallet_id bigint [not null, ref: > wallets.id]
  reason currency_reason [not null]
  amount bigint [not null, note: 'Signed: negative leaves the wallet']
  balance_after bigint [not null]
  source_ref varchar(64)
  created_at timestamp [not null]

  indexes {
    (wallet_id, created_at)
    (reason, created_at)
  }
}

Table shop_products [headercolor: #b45309] {
  id int [pk, increment]
  item_id int [ref: > item_definitions.id]
  currency_id smallint [ref: > currencies.id, note: 'Empty for real-money packs']
  name varchar(80) [not null]
  store_sku varchar(60) [unique]
  price decimal(12,2) [not null]
  grant_premium bigint [not null, default: 0]
  available_from timestamp
  available_to timestamp
}

Table purchases [headercolor: #b45309] {
  id uuid [pk]
  player_id bigint [not null, ref: > players.id]
  product_id int [not null, ref: > shop_products.id]
  wallet_id bigint [ref: > wallets.id, note: 'Set when paid with in-game currency']
  store varchar(20)
  store_receipt_id varchar(128) [unique, note: 'Blocks replayed receipts']
  amount decimal(12,2) [not null]
  currency varchar(12) [not null]
  status purchase_status [not null, default: 'pending']
  purchased_at timestamp [not null]
  delivered_at timestamp
}

Table auction_listings [headercolor: #b45309] {
  id bigint [pk, increment]
  server_id int [not null, ref: > game_servers.id]
  seller_id bigint [not null, ref: > characters.id]
  item_instance_id bigint [not null, ref: > item_instances.id]
  definition_id int [not null, ref: > item_definitions.id, note: 'Copied so the market can be searched by item']
  currency_id smallint [not null, ref: > currencies.id]
  start_price bigint [not null]
  buyout_price bigint
  highest_bid bigint
  status auction_status [not null, default: 'active']
  expires_at timestamp [not null]

  indexes {
    (server_id, status, expires_at)
    (server_id, definition_id, status)
    seller_id
  }
}

Table auction_bids [headercolor: #b45309] {
  id bigint [pk, increment]
  listing_id bigint [not null, ref: > auction_listings.id]
  bidder_id bigint [not null, ref: > characters.id]
  amount bigint [not null]
  created_at timestamp [not null]

  indexes {
    (listing_id, amount)
  }
}

Table player_trades [headercolor: #b45309] {
  id bigint [pk, increment]
  initiator_id bigint [not null, ref: > characters.id]
  partner_id bigint [not null, ref: > characters.id]
  initiator_gold bigint [not null, default: 0]
  partner_gold bigint [not null, default: 0]
  status trade_status [not null, default: 'proposed']
  created_at timestamp [not null]
  completed_at timestamp
}

Table player_trade_items [headercolor: #b45309] {
  trade_id bigint [ref: > player_trades.id]
  item_instance_id bigint [ref: > item_instances.id]
  given_by_id bigint [not null, ref: > characters.id]

  indexes {
    (trade_id, item_instance_id) [pk]
  }
}

Table quests [headercolor: #7c3aed] {
  id int [pk, increment]
  code varchar(40) [not null, unique]
  title varchar(120) [not null]
  quest_type quest_type [not null]
  required_level int [not null, default: 1]
  prerequisite_id int [ref: > quests.id]
  reward_experience bigint [not null, default: 0]
  reward_gold bigint [not null, default: 0]
  reward_item_id int [ref: > item_definitions.id]
  is_repeatable boolean [not null, default: false]
}

Table quest_objectives [headercolor: #7c3aed] {
  id int [pk, increment]
  quest_id int [not null, ref: > quests.id]
  sequence_no smallint [not null]
  objective_type objective_type [not null]
  target_code varchar(40) [not null]
  required_count int [not null, default: 1]

  indexes {
    (quest_id, sequence_no) [unique]
  }
}

Table character_quests [headercolor: #7c3aed] {
  id bigint [pk, increment]
  character_id bigint [not null, ref: > characters.id]
  quest_id int [not null, ref: > quests.id]
  cycle_key varchar(10) [not null, default: 'once', note: 'once, or the day for repeatable quests']
  status quest_progress_status [not null, default: 'accepted']
  progress jsonb [not null, note: 'Counter per objective']
  accepted_at timestamp [not null]
  completed_at timestamp

  indexes {
    (character_id, status)
    (character_id, quest_id, cycle_key) [unique]
  }
}

Table achievements [headercolor: #7c3aed] {
  id int [pk, increment]
  code varchar(40) [not null, unique]
  title varchar(120) [not null]
  points int [not null, default: 10]
  reward_item_id int [ref: > item_definitions.id]
}

Table character_achievements [headercolor: #7c3aed] {
  character_id bigint [ref: > characters.id]
  achievement_id int [ref: > achievements.id]
  unlocked_at timestamp [not null]

  indexes {
    (character_id, achievement_id) [pk]
  }
}

Table guilds [headercolor: #be123c] {
  id bigint [pk, increment]
  server_id int [not null, ref: > game_servers.id]
  leader_id bigint [not null, ref: > characters.id]
  name varchar(30) [not null]
  tag varchar(5) [not null]
  guild_level int [not null, default: 1]
  treasury_gold bigint [not null, default: 0, note: 'Moves through currency_ledger with reason guild_treasury']
  announcement varchar(500)
  created_at timestamp [not null]

  indexes {
    (server_id, name) [unique]
    (server_id, tag) [unique]
  }
}

Table guild_members [headercolor: #be123c] {
  guild_id bigint [not null, ref: > guilds.id]
  character_id bigint [pk, ref: > characters.id, note: 'A character joins one guild at a time']
  role guild_role [not null, default: 'recruit']
  contribution bigint [not null, default: 0]
  joined_at timestamp [not null]

  indexes {
    guild_id
  }
}

Table mails [headercolor: #be123c] {
  id bigint [pk, increment]
  recipient_id bigint [not null, ref: > characters.id]
  sender_id bigint [ref: > characters.id, note: 'Empty for system mail']
  subject varchar(120) [not null]
  body text
  gold bigint [not null, default: 0]
  status mail_status [not null, default: 'unread']
  sent_at timestamp [not null]
  expires_at timestamp [not null]

  indexes {
    (recipient_id, status)
  }
}

Table mail_attachments [headercolor: #be123c] {
  mail_id bigint [ref: > mails.id]
  item_instance_id bigint [ref: > item_instances.id]

  indexes {
    (mail_id, item_instance_id) [pk]
  }
}

Table seasons [headercolor: #0f766e] {
  id int [pk, increment]
  name varchar(60) [not null]
  starts_at timestamp [not null]
  ends_at timestamp [not null]
  reward_item_id int [ref: > item_definitions.id]
}

Table matches [headercolor: #0f766e] {
  id uuid [pk]
  season_id int [not null, ref: > seasons.id]
  server_id int [not null, ref: > game_servers.id]
  mode match_mode [not null]
  map_code varchar(30) [not null]
  status match_status [not null, default: 'queued']
  started_at timestamp
  ended_at timestamp
}

Table match_participants [headercolor: #0f766e] {
  match_id uuid [ref: > matches.id]
  character_id bigint [ref: > characters.id]
  team_no smallint [not null]
  result match_result
  kills int [not null, default: 0]
  deaths int [not null, default: 0]
  damage_dealt bigint [not null, default: 0]
  rating_change int [not null, default: 0]

  indexes {
    (match_id, character_id) [pk]
    character_id
  }
}

Table season_ratings [headercolor: #0f766e, note: 'Leaderboard source of truth, mirrored to a sorted set for reads'] {
  season_id int [ref: > seasons.id]
  character_id bigint [ref: > characters.id]
  mode match_mode
  rating int [not null, default: 1000]
  wins int [not null, default: 0]
  losses int [not null, default: 0]

  indexes {
    (season_id, character_id, mode) [pk]
    (season_id, mode, rating)
  }
}

Table live_events [headercolor: #0f766e] {
  id int [pk, increment]
  name varchar(80) [not null]
  server_id int [ref: > game_servers.id, note: 'Empty means every server']
  reward_item_id int [ref: > item_definitions.id]
  rule_config jsonb [not null]
  starts_at timestamp [not null]
  ends_at timestamp [not null]
}

Table live_event_claims [headercolor: #0f766e] {
  event_id int [ref: > live_events.id]
  character_id bigint [ref: > characters.id]
  claimed_at timestamp [not null]

  indexes {
    (event_id, character_id) [pk]
  }
}

TableGroup player_accounts [color: #0e7490] {
  players
  player_sessions
  friendships
  player_reports
  player_bans
}

TableGroup characters_world [color: #1168bd] {
  game_servers
  character_classes
  characters
  character_stats
  skills
  character_skills
}

TableGroup items_crafting [color: #15803d] {
  item_definitions
  item_instances
  inventory_slots
  equipped_items
  item_transfers
  crafting_recipes
  recipe_ingredients
}

TableGroup virtual_economy [color: #b45309] {
  currencies
  wallets
  currency_ledger
  shop_products
  purchases
  auction_listings
  auction_bids
  player_trades
  player_trade_items
}

TableGroup quests_progress [color: #7c3aed] {
  quests
  quest_objectives
  character_quests
  achievements
  character_achievements
}

TableGroup guild_social [color: #be123c] {
  guilds
  guild_members
  mails
  mail_attachments
}

TableGroup pvp_live_ops [color: #0f766e] {
  seasons
  matches
  match_participants
  season_ratings
  live_events
  live_event_claims
}`, "Database đầy đủ"];
