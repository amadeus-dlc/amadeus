# Tech Stack Decisions — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 決定一覧

| 決定 | 根拠 |
|---|---|
| 新規依存ゼロ — 既存 3層 config.json の closed-schema 拡張と既存 repair status の additive 拡張のみ | technology-stack 実測: 本 intent 区間で依存宣言の変更 0 行。requirements FR-5a(既存 mirror config への拡張 — Q3 裁定 A) |
| 設定 parse は既存 unknown-key 拒否様式へ `mirror-projects` を許容キー追加する形で実装(新 parser・スキーマライブラリを導入しない) | business-logic-model の4面一般化(既存様式 amadeus-mirror-config.ts:335-339 の実装直読を確認済み)+business-rules BR-U4-1 |
| 期待 Status の導出は同期側 canonical 定義の共有消費 — 診断用の複製導出・独自文字列表を作らない | business-rules BR-U4-5(requirements FR-9c、cid:code-generation:c1-drift-canonical-renderer) |
| 診断ケースのテストは FakeGateway 差し替えの既習様式+mutation 0 の history assert | business-rules テスト規約(受入条件12)— 既存4層テストランナー(technology-stack)へ追加 |
| 実 FS(config 3層読取)は integration 層、分類・写像の純関数は unit 直叩き | business-rules テスト規約(fs-tests-integration-first — test-size ratchet を配置根拠) |

## 却下した代替案

- **設定スキーマ検証ライブラリ(zod 等)の導入**: 却下 — 利用者側 Bun-only 前提を崩す runtime dependency(technology-stack: 依存追加ゼロの断面と project.md Forbidden)。既存の手書き closed-schema 検証様式(business-logic-model の4面)で FR-5 の全契約が満たせる。
- **診断専用の独立コマンド新設**: 却下 — requirements FR-9a は既存 `repair status` の**拡張**を規定(business-rules BR-U4-9 の additive 原則)。新コマンドは受入条件12 の検証面を分裂させ、既存 repair 系の contract テストを再利用できない。
