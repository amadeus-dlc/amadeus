# Bolt Plan — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

unit-of-work.md の 8 Unit を配送階層 **1 Intent = 1..N Unit / 1 Unit = 1..N Bolt / 1 Bolt = 1 PR**(project.md cid:units-generation:c1、2026-07-31 改訂 — PR #1843 着地 `5b8287440`)で編成する。バッチは unit-of-work-dependency.md の edge block を compile した bolt_dag(実測 4 バッチ)に従う。

> **改訂の申告**: 本節と下表は当初「1 Unit = 1 Bolt = 1 PR」を前提に作成し delivery-planning ゲートで承認された。ノルム改訂(#1842 / PR #1843)の main 着地に伴い、既決ノルムの機械的適用として階層表現へ追従させた(執行クラス — Unit 分割自体は不変、Bolt 粒度の自由が加わった)。

## Bolt 列

| Bolt | Unit | バッチ | ゲート | PR |
|---|---|---|---|---|
| B1 | u1-runner-relocation | 1(単独先行) | **walking-skeleton ゲート**(常に人間承認) | 1 PR |
| B2 | u5-advisories-channel | 1(u1 と非交差だが skeleton 先行のため実質後続) | Construction Autonomy Mode に従う | 1 PR |
| B3 | u2-residue-deletion | 2 | 同上 | 1 PR |
| B4 | u3-boundary-guard | 2 | 同上 | 1 PR |
| B5 | u4-tools-distribution | 2 | 同上 | 1 PR |
| B6 | u6-impl-only-path | 2 | 同上 | 1 PR |
| B7 | u7-mirror-model | 3 | 同上 | 1 PR |
| B8 | u8-e2e-acceptance | 4 | 同上(intent 完了判定を兼ねる) | 1 PR |

**Bolt 粒度**: 上表は各 Unit を 1 Bolt として起点に置く。実装着手時に「各 Bolt が単独で CI green かつレビュー可能な増分」に割れると判断した Unit は複数 Bolt(= 複数 PR)へ分割してよい(cid:units-generation:c1 の Bolt 分割判定)。現時点の想定分割:

| Unit | 想定 Bolt | 分割根拠 |
|---|---|---|
| u1-runner-relocation | B1a: 24 ファイル移設+model-map 複製+import/CI パス付け替え+dist 再生成 / B1b: stage 本文の参照書き換え(`:12` `:41`)+dist 再生成 | 移設と CI 付け替えは不可分(旧パスのまま移設すると CI 赤)。stage 本文の書き換えは独立に CI green で、レビュー面が全く異なる(#1842 が実例として引用した Unit) |
| u4-tools-distribution | B5a: manifest `tools`+compose/drop 対称(digest 拡張含む) / B5b: 一括 compose verb+全ツリー compose 実施 | 配布機構と一括 verb は別モジュール・別テスト(t379)。ただし機構だけでは Unit として未完了 — Bolt 分割であり Unit 分割ではない |
| u7-mirror-model | B7a: model-map v2 スキーマ / B7b: MirrorLifecycle.tla+cfg+登録+TLC 完走+落ちる実証 / B7c: 工程文書 | スキーマ改訂・モデル・文書はレビュー観点が独立 |
| 他 5 Unit | 各 1 Bolt | 単一の凝集した変更で、割ると各 Bolt が意味を持たない |

分割の最終判定は各 Unit の実装着手時に行う(想定は起点であって確約ではない)。

## 実行規律

- **walking skeleton**: B1 は単独・ゲート付きで実行し、承認後にラダープロンプトで残 Bolt の自律度を決める(org.md Walking Skeleton。scope は self-feature = greenfield 扱いでスケルトン適用)。
- **並行度**: バッチ2は 4 Unit だが同時アクティブ builder は最大4(parallel-bolts)— 枠内。worktree 隔離必須(solo-bolt-worktree-required — ソロモードでも本線ツリーで実装しない)。
- **Bolt 内順序**: B1 は「移設 → CI パス付け替え → stage 参照書き換え → dist 再生成 → 検証」の順。移設後に CI を直さないと中間状態で CI 赤が残るため、同一 PR 内で連続させる。
- **PR 規律**: 各 Bolt 完了時に PR 発行 → j5ik2o-gh-pr-converge-loop で収束 → ユーザー承認後にマージ(no-AI-merge)。PR 発行報告は他 Bolt の完了待ちより優先して処理する(c4-pr-report-interrupt-priority)。
- **検証**: 各 PR で typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci。push 前にローカル lcov で patch 行の未カバー 0 を実測(local-lcov-pre-push)。

## Bolt 間の交差管理

- B3/B4/B5/B6 は同一バッチだが変更面が異なる: B3=scripts+tests+台帳、B4=tests のみ、B5=plugin compose 系、B6=model-completeness。**台帳2面(complexity-baseline / coverage-patch-allowlist)は B3 と他 Bolt で交差しうる** — 着手前に実 diff で再判定し、交差する場合は B3 を先行させる(c6)。
- 全 Bolt が dist 再生成を伴う可能性 — dist ツリー集合の変化は cross-merge-dist-tree-blindspot に留意し、base 前進時は再接地(base-advance-regrounding)。
