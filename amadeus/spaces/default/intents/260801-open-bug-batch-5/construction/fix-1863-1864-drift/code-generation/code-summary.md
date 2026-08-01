# Code Summary — fix-1863-1864-drift(Bolt 4)

上流入力(consumes 全数): requirements.md

- 実装は `requirements.md` FR-7 / FR-8 の AC 全数に対し Red→Green を実測して完了した。PR: [#1877](https://github.com/amadeus-dlc/amadeus/pull/1877)(branch `bolt/obb5-4-drift`、base `c49e385ac`)— 全チェック green / CLEAN。

## 変更面

- `packages/framework/core/tools/amadeus-graph.ts` — `mergeComposedScopes` の `knownSlugs` GC を撤去し折り込みセルを verbatim 保存(core 差分 31行)。
- `.github/workflows/ci.yml` — `drift-check` ジョブへ `compile --check`(実リポジトリ断面)を1ステップ追加(ci-success needs 不変)。
- `tests/.coverage-patch-allowlist.json` — `:1838` 転位エントリ削除(FR-8)+自変更起因の行シフト分を機械 remap(`amadeus-graph.ts:1643-1648` → +5)。
- テスト: t397 新設、t355 unit/integration を宣言つき改訂(GC → preserve、理由コメント付き)。clobber 側5件は無改訂 green。
- dist 7面+self-install 再生成。

## AC 実測

| AC | Red | Green |
|---|---|---|
| AC-7a | 修正前 dist で A=EXECUTE / B=DROPPED / C=DROPPED(C が無音消失) | t397+t355 unit 15 pass、t355 integration 5 pass(実 compile を temp plugin host で compose→drop→再 compose の3回駆動) |
| AC-7b | 派生セル注入 → exit 1 / `sensors_applicable[0].category` 削除(#1758 同クラス)→ exit 1 | revert 後 exit 0、注入コミットはブランチに不在 |
| AC-7c | — | grep 射程は amadeus-graph.ts+CI workflow に限定(充足) |
| AC-8a | — | patch gate exit 0(added 1 / covered 1 / uncovered 0 / stale 0) |
| AC-8b | — | 新規テストなし(要件どおり) |

## 逸脱(plan 内自己是正、要件内)

当初 plan の stderr advisory を**全撤去**した。全スイート実行で `book-pack-verify` が赤になり追跡した結果、出荷 grid が `self-feature.formal-model-check` を持つため opt-in plugin 未 compose の全ワークスペース(既定インストール)が dangling セルを設計どおり保持する = 警告は恒久ノイズと判明。要件は「保存する」単独を許容しており逸脱ではない。「無音が正しい」ことを t397 に pin。消費者のない export を残さない方針でヘルパーも削除。

## 付随作業(自変更起因2件)

- `t-formal-verif-ci-workflow` の ci.yml baseline pin を運用どおり再ベースライン(3件目として理由追記、保護性維持)。
- 既知転位2件(#1622 射程)は意味的是正に踏み込まず、実測(真の型行 = 現 head 1705-1710、DA あり hits 0)を PR 本文へ記録。

## 検証(実測 exit code)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / compile --check 0 / **coverage:ci 全スイート 717 files: Failed 0 / RESULT: PASS**(project gate 89.26%、patch gate 0 uncovered)。

## 採番

t397 使用、返上なし。

## 同根

FR-7 の構造的限界1件を記録(composed 行のセル値は on-disk grid 自身が入力のため compile --check では検出不能 — 修正前から存在する盲点で本修正による新規発生ではない。PR 本文に記録)。
