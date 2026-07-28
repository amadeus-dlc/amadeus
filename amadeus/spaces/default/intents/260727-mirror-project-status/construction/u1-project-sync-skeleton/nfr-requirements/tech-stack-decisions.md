# Tech Stack Decisions — u1-project-sync-skeleton

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 決定一覧

| 決定 | 根拠 |
|---|---|
| 新規依存ゼロ(Bun/TypeScript ESM・Biome・tsc 不変) | technology-stack 実測: 本 intent 区間で依存宣言の変更 0 行。配布フレームワークへの runtime dependency 追加は文書化なしに禁止(project.md Forbidden)— 追加しないので抵触なし |
| GraphQL 到達は `gh api graphql` の argv 族に閉じる(GraphQL クライアントライブラリを追加しない) | technology-stack 実測: GraphQL は repo 初(実装コード 0)で、gh が唯一の GitHub 到達手段。business-logic-model の gateway 4メソッドは argv 族+body errors 解釈層で成立し、新規依存なしで要件を満たす |
| プロセスモデル: 既存 runner の argv spawn(shell 不使用)+deadline profile を再利用(実装直読: amadeus-mirror-runner.ts:29 `single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB }`) | requirements FR-1b(チェーン内実行・daemon/polling なし)+既存 runner 資産の reuse(新機構を作らない) |
| テストは既存4層ランナー(smoke/unit/integration/e2e)へ追加 | technology-stack: tests/run-tests.sh の4層不変。requirements FR-12a の既習様式(fake runner+od -c golden / FakeGateway / runtime 注入)に従う |
| 実 FS を使う検証は integration 層、純関数は unit 直叩き | business-rules のテスト規約(fs-tests-integration-first)— test-size ratchet を配置根拠とする |

## 却下した代替案

- **GraphQL クライアントライブラリの新規導入**: 却下 — 利用者側 Bun-only 前提を崩す runtime dependency となり(project.md Forbidden)、`gh api graphql` で要件(照会2種+mutation 2種)が満たせる。認証も gh credential store 委譲のまま保てる(security-requirements と整合)。
- **REST での ProjectV2 操作**: 却下 — ProjectV2 API は GraphQL のみで提供され、既存 REST argv 族(gh api --method <VERB>)では到達不能(technology-stack の実測注記: 同じ argv 形では書けない)。
