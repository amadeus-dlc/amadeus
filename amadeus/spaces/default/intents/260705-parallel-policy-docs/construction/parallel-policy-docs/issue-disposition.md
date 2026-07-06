# Issue disposition — #407 / #342

対象 Issue: [#407](https://github.com/amadeus-dlc/amadeus/issues/407)、[#342](https://github.com/amadeus-dlc/amadeus/issues/342)

判定は 3 値で記録する: `実装済み`（参照付き）/ `本 Intent で文書化`（節名付き）/ `未確定・運用実績待ち`。

## #407: Bolt worktree 実行契約と Intent 単位並行 policy のズレ

| # | #407 の判断項目 | 判定 | 根拠 |
|---|---|---|---|
| 1 | Intent ごとの target workspace と、Bolt ごとの worktree のどちらを実際の隔離単位として優先するか | 本 Intent で文書化 | `aidlc/spaces/default/memory/team.md`「worktree の階層と Bolt 実行契約」節の 1 段落目（優先ではなく階層関係として両方を使う） |
| 2 | Intent worktree の内側で Bolt worktree を作るのか、Intent worktree を Bolt 実行の基点にするのか | 本 Intent で文書化 | 同節 2 段落目（Intent worktree の内側に作られる） |
| 3 | 複数 Bolt を subagent で並行する場合、同一 worktree 内の直列化 policy とどう整合させるか | 本 Intent で文書化 | 同節 3 段落目（直列化規定の内数） |
| 4 | `WORKTREE_*` / `STATE_*` / `AUDIT_*` のイベント契約を、現行の PR gate 運用でどこまで要求するか | 本 Intent で文書化 | 同節 4 段落目（gate evidence は Bolt PR の merge と `BOLT_COMPLETED` のまま） |
| 5 | 本家 AI-DLC v2 の deterministic tool 差分を埋めるべきか、意図的差分として記録するべきか | 実装済み | `.agents/amadeus/tools/amadeus-worktree.ts`（`create` / `merge` / `discard` / `list` / `verify`）が本家 `aidlc-worktree.ts` 相当をすでに実装しており、`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（118〜124 行目）が実装ツールとして明記している。当初 Issue 本文の「deterministic tool 実装は Amadeus 側に見当たらない」という調査結果は、同じ Issue が引用する audit-format.md の当該表自体に反しており、調査時点で見落としがあったと判断する。項目 5 は「意図的差分として記録する」対象ではなく、実装済みの事実確認で閉じる。 |

**close 提案**: 5 項目すべてに team.md 側の記述または実装参照で回答済みのため、close を提案する。

## #342: walking skeleton・Bolt 切り直し・Delivery Planning 分業

| 弱点 | 判定 | 根拠 |
|---|---|---|
| 弱点 1: walking skeleton 相当の規定がない | 実装済み | `.agents/amadeus/amadeus-common/protocols/stage-protocol.md`「Construction Bolt gates (walking skeleton + ladder + halt-and-ask)」節（89 行目）と Ladder prompt 記述（97〜118 行目）、`.agents/amadeus/tools/amadeus-bolt.ts` の `set-autonomy` サブコマンド（774〜868 行目付近）。#342 が起票された時点では未実装だったが、その後のエンジン実装（v2 lifecycle 駆動化）で解消済み。 |
| 弱点 2: Bolt 切り直しの明示的な手順がない | 本 Intent で文書化 | `aidlc/spaces/default/memory/phases/construction.md`「Bolt 運用」節（Bolt 切り直し手順: halt-and-ask → backward jump または単発 re-run → 再開）。 |
| 弱点 3: Inception 内の分業の違い（Delivery Planning 相当の独立 stage 化の要否） | 未確定・運用実績待ち | requirements.md の「対象外」節のとおり、本 Intent の対象外とする。#342 自身の実施候補も「候補 1: 現状維持し、運用で観測する（推奨）」であり、Task Generation Gate の `blocked` から Bolt 切り直しに至る頻度の運用実績がまだない。 |

**close 提案**: 弱点 1・2 は閉じられるため close を提案する。ただし弱点 3 は未確定・運用実績待ちのまま残るため、close 後も観測を継続する（#342 自身の候補 1 が定める「頻発する証拠が出た時点で候補 2 以降を検討する」という条件を維持する）。close 操作そのものは Maintainer に委ねる。
