# Build and Test Summary — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md`(Step 8 の検証集合)と `code-summary.md`(FR 別の着地面実測と配送クロージャ)。実行 tree = `e7c0515fec217a589035e8ba0aef814599ad34a2`。

## ステータス

| 面 | 状態 | 根拠 |
|---|---|---|
| ビルド | 成功 | `bun install` / `bun run build` 各 exit 0、build 後の追跡 drift は record 配下のみ |
| 静的検査 | 成功 | typecheck / lint / source-only / distribution 3種 / no-silent-drop / callsite-guard すべて exit 0 |
| 対象テスト | 成功 | t528 = 7 pass / 0 fail、t115+t118 = 38 pass / 0 fail |
| 再現性検査 | 成功 | 隔離2回ビルド + `diff -r` → exit 0(dist 5256 / 5256 ファイル) |
| グラフ不変量 | 成功 | `bun .claude/tools/amadeus-graph.ts compile --check` exit 0 |
| フルスイート | 条件付き | `Test files: 1060 / Failed files: 2 / Failed assertions: 5`(**exit 2**)。2件とも環境起因で自変更由来 0 件 — 帰属の実測は `build-test-results.md` |
| 性能テスト | N/A | 合否を決める性能 NFR が要件に不在(`performance-test-instructions.md` に判定・根拠・覆す条件を記録) |
| セキュリティテスト | N/A | 合否を決めるセキュリティ NFR が要件に不在(`security-test-instructions.md` に同上) |
| 形式検証 | 成功 | 登録済み全4モデルの TLC 網羅探索が NOT_DETECTED / exit 0、`completion-marker.json` は 4件とも `complete: true`。model-map のピン drift 0 |

## 生成した指示書

| ファイル | 種別 |
|---|---|
| `build-instructions.md` | 実体 |
| `unit-test-instructions.md` | 実体(要件駆動の対応表。新規テスト追加は不要と判定) |
| `integration-test-instructions.md` | 実体(境界とローカル実行時の注意) |
| `performance-test-instructions.md` | N/A 判定 |
| `security-test-instructions.md` | N/A 判定 |
| `build-test-results.md` | 実行結果 |

Test Strategy は `Comprehensive` だが、性能・セキュリティは要件に数値目標・合否条件が宣言されていないため実体を作らず、判定・根拠・将来この判定を覆す条件を各指示書に明記した(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## カバレッジ

本 intent の diff は `amadeus/` の record のみ(`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus/'` → 0 行)。patch coverage の対象行が存在しないため、coverage gate は本 PR に対して評価対象を持たない。実装面のカバレッジは配送元 PR #2767 が merge queue を通過した時点で評価済み。

## 準備状況

- **build-ready**: はい
- **test-ready**: はい(自変更由来の失敗 0)
- **deployment-ready**: 該当なし。本プロジェクトはデプロイ基盤を持たず、配送は npm パッケージ / GitHub Release / タグで管理する。本 intent の実装はすでに `main` へ着地済み(#2767 / `34888d840`)で、残るのは record を運ぶ PR #3236 のみ

## 既知の制約・申し送り

- フルスイートをローカルで回す前に `amadeus/spaces/<space>/intents/active-intent` カーソルを退避すること。カーソルが実 intent を指したままだと `t-approve-batch-presence-guard` が決定的に落ち、実 record の監査シャードにテスト由来の `ERROR_LOGGED` が混入する(Issue **#3243**)
- `t222-migration-routing` は並行負荷下で git の一時ファイル作成に失敗しうる(単独実行では 43 pass / 0 fail)
- 本 unit の配送クロージャは、supersede された unit に正直な収束経路がないという構造欠落に当たった。回避策(record を運ぶ Bolt PR #3236)で閉じ、欠落自体は Issue #3239 として起票済み

## code-generation §12a の申し送り(完了ゲートで集約)

iteration-2 は READY(BLOCKER 0)。付随した FOLLOW-UP のうち測定で閉じられる2件(FR-5 の docs 2面 census、NFR ブロッキング集合の未測定3要素)は本ステージで閉じた(`build-test-results.md` 末尾)。残る4件は本 intent のスコープ外または別 Issue 相当として申し送る:

1. `requirements.md` 本文が方式 A のままで Q1 の A→B 改訂への参照を持たない — 要件成果物の改訂を要するため、本 intent では questions.md の改訂節と `code-summary.md` の対応表で橋渡しするに留めた
2. SKILL 面の件数語ドリフト残余(現行 main は `thirteen kinds` に対し `VALID_KINDS` は 17 要素)— RA が Out of scope とした仮説C の残余。別 Issue 候補として据え置き
3. gated 最終の終端信号の第2の腕(`emitDeferredCompletionBoundary`)が列挙述語の対象外で読解依拠 — 述語の拡張を要する
4. `mirror-docs-contract.ts` / `scan-public-projections.ts` の初回 exit 1 を併走負荷に帰した根拠が識別的でない — 再現条件の切り分けが未実施
