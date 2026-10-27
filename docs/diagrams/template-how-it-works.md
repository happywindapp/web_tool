# AI-Native Workspace — Cách hoạt động

> Bộ sơ đồ giới thiệu template **AI-Native Workspace**: một "buồng lái" điều phối nhiều AI coding agent
> (Claude Code · Gemini CLI · GitHub Copilot · GPT Codex) làm việc trên cùng một hệ microservices,
> với **một nguồn tài liệu duy nhất** (`docs/` = single source of truth).

---

## 1. Bức tranh tổng thể (Big Picture)

Một câu: **khai báo 1 lần → mọi AI đọc chung một ngữ cảnh → cùng làm việc trên hệ thống thật, không lệch nhau.**

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'15px','primaryColor':'#eef4ff','primaryBorderColor':'#3b6fd4','lineColor':'#7089a8','primaryTextColor':'#1f2d3d'}}}%%
flowchart LR
    subgraph SRC["🟦 1 · NGUỒN KHAI BÁO DUY NHẤT"]
        direction TB
        MANIFEST["template.config.json<br/><b>★ Single source of declaration</b><br/>services · scalars · datastores · messaging"]
        SCRIPT["apply-template.ps1<br/>thay token + sinh bảng"]
        MANIFEST --> SCRIPT
    end

    subgraph BRAIN["🟩 2 · BUỒNG LÁI AI (Knowledge Hub)"]
        direction TB
        CONFIG["AI config (mỗi tool 1 file)<br/>CLAUDE.md · GEMINI.md · AGENTS.md · copilot"]
        CTX["ai-context/<br/>project-context · working · memory · prompts"]
        DOCS["docs/  ⭐ SINGLE SOURCE OF TRUTH<br/>business · architecture · data-models<br/>api-contracts · security · deployment · ADR"]
        CONFIG -.đọc chung.-> DOCS
        CTX -.đọc chung.-> DOCS
    end

    subgraph AIS["🟨 3 · CÁC AI AGENT"]
        direction TB
        CC["🤖 Claude Code"]
        GM["🤖 Gemini CLI"]
        CP["🤖 GitHub Copilot"]
        CX["🤖 GPT Codex"]
    end

    subgraph TARGETS["🟥 4 · HỆ THỐNG THẬT (Downstream)"]
        direction TB
        R1["repo: frontend / BFF"]
        R2["repo: domain services"]
        R3["repo: integration / gateway"]
    end

    SCRIPT ==>|"điền {{token}}"| CONFIG
    SCRIPT ==>|"điền {{token}}"| CTX
    SCRIPT ==>|"sinh Service Registry"| DOCS

    CONFIG ==>|auto-load lúc khởi động| AIS
    DOCS   ==>|tra cứu chung| AIS
    CTX    ==>|memory + prompts| AIS

    AIS ==>|code · review · debug| TARGETS
    TARGETS -.học & ghi lại.-> CTX

    classDef src fill:#dbe7ff,stroke:#3b6fd4,stroke-width:2px,color:#13203a
    classDef brain fill:#dcf3e4,stroke:#2f9e57,stroke-width:2px,color:#0f3320
    classDef ais fill:#fff3cf,stroke:#d8a417,stroke-width:2px,color:#4a3a00
    classDef tgt fill:#ffe0e0,stroke:#d4503b,stroke-width:2px,color:#4a1410
    class MANIFEST,SCRIPT src
    class CONFIG,CTX,DOCS brain
    class CC,GM,CP,CX ais
    class R1,R2,R3 tgt
```

---

## 2. Vấn đề & Giải pháp (Why)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
flowchart TB
    subgraph BEFORE["❌ KHÔNG có template"]
        direction TB
        B1["Mỗi AI một ngữ cảnh riêng<br/>→ trả lời lệch nhau"]
        B2["Tài liệu nhân bản trong<br/>từng repo → drift, lỗi thời"]
        B3["Tên/stack/endpoint khai<br/>nhiều nơi → sai lệch"]
        B4["Secrets lẫn trong docs<br/>→ rủi ro lộ khi public"]
    end

    subgraph AFTER["✅ CÓ template AI-Native Workspace"]
        direction TB
        A1["Mọi AI đọc chung<br/>docs/ + ai-context/"]
        A2["docs/ = single source<br/>of truth, không nhân bản"]
        A3["Khai 1 lần ở manifest<br/>→ DRY, tự sinh bảng"]
        A4["server-config.md gitignored<br/>template chỉ có placeholder"]
    end

    B1 ==> A1
    B2 ==> A2
    B3 ==> A3
    B4 ==> A4

    classDef bad fill:#ffe0e0,stroke:#d4503b,color:#4a1410
    classDef good fill:#dcf3e4,stroke:#2f9e57,color:#0f3320
    class B1,B2,B3,B4 bad
    class A1,A2,A3,A4 good
```

---

