# Requirements Analysis — 明確化質問(260730-open-bug-batch-2)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 質問の前提機構(#1750 の boundary 4種と発行元の構造、receipt スキーマ、provenance.createIdentity)は architecture.md 現在節の機構実測から導出した。

真に未決の設計判断のみを問う。既決事項は問わない: #1742 = 既存 PR #1758 の収束へ編成(ユーザー提供情報+RE 裁定)、#1749 = 正準名 `phase-check-<phase>.md` はエンジン契約で確定、#1735 = 修正所在は stage-protocol §13 への焼き込み(ハーネス中立面、既決ノルム learnings-election/auto-solo の機械化 — config 未設定環境では従来どおり不発動なので stock 利用者への挙動変更なし)、#1734 = Issue が求める (a) 書込正準化+(b) check 対称化の両側実装。

## Q1. #1750 の実装方式 — 初回 mirror create の発火をどの機構で表現するか

背景(実測): mirror boundary 種別は4種(intent-capture-approved / phase-verified / parked / workflow-completed、amadeus-mirror-lifecycle.ts:646-658)で、intent 誕生に対応する種別が無い。intent-capture boundary の発行元は orchestrate:4492-4505 の1箇所のみで、SKIP スコープでは構造的に発火機会が消える。受け皿の receipt は phase 3値の列挙(amadeus-state.ts:221-229)。

A. **新 boundary 種別 `intent-initialized` を追加(Issue 推奨案)** — parseBoundaryArgs へ第5種別を追加し、intent birth 直後の `next` で評価・発火。receipt は phase 集合と別軸の新フィールドで永続化。boundary 語彙が意味論どおり増え、可観測性(いつ create されるべきか)が契約として明示される。受け皿スキーマの変更を伴う(state/lifecycle/テスト t265 系の契約改訂)。
B. **既存 `intent-capture` boundary の発行条件を拡張** — boundary 種別・receipt スキーマは不変のまま、発行元を「intent-capture approve 時」に加えて「birth 後最初の `next` で、mirror が未 create(provenance.createIdentity 不在)かつ auto-mirror auto のとき」へ広げる。create の冪等性は既存 createIdentity で担保。変更面が小さい(orchestrate の emit 条件+lifecycle 受理は既存 verb)が、「intent-capture」という名前と実発火点が乖離する(名前の意味論負債)。
X. Other(具体案を記載)

[Answer]: A — 新 boundary 種別 `intent-initialized` を追加する。intent birth 直後の `next` で評価・発火し、receipt は phase 集合と別軸で永続化。t265 系テスト契約の改訂を要件に含める(仕様裁定に基づく契約変更として申告)。

## 裁定の記録

- Q1 はユーザーへの AskUserQuestion で裁定。回答は「A: 新 boundary 種別 (Recommended)」。
- ユーザー承認: 2026-07-30T15:49:17Z(AskUserQuestion 回答受領直後の `date -u` 実測)
