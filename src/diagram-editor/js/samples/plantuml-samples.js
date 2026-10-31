const PLANTUML_SAMPLES = {
  sequence: ["Sequence — tuần tự", `@startuml
title Sign-in flow
actor Customer
participant "Web app" as Web
participant "Auth API" as Api
database Users

Customer -> Web : Enter credentials
Web -> Api : POST /login
activate Api
Api -> Users : Find account
Users --> Api : Account
alt Password correct
  Api --> Web : 200 + token
else Wrong password
  Api --> Web : 401
end
deactivate Api
note right of Web : Token expires after 15 minutes
@enduml`],
  class: ["Class — lớp", `@startuml
abstract class Account {
  +number: String
  +balance: Decimal
  +deposit(amount): bool
  +withdraw(amount): bool
}
class SavingsAccount {
  +interestRate: Float
}
class Customer {
  +fullName: String
  +email: String
}
interface Notifier {
  +send(message)
}
Account <|-- SavingsAccount
Customer "1" --> "*" Account : owns
Account ..> Notifier : uses
@enduml`],
  usecase: ["Use case — tình huống sử dụng", `@startuml
left to right direction
actor Customer
actor "Support agent" as Agent
rectangle "Online banking" {
  usecase "View balance" as UC1
  usecase "Transfer money" as UC2
  usecase "Verify OTP" as UC3
  usecase "Reset password" as UC4
}
Customer --> UC1
Customer --> UC2
UC2 ..> UC3 : <<include>>
Agent --> UC4
@enduml`],
  activity: ["Activity — quy trình", `@startuml
start
:Receive order;
if (Enough balance?) then (yes)
  :Hold funds;
  fork
    :Send to exchange;
  fork again
    :Notify customer;
  end fork
else (no)
  :Reject order;
endif
stop
@enduml`],
  state: ["State — trạng thái", `@startuml
[*] --> New
New --> Pending : Submit
Pending --> PartiallyFilled : Partial fill
PartiallyFilled --> Filled : Fully filled
Pending --> Filled : Fully filled
Pending --> Cancelled : Cancel
Filled --> [*]
Cancelled --> [*]
@enduml`],
  component: ["Component — thành phần", `@startuml
package "Frontend" {
  [Web app]
}
package "Backend" {
  [API gateway]
  [Order service]
  [Notification service]
}
database "Orders DB"
queue "Event bus"

[Web app] --> [API gateway] : HTTPS
[API gateway] --> [Order service]
[Order service] --> "Orders DB"
[Order service] --> "Event bus"
"Event bus" --> [Notification service]
@enduml`],
  c4: ["C4 — ngữ cảnh hệ thống", `@startuml
!include <C4/C4_Context>
title System context
Person(customer, "Customer", "Places orders online")
System(shop, "Online shop", "Sells products")
System_Ext(pay, "Payment provider", "Handles card payments")
Rel(customer, shop, "Uses", "HTTPS")
Rel(shop, pay, "Charges cards", "REST")
@enduml`],
  mindmap: ["Mindmap — sơ đồ tư duy", `@startmindmap
* Diagram tools
** Text based
*** Mermaid
*** PlantUML
*** D2
** Data
*** DBML
** Architecture
*** Structurizr
left side
** Drag and drop
*** draw.io
@endmindmap`],
  gantt: ["Gantt — kế hoạch", `@startgantt
Project starts 2026-11-02
[Analysis] requires 5 days
[Design] requires 7 days
[Design] starts at [Analysis]'s end
[Development] requires 10 days
[Development] starts at [Design]'s end
[UAT] requires 5 days
[UAT] starts at [Development]'s end
[Go-live] happens at [UAT]'s end
@endgantt`],
  theme: ["Theme — đổi giao diện", `@startuml
!theme cerulean
Alice -> Bob : Request
Bob --> Alice : Response
@enduml`],
  broken: ["Mã lỗi — thử báo lỗi", `@startuml
Alice -> Bob : Request
this line is not valid (((
Bob --> Alice : Response
@enduml`],
};