## 3. Luồng vận hành đầu-cuối (Setup → Daily work)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
sequenceDiagram
    autonumber
    actor Dev as 👤 Dev / Tech Lead
    participant M as 📄 template.config.json
    participant S as ⚙️ apply-template.ps1
    participant H as 🧠 Hub (docs/ + ai-context/)
    participant AI as 🤖 AI Agents
    participant T as 📦 Repo hệ thống thật

    rect rgb(219,231,255)
    Note over Dev,S: GIAI ĐOẠN 1 — Khởi tạo (1 lần)
    Dev->>M: Khai services / scalars / datastores
    Dev->>S: pwsh scripts/apply-template.ps1
    S->>H: Thay {{token}} trong mọi .md
    S->>H: Tự sinh Service Registry + env theo tier
    end

    rect rgb(220,243,228)
    Note over Dev,AI: GIAI ĐOẠN 2 — Bootstrap context
    Dev->>AI: Chạy prompt 2 (autofill từ codebase)
    AI->>T: Quét code các repo
    AI->>H: Điền docs/ (architecture, data-models, API...)
    end

    rect rgb(255,243,207)
    Note over Dev,T: GIAI ĐOẠN 3 — Làm việc hằng ngày
    Dev->>AI: Yêu cầu (feature / debug / review)
    AI->>H: Đọc project-context → docs/ → sprint hiện tại
    AI->>T: Implement / sửa / review code
    AI->>H: Ghi memory + cập nhật working/
    Note over AI,H: Khi contract đổi → prompt 4 re-sync docs
    end
```

---

## 4. Mô hình token: khai 1 chỗ, dùng mọi nơi (DRY)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
flowchart LR
    subgraph IN["template.config.json"]
        direction TB
        SV["services[]<br/>key·name·tier·stack·repo"]
        SC["scalars<br/>company·team-email·external-systems"]
        TM["tokenMap<br/>@svc:key:field"]
    end

    ENG{{"apply-template.ps1<br/>resolver"}}

    subgraph OUT["Mọi file .md trong hub"]
        direction TB
        T1["c:/_web_tool → giá trị thật"]
        T2["{{service-x}} → tên service (qua tokenMap)"]
        T3["Bảng giữa BEGIN gen / END<br/>→ tự sinh lại"]
        T4["{{repo}} {{host}} {{port}}<br/>→ giữ nguyên (use-time)"]
    end

    SV --> ENG
    SC --> ENG
    TM --> ENG
    ENG -->|thay| T1
    ENG -->|thay qua tokenMap| T2
    ENG -->|regenerate| T3
    ENG -.bỏ qua.-> T4

    classDef in fill:#dbe7ff,stroke:#3b6fd4,color:#13203a
    classDef out fill:#dcf3e4,stroke:#2f9e57,color:#0f3320
    classDef eng fill:#fff3cf,stroke:#d8a417,color:#4a3a00
    class SV,SC,TM in
    class T1,T2,T3,T4 out
    class ENG eng
```

---

## 5. Phân tầng Service (Service Tiers) — map mọi hệ microservices

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
flowchart TB
    U["👥 Người dùng cuối"] --> FE["frontend<br/>Web / Mobile app"]
    FE --> BFF["bff<br/>Backend-for-frontend / API gateway"]
    BFF --> GW["gateway<br/>Reverse proxy / ingress"]
    GW --> DOM
    subgraph DOM["domain — mỗi bounded context 1 service"]
        direction LR
        D1["Domain service A"]
        D2["Domain service B"]
        D3["Domain service …N"]
    end
    DOM --> INT["integration<br/>Adapter hệ ngoài (REST · SOAP · message queue)"]
    INT --> EXT["🔌 Hệ ngoài / 3rd-party<br/>(core back-office · partner API · legacy)"]
    INFRA["infra — CI/CD · observability · shared contracts (proto/OpenAPI)"] -.xuyên suốt.-> DOM

    classDef l fill:#eef4ff,stroke:#3b6fd4,color:#13203a
    classDef d fill:#dcf3e4,stroke:#2f9e57,color:#0f3320
    classDef e fill:#ffe0e0,stroke:#d4503b,color:#4a1410
    class FE,BFF,GW l
    class D1,D2,D3,DOM,INFRA d
    class EXT e
```

---

## 6. Vòng đời prompt vận hành đa-AI

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
flowchart LR
    P1["1 · init<br/>Dựng khung"] --> P2["2 · autofill<br/>Điền docs từ code"]
    P2 --> P3["3 · system-docs<br/>Tài liệu đa repo"]
    P3 --> P5["5 · remember<br/>Lưu cấu trúc vào memory"]
    P5 --> P6["6 · onboard<br/>Protocol đọc-context"]
    P6 --> DAILY{{"Làm việc hằng ngày<br/>feature · debug · review · refactor"}}
    DAILY --> P4["4 · sync-docs<br/>Re-sync khi drift"]
    P4 -.docs luôn tươi.-> DAILY

    classDef once fill:#dbe7ff,stroke:#3b6fd4,color:#13203a
    classDef loop fill:#fff3cf,stroke:#d8a417,color:#4a3a00
    class P1,P2,P3,P5,P6 once
    class DAILY,P4 loop
```

---

## 7. Guardrails an toàn (điểm nhấn khi pitch)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial','fontSize':'14px'}}}%%
flowchart TB
    HUB["🧠 AI-Native Workspace"]
    HUB --> G1["🔒 DB READ-ONLY<br/>AI chỉ SELECT, không ghi/xóa"]
    HUB --> G2["🚦 Không tự git commit/push<br/>user giữ quyền cuối"]
    HUB --> G3["🙈 Secrets tách riêng<br/>server-config.md gitignored"]
    HUB --> G4["📚 docs/ = source of truth<br/>code mâu thuẫn → tin docs"]
    HUB --> G5["🧩 Skill global tái dùng<br/>nạp động theo description"]

    classDef hub fill:#dcf3e4,stroke:#2f9e57,stroke-width:2px,color:#0f3320
    classDef g fill:#eef4ff,stroke:#3b6fd4,color:#13203a
    class HUB hub
    class G1,G2,G3,G4,G5 g
```
