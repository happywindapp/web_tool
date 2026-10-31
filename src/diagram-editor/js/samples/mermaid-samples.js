const MERMAID_SAMPLES = {
  flowchart: ["Flowchart — sơ đồ luồng", `---
title: Order placement flow
---
flowchart LR
    A([Customer]) --> B[Enter order]
    B --> C{Enough balance?}
    C -- Yes --> D[Send to exchange]
    C -- No --> E[Reject]:::bad
    D --> F[(Order DB)]
    D -.-> G>Notify]
    classDef bad fill:#fee2e2,stroke:#b91c1c`],
  sequence: ["Sequence — tuần tự", `sequenceDiagram
    autonumber
    actor U as Customer
    participant FE as Web
    participant API
    participant DB as Database
    U->>FE: Sign in
    FE->>+API: POST /login
    API->>DB: Check account
    DB-->>API: OK
    alt Password correct
        API-->>FE: token
    else Wrong password
        API-->>FE: 401
    end
    deactivate API
    Note over FE,API: Token expires after 15 minutes`],
  class: ["Class — lớp", `classDiagram
    class Customer {
        +String fullName
        +String email
    }
    class Account {
        +String number
        +decimal balance
        +deposit(amount) bool
        +withdraw(amount) bool
    }
    class SavingsAccount {
        +float interestRate
    }
    Customer "1" --> "*" Account : owns
    Account <|-- SavingsAccount`],
  state: ["State — trạng thái", `stateDiagram-v2
    state "New" as New
    state "Pending" as Pending
    state "Partially filled" as Partial
    state "Filled" as Filled
    state "Cancelled" as Cancelled
    [*] --> New
    New --> Pending : Submit
    Pending --> Partial : Partial fill
    Partial --> Filled : Fully filled
    Pending --> Filled : Fully filled
    Pending --> Cancelled : Cancel
    Filled --> [*]
    Cancelled --> [*]
    note right of Pending : Price can be amended`],
  er: ["ER — thực thể quan hệ", `erDiagram
    CUSTOMER ||--o{ ORDER : "places"
    ORDER ||--|{ ORDER_LINE : "contains"
    PRODUCT ||--o{ ORDER_LINE : "appears in"
    CUSTOMER {
        int id PK
        string full_name
        string email UK
    }
    ORDER {
        int id PK
        int customer_id FK
        date order_date
    }`],
  gantt: ["Gantt — kế hoạch", `gantt
    title Project plan
    dateFormat YYYY-MM-DD
    section Analysis
        Gather requirements :done, a1, 2026-11-02, 5d
        Design              :active, a2, after a1, 7d
    section Development
        Backend             :b1, after a2, 10d
        Frontend            :b2, after a2, 12d
    section Testing
        UAT                 :crit, c1, after b2, 5d
        Go-live             :milestone, m1, after c1, 0d`],
  pie: ["Pie — biểu đồ tròn", `pie showData
    title Portfolio allocation
    "Stocks" : 45
    "Bonds" : 30
    "Deposits" : 15
    "Gold" : 10`],
  journey: ["User journey — hành trình", `journey
    title Open an account online
    section Sign up
      Download the app: 5: Customer
      Fill in details: 3: Customer
      Photograph ID card: 2: Customer
    section Verification
      eKYC: 4: Customer, System
      Sign the contract: 4: Customer`],
  git: ["Git graph — nhánh git", `gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "feat-a"
    branch feature-login
    checkout feature-login
    commit id: "login"
    checkout develop
    merge feature-login
    checkout main
    merge develop tag: "v1.0"
    commit id: "hotfix"`],
  mindmap: ["Mindmap — sơ đồ tư duy", `mindmap
  root((Mermaid))
    Flows
      flowchart
      sequence
    Data
      ER
      class
    Planning
      gantt
      timeline
    Charts
      pie
      xychart`],
  timeline: ["Timeline — dòng thời gian", `timeline
    title Product roadmap 2026
    Q1 : User research
    Q2 : Beta release
       : Collect feedback
    Q3 : General availability
    Q4 : Feature expansion`],
  quadrant: ["Quadrant — ma trận 4 ô", `quadrantChart
    title Feature priorities
    x-axis Low effort --> High effort
    y-axis Low value --> High value
    quadrant-1 Plan
    quadrant-2 Do now
    quadrant-3 Consider
    quadrant-4 Skip
    PNG export: [0.2, 0.85]
    Share link: [0.35, 0.7]
    Collaboration: [0.85, 0.75]
    Button colors: [0.15, 0.2]`],
  xychart: ["XY chart — cột & đường", `xychart-beta
    title "Revenue 2026 (million USD)"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Million USD" 0 --> 120
    bar [52, 60, 75, 82, 95, 110]
    line [50, 58, 70, 85, 90, 105]`],
  sankey: ["Sankey — dòng chảy", `sankey-beta

Salary,Spending,60
Salary,Savings,25
Salary,Investing,15
Investing,Stocks,10
Investing,Bonds,5`],
  block: ["Block — khối", `block-beta
    columns 3
    FE["Frontend"] space BE["Backend"]
    space DB[("Database")] space
    FE --> BE
    BE --> DB`],
  architecture: ["Architecture — kiến trúc", `architecture-beta
    group sys(cloud)[System]
    service web(internet)[Web] in sys
    service api(server)[API] in sys
    service db(database)[Database] in sys
    service disk(disk)[Storage] in sys
    web:R --> L:api
    api:R --> L:db
    db:B --> T:disk`],
  kanban: ["Kanban — bảng công việc", `kanban
  todo[To do]
    t1[Write docs]
    t2[Design UI]
  doing[In progress]
    t3[Mermaid tool]
  done[Done]
    t4[JSON format tool]`],
  requirement: ["Requirement — yêu cầu", `requirementDiagram
    requirement export_image {
        id: 1
        text: "Export PNG/SVG"
        risk: low
        verifymethod: test
    }
    element tool {
        type: "html"
    }
    tool - satisfies -> export_image`],
  c4: ["C4 — ngữ cảnh hệ thống", `C4Context
    title System context
    Person(user, "User")
    System(tool, "Web Tools", "HTML running in the browser")
    System_Ext(gh, "GitHub Pages", "Static file hosting")
    Rel(user, tool, "Uses")
    Rel(gh, tool, "Serves")`],
  packet: ["Packet — cấu trúc gói tin", `packet-beta
    title UDP packet
    0-15: "Source Port"
    16-31: "Destination Port"
    32-47: "Length"
    48-63: "Checksum"
    64-95: "Data (variable)"`],
  radar: ["Radar — mạng nhện", `radar-beta
    title Tool comparison
    axis e["Ease of use"], o["Offline"], x["Image export"], s["Sharing"], c["Collaboration"]
    curve a["This tool"]{4, 5, 4, 4, 1}
    curve b["Online tool"]{5, 2, 5, 5, 3}
    max 5`],
  treemap: ["Treemap — cây tỷ trọng", `treemap-beta
"Portfolio"
    "Stocks"
        "Banks": 30
        "Real estate": 15
    "Bonds": 35
    "Cash": 20`],
};
