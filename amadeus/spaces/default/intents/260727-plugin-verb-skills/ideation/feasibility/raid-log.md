# RAID Log — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md(スコープ #1597 フル+#1598 のリスク導出元)

## Risks

| # | リスク | 見立て | 緩和 |
|---|---|---|---|
| R1 | #1598 の方式選定(compose/recompile 時のホスト側 runner 生成 vs runner-gen 拡張)を誤ると、リポジトリ側 drift guard(t129)とホスト側生成物が衝突する | 中 | application-design で ADR 化(2案のトレードオフ必須)。t129 の検査対象範囲(stock runner のみか plugin 含むか)を設計時に実測確定 |
| R2 | `amadeus-utility.ts` は巨大ファイル(6000行超)で、case 追加が complexity baseline / coverage patch ゲートに接触しうる | 中 | handler 本体は `amadeus-plugin.ts` 側へ委譲して utility.ts 側は薄い dispatch に留める。判定ロジックは exported 純関数化して in-process seam でカバー |
| R3 | install verb のコピー操作が部分失敗(コピー成功・compose 失敗等)したとき中間状態が残る | 中 | 冪等な再試行(既存 mirror retries の冪等性ノルムと同型)と、失敗時の状態報告を requirements でテスト可能に固定。split-widens-state-space の教訓を適用 |
| R4 | スキル面(Claude 固有)と handler 面(全ハーネス)の対称性を docs が誤って全ハーネス共通と記述する | 低 | 19-plugins 更新時に面の区別を明記。amadeus-mirror の既存記述様式に倣う |

## Assumptions(実測で確定するまで仮説)

- A1: ホスト側 stage-graph.json は compose+2段 recompile 後に plugin stage を含む(#1592 修正の帰結)— #1598 実装前に E2E で再実測する
- A2: t129 drift guard は現状 stock stage のみを対象とし、plugin runner の追加はガードと非衝突 — 設計時に t129 の実文を読んで確定する

## Issues

- なし(現時点)

## Dependencies

- #1596(ホストルート統一・conformance E2E)— **着地済み**(2026-07-27、f1d561904)。本 intent の前提は解消済み
- `amadeus-mirror` スキル様式・`11-contributing.md` チェックリスト・`runner-gen` 雛形 — すべて main に実在(feasibility-assessment の実測参照)
