# Bolt Plan — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

unit-of-work.md の 8 Unit を 1 Unit = 1 Bolt = 1 PR で編成する。バッチは unit-of-work-dependency.md の edge block を compile した bolt_dag(実測 4 バッチ)に従う。

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

## 実行規律

- **walking skeleton**: B1 は単独・ゲート付きで実行し、承認後にラダープロンプトで残 Bolt の自律度を決める(org.md Walking Skeleton。scope は self-feature = greenfield 扱いでスケルトン適用)。
- **並行度**: バッチ2は 4 Unit だが同時アクティブ builder は最大4(parallel-bolts)— 枠内。worktree 隔離必須(solo-bolt-worktree-required — ソロモードでも本線ツリーで実装しない)。
- **Bolt 内順序**: B1 は「移設 → CI パス付け替え → stage 参照書き換え → dist 再生成 → 検証」の順。移設後に CI を直さないと中間状態で CI 赤が残るため、同一 PR 内で連続させる。
- **PR 規律**: 各 Bolt 完了時に PR 発行 → j5ik2o-gh-pr-converge-loop で収束 → ユーザー承認後にマージ(no-AI-merge)。PR 発行報告は他 Bolt の完了待ちより優先して処理する(c4-pr-report-interrupt-priority)。
- **検証**: 各 PR で typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci。push 前にローカル lcov で patch 行の未カバー 0 を実測(local-lcov-pre-push)。

## Bolt 間の交差管理

- B3/B4/B5/B6 は同一バッチだが変更面が異なる: B3=scripts+tests+台帳、B4=tests のみ、B5=plugin compose 系、B6=model-completeness。**台帳2面(complexity-baseline / coverage-patch-allowlist)は B3 と他 Bolt で交差しうる** — 着手前に実 diff で再判定し、交差する場合は B3 を先行させる(c6)。
- 全 Bolt が dist 再生成を伴う可能性 — dist ツリー集合の変化は cross-merge-dist-tree-blindspot に留意し、base 前進時は再接地(base-advance-regrounding)。
