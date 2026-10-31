const STRUCTURIZR_SAMPLES = {
  banking: ["Internet banking — 3 view", `workspace "Internet banking" "Sample C4 model" {

    model {
        customer = person "Customer" "A retail bank customer"
        support = person "Support staff" "Handles customer enquiries"

        banking = softwareSystem "Internet banking" "Lets customers view accounts and pay" {
            web = container "Web application" "Delivers the single-page app" "Java, Spring MVC"
            spa = container "Single-page app" "Banking features in the browser" "TypeScript, React"
            api = container "API application" "Provides banking functions as JSON" "Java, Spring Boot" {
                signin = component "Sign-in controller" "Signs users in" "Spring MVC"
                accounts = component "Accounts controller" "Lists accounts" "Spring MVC"
                security = component "Security component" "Verifies passwords" "Spring Bean"
            }
            db = container "Database" "Stores users and sessions" "PostgreSQL" "Database"
        }

        core = softwareSystem "Core banking" "Stores accounts and transactions" "External"
        mail = softwareSystem "Email system" "Sends notifications" "External"

        customer -> web "Visits" "HTTPS"
        customer -> spa "Views balances, makes payments"
        support -> core "Uses"
        web -> spa "Delivers"
        spa -> signin "Signs in" "JSON/HTTPS"
        spa -> accounts "Reads accounts" "JSON/HTTPS"
        signin -> security "Uses"
        security -> db "Reads users" "JDBC"
        accounts -> core "Reads accounts" "XML/HTTPS"
        api -> mail "Sends email" "SMTP"
        mail -> customer "Sends email to"
    }

    views {
        systemContext banking "context" {
            include *
            autoLayout lr
        }
        container banking "containers" {
            include *
            autoLayout lr
        }
        component api "components" {
            include *
            autoLayout tb
        }
        styles {
            element "External" {
                background #8a8a8a
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`],
  auto: ["Tự sinh view (không khai báo views)", `workspace "Order platform" {
    !identifiers hierarchical

    model {
        buyer = person "Buyer"
        shop = softwareSystem "Shop" {
            web = container "Web" "Storefront" "Next.js"
            orders = container "Orders" "Order API" "Go"
            db = container "Orders DB" "" "PostgreSQL" "Database"
            web -> orders "Places orders"
            orders -> db "Stores orders"
        }
        pay = softwareSystem "Payment provider"
        buyer -> shop.web "Buys products"
        shop.orders -> pay "Charges cards"
    }
}`],
  broken: ["Mã lỗi — thử báo lỗi", `workspace {
    model {
        user = person "User"
        app = softwareSystem "App"
        user -> missing "Uses"
    }
    views {
        systemContext app {
            include *
        }
    }
`],
};
