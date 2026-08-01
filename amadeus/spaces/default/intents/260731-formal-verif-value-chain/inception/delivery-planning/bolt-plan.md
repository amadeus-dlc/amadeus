# Bolt Plan — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

unit-of-work.md の 8 Unit を Bolt へ編成する。Unit・Bolt の定義と Bolt 粒度は正準(stage-protocol.md Glossary / delivery-planning.md Strategic questions)に従い、**本 intent の Bolt 粒度は「one Unit per Bolt」を選択**する(2.8 の設問への回答 — 8 Unit は依存 DAG 上で凝集しており束ねる利得がないため)。バッチは unit-of-work-dependency.md の edge block を compile した bolt_dag(実測 4 バッチ)に従う。

> **改訂の申告**: 本成果物は当初「1 Unit = 1 Bolt = 1 PR」固定(旧ノルム)を前提にゲート承認され、その後 #1842 の2段のノルム改訂(#1843 → #1847 `c358acf10`)を経て現行文面へ追従した。Unit 分割・依存・バッチは全経緯を通じて不変。変わったのは (i) Bolt 粒度が固定でなく 2.8 の選択になった(本 intent は one Unit per Bolt を選択)(ii) PR 粒度が固定でなくなった(下記)。
>
> **改訂の申告 2(2026-07-31 ユーザー裁定)**: u1 実装時の実測で BR-U1-5 の前提「分類 D は自己完結」が反証された(分類 D 30 ファイル中 26 が移設対象 7 モジュールを import — 入方向閉包の未計測)。u1 単独では typecheck green 不能のため、正準定義「A Bolt wraps one or more Units」を適用し **B1 = {u1-runner-relocation + u2-residue-deletion} の統合 Bolt(1 PR)へ改訂**(AskUserQuestion 裁定「B1={u1+u2} に統合」)。旧 B3 行は B1 へ吸収。Unit 境界(u1/u2 の FD)は不変 — 変わったのは配送編成のみ。

## Bolt 列

| Bolt | Unit | バッチ | ゲート | PR |
|---|---|---|---|---|
| B1 | u1-runner-relocation + u2-residue-deletion(改訂2 — 統合) | 1(単独先行) | **walking-skeleton ゲート**(常に人間承認) | 1 PR |
| B2 | u5-advisories-channel | 1(u1 と非交差だが skeleton 先行のため実質後続) | Construction Autonomy Mode に従う | 1 PR |
| ~~B3~~ | ~~u2-residue-deletion~~ → B1 へ統合(改訂2) | — | — | — |
| B4 | u3-boundary-guard | 2 | 同上 | 1 PR |
| B5 | u4-tools-distribution | 2 | 同上 | 1 PR |
| B6 | u6-impl-only-path | 2 | 同上 | 1 PR |
| B7 | u7-mirror-model | 3 | 同上 | 1 PR |
| B8 | u8-e2e-acceptance | 4 | 同上(intent 完了判定を兼ねる) | 1 PR |

**PR 粒度**(cid:units-generation:c1 (b)): 既定は Bolt ごとに 1 PR(team.md § Way of Working)。焦点が絞れる範囲で1 Bolt を複数 PR へ分割してよい(束ねる方向は禁止)。現時点の想定:

| Bolt | 想定 PR | 分割根拠 |
|---|---|---|
| B1(u1) | PR-1: 24 ファイル移設+model-map 複製+import/CI パス付け替え+dist 再生成 / PR-2: stage 本文の参照書き換え(`:12` `:41`)+dist 再生成 | 移設と CI 付け替えは不可分(旧パスのまま移設すると CI 赤)。stage 本文の書き換えは独立に CI green で、レビュー面が全く異なる(#1842 が実例として引用した Bolt) |
| B5(u4) | PR-1: manifest `tools`+compose/drop 対称(digest 拡張含む) / PR-2: 一括 compose verb+全ツリー compose 実施 | 配布機構と一括 verb は別モジュール・別テスト(t379) |
| B7(u7) | PR-1: model-map v2 スキーマ / PR-2: MirrorLifecycle.tla+cfg+登録+TLC 完走+落ちる実証 / PR-3: 工程文書 | スキーマ改訂・モデル・文書はレビュー観点が独立 |
| 他 5 Bolt | 各 1 PR | 単一の凝集した変更で、割ると各 PR の焦点が失われる |

分割の最終判定は各 Bolt の実装着手時に行う(想定は起点であって確約ではない)。Bolt の完了・ゲート・ワークフロー上の扱いは PR 分割に影響されない(PR は配送の刻みであって Bolt 境界ではない)。

## 実行規律

- **walking skeleton**: B1 は単独・ゲート付きで実行し、承認後にラダープロンプトで残 Bolt の自律度を決める(org.md Walking Skeleton。scope は self-feature = greenfield 扱いでスケルトン適用)。
- **並行度**: バッチ2は 4 Unit だが同時アクティブ builder は最大4(parallel-bolts)— 枠内。worktree 隔離必須(solo-bolt-worktree-required — ソロモードでも本線ツリーで実装しない)。
- **Bolt 内順序**: B1 は「移設 → CI パス付け替え → stage 参照書き換え → dist 再生成 → 検証」の順。移設後に CI を直さないと中間状態で CI 赤が残るため、同一 PR 内で連続させる。
- **PR 規律**: 各 Bolt 完了時に PR 発行 → j5ik2o-gh-pr-converge-loop で収束 → ユーザー承認後にマージ(no-AI-merge)。PR 発行報告は他 Bolt の完了待ちより優先して処理する(c4-pr-report-interrupt-priority)。
- **検証**: 各 PR で typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci。push 前にローカル lcov で patch 行の未カバー 0 を実測(local-lcov-pre-push)。

## Bolt 間の交差管理

- B3/B4/B5/B6 は同一バッチだが変更面が異なる: B3=scripts+tests+台帳、B4=tests のみ、B5=plugin compose 系、B6=model-completeness。**台帳2面(complexity-baseline / coverage-patch-allowlist)は B3 と他 Bolt で交差しうる** — 着手前に実 diff で再判定し、交差する場合は B3 を先行させる(c6)。
- 全 Bolt が dist 再生成を伴う可能性 — dist ツリー集合の変化は cross-merge-dist-tree-blindspot に留意し、base 前進時は再接地(base-advance-regrounding)。
