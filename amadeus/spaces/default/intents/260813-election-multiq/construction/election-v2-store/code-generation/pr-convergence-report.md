# 収束レポート — election-v2-store

## 判定

**BLOCKED（repository-wide verification） / READY（local U3 implementation scope）**。pending envelope の identity contract と unchecked JSON cast を test-first で閉じ、U3 focused integration、typecheck、lint、build、source-only、standalone unchecked-cast guard は成功した。一方、NFR-5 の必須 `bun run test:ci` が20 filesで失敗しているため、repository 全体として READY または PR 収束済みとは判定しない。

リモート review thread、mergeability、必須 check rollup は本 directive の対象外であり、外部状態の照会・更新は行っていない。このレポートは local U3 code-generation と共有 workspace の検証断面だけを示す。

## 観測断面

- observed at: `2026-08-13T17:13:06Z`
- HEAD: `cd225e6ea1c5834aaa79b3e68030213ba04c9340`
- integrated U3 baseline: `3daefad491`
- branch: `enhancement-election-cli-cli-per-question-choice`
- scope: `self-feature`（Amadeus self-development の機能拡張）

## 実行証拠

| Command | Result |
|---|---|
| `bun test --timeout 120000 tests/integration/t549-election-v2-store.integration.test.ts`（envelope test 追加後、実装修正前） | exit 1、8 pass / 1 fail / 55 expect calls。`electionId` / `voter` 欠落の Red |
| 同 focused test（最終） | exit 0、9 pass / 0 fail / 61 expect calls |
| `bunx @biomejs/biome check`（U3 source/test 2 files） | exit 0、diagnostic なし |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0、1818 files、473 warnings / 17 infos。U3 個別検査は clean |
| `bun run build` | exit 0、8 harness projection と self-install 面を再生成 |
| `bun run source-only:check` | exit 0、source-only boundary clean |
| `bun tests/unchecked-cast-guard.ts --check` | exit 0、U3 の新規 cast 0 |
| `bun run test:ci` | exit 20、1006 files / 20 failed files、13384 assertions / 68 failed assertions。U3 `t549` は 9/9 pass |
| `bun test --timeout 120000 tests/integration/t-team-up-run-lifecycle.serial.test.ts` | exit 1、22 pass / 16 fail。単独でも再現 |
| `bun test --timeout 120000 tests/integration/t420-unchecked-cast-guard-cli.test.ts`（U3補正後） | exit 1、18 pass / 1 fail。残件は U3 外の shrink-only allowlist byte drift |
| `git diff --check`（U3 source/test/artifacts） | exit 0 |

## 収束対象

- Contract gap: `PendingVoterFileV2` の top-level `electionId` / `voter` が書かれず、読込時にも directory/filename/definition identity と照合されなかった。
- Fix: 両フィールドを canonical pending write に含め、各不一致を `corrupt` として拒否。
- Guard gap: JSON parse 結果を `object` / `CanonicalBallot` と直接主張する2件。
- Fix: `unknown` 境界へ戻し、Election definition は record proof 後に使用。pending ballot bytes は downstream strict read codec が domain 型を確定する。
- Regression evidence: envelope exact values、electionId mismatch、voter mismatch、既存の idempotency/conflict/durability/repair/path traversal/mixed lifecycle/corruption ケースを同一 integration file で green 確認。
- Change isolation: U3 source 1 file、既存 U3 integration test 1 file、宣言済み stage artifacts 3 filesのみ。当エージェントは Intent state と commit を変更していない。

## 未収束面

- Full CI の20 failed filesすべてを U3 変更へ帰属できない。少なくとも `t-team-up-run-lifecycle.serial` は単独で16 failuresが再現し、`t420` の残る1 failure は別変更の allowlist byte driftである。
- full CI は U3 cast 補正前に `t420` を通過したため、その run 自体は再利用して green とみなせない。補正後は standalone guard、focused U3、typecheck、lint、build、source-only を再実行した。
- coverage gates、隔離2回 reproducible-build、TLC/model-map、外部 repository hosting の review/check 状態は本 U3 code-generation directive では個別実行・照会していない。

## Blocker

- **BLOCKER:** repository-wide `bun run test:ci` の20 failed filesを解消または clean workspace で再検証し、exit 0 を得るまで NFR-5 / repository-wide convergence は未達。
- **FOLLOW-UP:** team-up owner が safety-wait supervisor と run lifecycle の単独再現16 failuresを調査する。
- **FOLLOW-UP:** migration owner が shrink-only cast allowlist の byte driftを、自身の変更と整合する形で収束させる。
