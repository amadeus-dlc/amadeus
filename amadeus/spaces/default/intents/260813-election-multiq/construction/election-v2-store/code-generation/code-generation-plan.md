# Code Generation Plan — election-v2-store

## 実行条件

- **Depth:** Standard
- **Test Strategy:** Standard
- **既存実装:** `3daefad491 feat(election): add durable v2 store` で統合済み。再実装せず、U3 の設計契約と現行コード・テストの差分だけを確認する。
- **対象:** `packages/framework/core/tools/amadeus-election-v2-store.ts` と `tests/integration/t549-election-v2-store.integration.test.ts`。U3 以外のコード・テストは変更しない。
- **テスト設定:** 既存の Bun test 設定と `package.json` のスクリプトを継続利用し、新規設定ファイルは追加しない。

## 実装計画

- [x] **Step 1: 既存実装と設計契約の差分確認**
  - `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`security-design.md` と U3 の source/test を照合する。
  - 既存コミット後の U5/U6 連携追加は再実装せず、U3 の所有境界に限定して扱う。
  - **Trace:** U3、FR-BAL-5、FR-COMP-2/3、FR-RER-2/3、NFR-3。

- [x] **Step 2: Pending voter envelope の回帰テストを先行追加**
  - 既存 integration test に、`PendingVoterFileV2` の `electionId` と `voter` が書かれること、および不一致を fail-closed で拒否することを追加する。
  - 実装変更前に対象テストの Red を実測する。
  - **Trace:** U3 `PendingVoterFileV2`、FR-BAL-5、NFR-3、BR-R1〜R3。

- [x] **Step 3: Pending voter envelope の最小修正**
  - pending 書込へ `electionId` と `voter` を含める。
  - pending 読込で directory/definition/filename と両フィールドの一致を検証し、不一致を `corrupt` として拒否する。
  - **Trace:** U3 `PendingVoterFileV2`、BR-B1/B2、FR-COMP-2、NFR-3。

- [x] **Step 4: U3 の検証**
  - focused integration test、typecheck、lint、build、source-only check、diff check を実行し、exit code と結果を記録する。
  - Standard 戦略の integration boundary と、既存のハッピーパス・競合・破損・repair ケースが継続して green であることを確認する。
  - **Trace:** NFR-5、U3 Delivers、Construction Testing Standards。

- [x] **Step 5: 成果物の閉包**
  - 全チェックボックスを実結果に合わせて閉じ、`code-summary.md` と `pr-convergence-report.md` に変更・検証・未検証面を記録する。
  - **Trace:** Code Generation stage completion contract。

## 非適用項目

- API/endpoint、DB migration、frontend、IaC、deployment artifact は U3 の embedded filesystem library 境界に存在しないため非適用。
- E2E/performance/security 専用テストは U3 の適用 NFR に定量目標または外部境界がなく、既存 integration test と fail-closed ケースで当該リスクを検証するため追加しない。将来、U3 に並行 writer、外部 DB、network/auth 境界が追加された場合は再評価する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T17:15:10Z
- **Iteration:** 1
- **Scope decision:** none

U3の契約違反は修正・検証済みであり、repository-wide test:ciの残存失敗はU3回帰の証拠がなく閉じたコード生成ユニットのREADYを妨げない。

### Findings

- FOLLOW-UP | repository-wide test:ciの既知team-up lifecycle失敗とU3外のt420 allowlist不一致は、Build/Testまたは該当所有者が追跡すべきである。
