const D2_SAMPLES = {
  architecture: ["Kiến trúc hệ thống", `direction: right

customer: Customer {
  shape: person
}

platform: Order platform {
  web: Web app
  api: API gateway
  orders: Order service
  web -> api: HTTPS
  api -> orders: gRPC
}

db: Orders DB {
  shape: cylinder
}
queue: Event bus {
  shape: queue
}

customer -> platform.web: Places order
platform.orders -> db: Reads and writes
platform.orders -> queue: Publishes events`],
  sequence: ["Sequence — tuần tự", `shape: sequence_diagram

customer: Customer
web: Web app
api: Auth API

customer -> web: Enter credentials
web -> api: POST /login
api -> web: 200 + token {
  style.stroke-dash: 4
}
web -> customer: Show dashboard`],
  table: ["Bảng CSDL — sql_table", `users: {
  shape: sql_table
  id: int {constraint: primary_key}
  email: varchar(255) {constraint: unique}
  full_name: varchar(100)
}

orders: {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal(12,2)
}

orders.user_id -> users.id`],
  class: ["Class — lớp", `Account: {
  shape: class
  +number: string
  +balance: decimal
  +deposit(amount): bool
}

SavingsAccount: {
  shape: class
  +interestRate: float
}

SavingsAccount -> Account: extends`],
  grid: ["Grid — lưới", `grid-rows: 2
grid-columns: 3
grid-gap: 24

Ingest
Transform
Load
Monitor
Alert
Report`],
  broken: ["Mã lỗi — thử báo lỗi", `web -> api: Request
api -> {
db: [`],
};
