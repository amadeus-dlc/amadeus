上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

# Code Generation Plan — kimi-live-journey(Bolt 6)

unit-of-work.md の U6 と requirements.md の FR-9、および本 unit の FD/NFR 成果物(business-logic-model.md §driver フロー・§hermeticity の機構、business-rules.md BR-1〜BR-5、domain-entities.md §PrintDrive・§Journey、nfr-design の security/reliability 設計)に基づく。story 相当は FR-9。

- [x] **Step 1: `tests/harness/kimi-print-drive.ts` 実装**(FR-9a)
  - `runPrintSession({ cwd, prompt, env })(`kimi -p` spawn + stdout/stderr/exit 回収)と `skipReason()`(`AMADEUS_KIMI_PRINT_LIVE !== "1"` または kimi バイナリ不在)。既存 driver と同じポート形状。「SPENDS Kimi credits」明記
  - 認証の所在(KIMI_CODE_HOME 差替で未認証となるか)を実機で確認し、影響時の扱いを driver に反映(security-requirements の前提)
- [x] **Step 2: journey 実装**(FR-9a)
  - `tests/e2e/t-print-kimi-status.serial.test.ts`: tmp プロジェクトへ dist/kimi 配置 + `KIMI_CODE_HOME=<tmp>` 注入で `/skill:amadeus --status` 相当の応答を断言
  - `tests/e2e/t-print-kimi-doctor.serial.test.ts`: (a) managed block 未配線の tmp 環境で hint 報告、(b) B3 の merge で seeded した環境で adapter/managed block/バージョンの各チェックが pass(probe は advisory で判定に含めない)
- [x] **Step 3: 決定的 tier での skip 確認 + ローカル実走**(FR-9b)
  - ゲートなしでは skipReason で skip されることを確認
  - `AMADEUS_KIMI_PRINT_LIVE=1` でローカル実走し green を確認(CC-1 範囲)。実走ログを残す
- [x] **Step 4: 検証**
  - driver の単体検証(skipReason 分岐・spawn 失敗)・`bun run typecheck`・`bun run lint`・関連テスト

## トレーサビリティ

- FR-9a → Step 1-2 / FR-9b → Step 3 / DoD → Step 4
- journey 2(b) は U3 の merge module と U4 の doctor arm(Bolt 3/4 で完了)を使用する

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T07:11:15Z
- **Iteration:** 1
- **Scope decision:** none

plan は U6/FR-9 を Standard 戦略どおり覆い、summary は BR-1〜5 と整合。認証 symlink 供給は no-copy 制約を満たし seed config は非秘密。検出2件は全て minor で同一 iteration で修正済み。spot-check 要求は conductor が driver を直接確認して解決(symlink・空 api_key・env 準備のみを確認)。

### Findings

- (minor / plan・summary ヘッダ) consumes 表記の不一致 → 修正済み(宣言全数へ現行化)
- (minor / summary) symlink の write-through 帰結 → 修正済み(受容済み帰結として明記)
- (spot-check 要求) integrationId「FR-9」の両含有行が成果物にないため機械的に棄却相当 → conductor が driver を直接確認して解決
