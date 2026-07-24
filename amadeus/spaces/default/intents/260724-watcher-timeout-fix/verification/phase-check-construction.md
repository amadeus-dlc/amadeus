# Phase Boundary Check — Construction（260724-watcher-timeout-fix / Issue #1449）

検証日時: 2026-07-24T17:10:27Z
検証者: conductor
スコープ: bugfix（Construction EXECUTE: code-generation / build-and-test）
参照元: `code-generation-plan.md`、`code-summary.md`

## 判定

**PASS — Construction境界の通過可。**

要件から実装・回帰テスト・配布同期までの追跡に断絶はなく、Constructionの必須成果物は
すべて実在する。実装起因の未解決失敗、P0/P1欠陥、孤立した変更はない。

## スコープ適合性

| Construction stage | 状態 | 根拠 |
|---|---|---|
| functional-design | SKIP | bugfixスコープ。requirementsからコードへ直接追跡 |
| nfr-requirements | SKIP | NFRはrequirements-analysisで確定済み |
| nfr-design | SKIP | 既存タイミングシームを再利用する外科的修正 |
| infrastructure-design | SKIP | インフラ・実行環境の変更なし |
| code-generation | COMPLETE | 計画・実装・テスト・§12aレビュー READY |
| build-and-test | AWAITING APPROVAL | 全成果物・品質ゲート・§13学習儀式が完了 |
| ci-pipeline | SKIP | CI設定・依存・workflowの変更なし |

Operationの全stageもbugfixスコープでSKIPされる。したがって、CI設定やインフラ設計の
不存在はConstructionの欠落ではなく、承認済みスコープによるN/Aである。

## 要件から実装へのトレーサビリティ

| 要件 | 実装証跡 | 状態 |
|---|---|---|
| FR-1 / AC-1a | `WATCHER_RESEND_MAX=1`、`max_attempts=RESEND_MAX+1` | Fully traced |
| AC-1b / NFR-2 | `WATCHER_READY_TIMEOUT=90`を維持 | Fully traced |
| AC-1c / FR-3 | `verify_watchers_armed`を`mux_attach`前に実行し、非ゼロ終了を保持 | Fully traced |
| FR-2 | armedメンバーを即時skipする既存ループを無変更で保持 | Fully traced |
| FR-4 | unarmedメンバー名と回復ガイダンスのstderr出力を保持 | Fully traced |
| NFR-1a | 既定再送1回とnever-arm時の再送回数を回帰テストで検証 | Fully traced |
| NFR-1b | 1回再送後にarmedへ回復するテスト | Fully traced |
| NFR-1c | timeout既定値90の軽量定数テスト | Fully traced |

実装対象は `packages/framework/core/tools/team-up.sh` の既定値と説明コメントに限定される。
要求外のループ撤去、agmsg側変更、exit code変更、追加の互換分岐はない。

## 実装からテストへのトレーサビリティ

| 観測対象 | テスト証跡 | 結果 |
|---|---|---|
| 正常系の即時成功 | `all members already armed passes with no re-send` | PASS |
| unarmed時の非ゼロ終了と名指し | `unarmed members that never arm exit non-zero and are named` | PASS |
| timeout既定90 | `WATCHER_READY_TIMEOUT defaults to 90` | PASS |
| resend既定1 | `WATCHER_RESEND_MAX defaults to 1` | PASS |
| never-arm時の再送1回 | `never-arm re-sends exactly once at the default budget` | PASS |
| 1回再送後の回復 | `a member armed after a single re-send still recovers` | PASS |

対象suite全体は11 pass / 0 fail / 0 skip / 47 assertions。Code Generationで
pre-fix既定値によるREDと修正後GREENも実測済みである。

## Build・配布・成果物検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint` | exit 0。変更テスト単体はwarning 0 |
| `bun run dist:check` | 6ハーネス同期、PASS |
| `bun run promote:self:check` | self-install 4面同期、PASS |
| Code Generation成果物 | 2件実在、レビュー READY |
| Build and Test成果物 | 7件実在 |
| required-sections | 7/7 PASS |
| upstream-coverage | 7/7 PASS |

初回typecheckの `tsc: command not found` は依存未導入による環境準備不足であり、
`bun install --frozen-lockfile` 後の再実行でPASSした。コード修正は発生していない。

## ギャップ・孤立・矛盾

- 欠落トレーサビリティ: 0件。
- 孤立したコード・テスト・成果物: 0件。
- 要件と実装の矛盾: 0件。
- 実装起因の未解決テスト失敗: 0件。
- 既知制約: 実90秒待機はE-WTFRA2の裁定により実施せず、同一制御経路の短縮シームで検証。
- リポジトリlintの既存warning 255件はexit 0であり、変更対象ファイル単体はwarning 0。

## 人間承認

- [x] Build and Test最終ゲートでConstruction境界を承認済み（2026-07-24T17:11:35Z）。
