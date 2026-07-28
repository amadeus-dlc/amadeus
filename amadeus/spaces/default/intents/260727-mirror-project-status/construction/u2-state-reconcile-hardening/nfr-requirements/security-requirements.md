# Security Requirements — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 秘匿(requirements NFR-4 — U2 が失敗経路の秘匿 assert を所有)

- 失敗の診断・警告・台帳・receipt に生の GraphQL 応答・token を転記しない(business-rules BR-U2-8 — 既存 `redactSummary`(amadeus-mirror-gateway.ts:456-465、requirements NFR-4 の実装直読)流儀)。
- 検証: GraphQL errors に固有トークン文字列を仕込んだ失敗を注入し、警告・診断・台帳のいずれにもそのトークンが現れないこと(0 hit)を assert(business-rules テスト規約)。失敗分類(retryable / 解決不能)は分類結果のみを台帳へ書き、応答 body を保存しない。

## 認証・権限

- U2 は新しい認証面・API 経路を追加しない — gateway メソッド(u1 導入済み、permit 必須)を再利用するのみ(technology-stack: 依存宣言変更 0 行の断面と整合)。
- 権限不足(permission-denied 類)は解決不能分類として safety-blocked へ写像し(business-logic-model の失敗分類)、権限の自動昇格・再認証を行わない(requirements FR-10b の禁止)。

## 状態の完全性

- 台帳への書込は reducer transition 経由のみ — 直接書込の経路を作らない(business-rules BR-U2-3)。台帳 codec は unknown key 拒否・parse 失敗 invalid の fail-closed とする(requirements NFR-2 — 具体的なキー定数の命名は U1 実装の codec 面に従い、本書では新たな定数名を確約しない)。
- 台帳書込は audit 確定 → state write の既存順序に載せる(business-rules BR-U2-6 — 監査整合の破壊を作らない)。
