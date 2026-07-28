# Security Design — u2-state-reconcile-hardening

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

security-requirements の失敗経路秘匿と状態完全性を、書込経路の一本化と分類の構造化で実現する設計。新しい認証面・暗号機構は導入しない(security-requirements — U2 は既存 gateway メソッドの再利用のみ)。

## 失敗情報の秘匿設計(security-requirements の中核)

- **分類してから記録**: 失敗は services 由来の分類語彙(retryable / 解決不能 — business-logic-model の失敗分類表)へ写像した**分類結果のみ**を台帳・警告へ書く — 応答 body・token を保存する経路を構造的に持たない(既存 redact 流儀: security-requirements の実装直読 amadeus-mirror-gateway.ts:456-465)。
- **秘匿 assert の設計**: GraphQL errors に固有トークンを仕込んだ失敗注入 → 警告・診断・台帳の 0 hit assert(security-requirements の検証契約)。注入面は FakeGateway 差し替え(tech-stack-decisions の failure injection 決定 — 本番コードにテスト分岐を置かない)。

## 状態完全性の設計

- **書込の一本化**: 台帳への書込は reducer transition 経由のみ(security-requirements)— 直接書込 API をモジュール境界で公開しない。transition は business-logic-model 手順3の3種(upsert-project-entry / mark-project-pending / mark-project-safety-blocked)に閉じる。
- **fail-closed codec**: 台帳 codec は unknown key 拒否・parse 失敗 invalid(security-requirements — 新定数名は本書で確約しない)。壊れた state file は invalid として loud に扱い、無言の部分読込をしない。
- **監査順序**: 書込は audit 確定 → state write の既存順序(security-requirements — reliability-requirements のデータ耐久性と同一機構)に載せ、新しい永続化経路を作らない。

## 権限

- 権限不足は解決不能分類 → safety-blocked へ写像(business-logic-model の失敗分類表)— 権限の自動昇格・再認証を行わない(security-requirements)。呼び出し回数面の攻撃緩和は performance-design の予算構造(performance-requirements)が兼ねる。

## 非目標

- 暗号化・新しい認可層: N/A — U2 は API 面を追加せず(security-requirements)、規模面の攻撃緩和も線形構造(scalability-requirements)で完結。
