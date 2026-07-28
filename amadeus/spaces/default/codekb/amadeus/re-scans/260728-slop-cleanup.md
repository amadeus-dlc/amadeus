# Reverse Engineering Re-scan: 260728-slop-cleanup

## スキャン識別子

- `base`: `none`
- `observed`: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- `focus`: 5 パス・3 カテゴリの Slop cleanup（失効コメント、未使用状態フィールド、Markdown whitespace）
- `date`: `2026-07-28`
- `scope`: `amadeus-bugfix` / Minimal / Brownfield / single repo `amadeus`

`base=none` は、既存 codekb の最新 observed `afb93a825...` が現 HEAD の祖先ではなく、差分 base に使えないためである。現 HEAD の実測を正とし、参考 release `v0.1.6`（`68f2d6699ccb8148c0427b1ff56d37116e565f89`）から observed までは 47 commits、shortstat は 1,939 files changed / 188,699 insertions / 830,609 deletions。

## 確定 finding と修正境界

1. `packages/framework/core/tools/amadeus-journal.ts:9-13`: 「PR-3 まで未配線」というコメントは失効。PR-3 `748e693e3` は着地済みで、audit / state / lib / journal-convert / otel-projector の 5 canonical module が import する。コメントのみ更新し、正本 + 7 dist + 5 self-install の 13 コピーを同期する。
2. `packages/framework/core/tools/amadeus-observability.ts:240-255`: `ProcessObservation.registered` は宣言と `true` 初期化だけで読取なし。`_processObservation !== null` が登録状態を表すため、フィールドと初期化子だけを削除する。`t357` が first-caller-wins / flush / idempotence の回帰境界。
3. Markdown whitespace: `amadeus/spaces/default/intents/260727-solo-election/construction/solo-election-core/code-generation/code-generation-plan.md:3` の trailing spaces、`docs/reference/18-workspace-layout.md:108` と `.ja.md:108` の EOF blank line を除去する。

対象 5 path に scan 時点の未コミット差分はない。別件の番号回答修正 45 tracked filesとは独立しており、本 re-scan はそれらを変更・評価しない。巨大 tool files と既存 complexity は技術負債だが、本 intent の範囲外。

## センサー不適用と代替検証

Reverse Engineering の `required-sections` / `upstream-coverage` / `answer-evidence` は codekb 出力 path で構造的に発火できないため、センサー成功とは記録しない。代替として次を実行する。

- H2 数: business 17 / architecture 56 / code-structure 53 / API 23 / component 41 / technology 17 / dependencies 19 / quality 59 / timestamp 72 / 本 re-scan 4。全 10 ファイルで H2 ≥ 2
- conflict marker: 全 10 ファイル 0 件
- 現在マーカー: 共有成果物 9 件で `260728-slop-cleanup` が各 1 件、旧 `260727-plugin-verb-skills` の「現在」は 0 件。本 re-scan はファイル名と `observed` / `date` metadata で intent を識別
- Mermaid: 新設 flowchart は `flowchart-v2 PASS`、sequence は `sequence PASS`（Mermaid `11.12.2` parser）。各図の直後にテキスト代替あり
- whitespace baseline: `git diff --check v0.1.6..HEAD -- <5 targets>` は code-generation plan の trailing whitespace 1 件、workspace-layout 日英の EOF blank line 各 1 件の計 3 diagnostics。実装後は同じ限定検査で 0 件へ閉じる

## 配送境界

本 scan が変更するのは共有 codekb 9 件と本 per-intent re-scan のみ。コード、テスト、state、audit、memory、他 intent record は変更しない。実装時は core 正本を変更してから既存の package / self-promotion 経路で生成面を同期し、typecheck / lint / `t357` / drift guards / target 限定 whitespace check を実行する。
