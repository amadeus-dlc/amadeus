# Build and Test Summary — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(完了条件と検証一式を判定基準として消費)、code-summary(実装成果・PR 収束実績・申告付き逸脱を readiness 評価の入力として消費)

## ビルド状態

| 項目 | 状態 |
|------|------|
| 前提(bun / 依存) | OK — `bun install --frozen-lockfile` 実行済み(`@ast-grep/napi` 含む) |
| `bun run build` | OK(exit 0) |
| `bun run typecheck` | OK(exit 0) |
| `bun run lint` | OK(exit 0) |
| coverage registry | OK(fresh / ratchet held) |

## 生成した試験種別(Test Strategy = Comprehensive)

| 種別 | 生成 | 根拠 |
|------|------|------|
| unit | ✅ `unit-test-instructions.md` | 純関数群(t486、55 tests) |
| integration | ✅ `integration-test-instructions.md` | 実 FS + spawn 境界(t487、19 tests) |
| performance | ✅ `performance-test-instructions.md` | NFR-1(60 秒回帰上限)が実在 |
| security | ✅ `security-test-instructions.md` | FR-7a(read-only)+ security-design の信頼境界契約が実在 |
| E2E / contract / accessibility | ❌ 非生成 | 対応する NFR・ユーザー可視契約が不在。CLI の end-to-end は integration の spawn 実測が既に担う(戦略名だけを根拠に機械追加しない — cid:build-and-test:bt-proportional-selection) |

## Unit ごとのカバレッジ期待

Unit は 1 つ(U1 stage-stats-cli)。純関数層は全 export を in-process 駆動して lcov に載せ、FS 層と CLI shell は integration の実 FS + in-process `main` + spawn で覆う(NFR-2/NFR-3)。patch coverage の正規判定は PR CI(cid:code-generation:local-lcov-pre-push)— PR #2448 で **13 checks green** を実測済み。

## Readiness

| 面 | 判定 |
|----|------|
| build-ready | ✅ |
| test-ready | ✅(対象 twin 74 pass / 0 fail) |
| deployment-ready | ✅ — 実装は PR #2448 として main へ着地済み(merge commit `fa7665dfd`)。配布は既存 coreDirs 投影に乗るため新規配布経路なし |

## 既知の制約・申し送り

1. **フルスイートの ambient 依存**: アクティブな self-feature intent を持つ作業ツリーで `test:ci` を走らせると `t17` / `t66` / `t-runtime-dispatch-seam` の 3 件が落ちる。未改変ベースへ ambient 入力のみを植えて同一再現を確認済み(build-test-results 参照)。本 intent 起因ではないが、ローカルのフルスイート実行条件に影響する既存課題として申し送る
2. **OQ-2 の確定値**: `unparseableReviewHeading` = **117**(上流参照値 3 との乖離は 2 段マッチの寛容側の仕様どおりの帰結)。実装は不変とし本ステージで確定記録した
3. **FOLLOW-UP(FD/ND 由来)**: `zeroSecond` / `unclosedIdle` の相互排他は実装で判定順序を固定し、両条件同時成立 fixture でテスト済み(閉包)
4. **net ≒ 実作業時間は仮説**(A-1): 出力ヘッダに明記する契約(FR-6c)で扱い、妥当性検証は本 intent のスコープ外
