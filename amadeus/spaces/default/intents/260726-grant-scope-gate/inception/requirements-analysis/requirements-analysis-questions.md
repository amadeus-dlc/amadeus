# Requirements Analysis — 明確化質問(260726-grant-scope-gate)

<!-- E-OC1 証跡: ソロモード。回答はユーザーへの AskUserQuestion 提示に対する実回答の転記のみ(選挙不要判定: ソロモードのため選挙機構は不適用、ユーザー直接裁定)。承認タイムスタンプは各回答の記入時に本ヘッダへ追記する。 -->
<!-- 裁定承認: ユーザー直接裁定(AskUserQuestion 実回答)受領・承認 2026-07-26T05:40:51Z -->

## 背景(実測確定済み・質問対象外)

RE(codekb/amadeus/、observed e12259ba7)で確定済みのため質問しない事実:

- 根本原因は単一: `standingGrantSatisfiesGate`(amadeus-lib.ts:3985-4017)が `stage.scopes`(stock 10 語彙のみ)を直読。composed スコープ(`amadeus-*`)は scope-grid.json にしか存在しない設計(amadeus-graph.ts:1350-1359)のため `inScope` が全 stage で false。
- 症状 A(#1497 報告): 全ゲートが phase boundary 扱い → 既定グラント(includes_phase_boundary=false)が全ゲートで無音 no-op。
- 症状 B(未報告、RE で発見): `firstConstruction` が undefined → walking-skeleton 除外が無音不発。`amadeus-feature` + stance=on + opt-in グラントで first construction gate が認可される実測 — project.md Forbidden 直撃。
- 検出漏れの機序: grant 系テスト fixture が `scopes: ["amadeus-feature"]` を捏造(t-solo-standing-grant-domain.test.ts integration :47-59 / unit :33-44、t-solo-gate-transaction-seam.test.ts :305-315)。

## 質問

### Q1. 症状 B(walking-skeleton 除外の無音不発)を本 intent のスコープに含めますか?

同一根本原因の別症状であり、片方だけの修正では他方が残ります。B は project.md Forbidden「walking-skeleton stance 有効時に standing grant へ walking-skeleton gate を認可させない」への現在進行の違反です。

- A. 含める — 両症状を同一修正・同一 PR で閉じ、両方の regression テストを置く(推奨)
- B. 含めない — B は別 Issue として起票し、本 intent は #1497 の症状 A のみ修正
- X. Other (please specify)

[Answer]: A — 両症状を同一修正・同一 PR で閉じる(ユーザー裁定 2026-07-26T05:40:51Z)

### Q2. スコープ解決の修正方式の契約をどう固定しますか?

- A. エンジン正規経路と同一の解決へ一致させる — grant 述語のスコープ内判定を scope-grid 由来(loadScopeMapping / subgraphForScope 相当)へ差し替え、stock スコープの現行挙動は parity として固定(推奨)
- B. compose 承認時に stage.scopes へ composed スコープ語彙を追記する方式(graph 側を変える)
- C. 方式選択は design/implementation 段へ委ね、requirements は「composed スコープでも stock と同型の gate 分類になる」観測可能な契約のみ固定
- X. Other (please specify)

[Answer]: A — エンジン正規経路(scope-grid 由来)と同一の解決へ差し替え、stock parity 固定(ユーザー裁定 2026-07-26T05:40:51Z)

### Q3. `isPerUnitStage: false` ハードコード(amadeus-lib.ts:4012-4013)は本 intent で扱いますか?

per-unit ステージの中間ゲートを grant が覆いうる別軸の懸念(RE Open question)。#1497 の根本原因とは独立です。

- A. スコープ外 — 別 Issue として起票のみ行う(推奨)
- B. 本 intent で挙動を実測確認し、欠陥なら同一 PR で修正
- X. Other (please specify)

[Answer]: B — 本 intent で実測確認し、欠陥なら同一 PR で修正(ユーザー裁定 2026-07-26T05:40:51Z。推奨 A からの明示逸脱 = ユーザー選択)

### Q4. 捏造 fixture(scopes: ["amadeus-feature"])の是正をスコープに含めますか?

- A. 含める — 欠陥再現テストは実 stage-graph + 実 scope-grid を読む形で書き、既存の捏造 fixture も実構造準拠へ是正(推奨)
- B. 新規 RED テストのみ実構造準拠とし、既存 fixture はそのまま(最小変更)
- X. Other (please specify)

[Answer]: A — 新規 RED は実 stage-graph + 実 scope-grid 準拠、既存捏造 fixture も是正(ユーザー裁定 2026-07-26T05:40:51Z)

## 裁定の記録

ソロモード・ユーザー直接裁定(選挙不適用)。AskUserQuestion 提示 → 実回答受領・承認 2026-07-26T05:40:51Z。
- Q1 = A(症状 B をスコープに含める)
- Q2 = A(エンジン正規経路と同一の scope-grid 由来解決へ一致、stock parity 固定)
- Q3 = B(per-unit ハードコード軸を本 intent で実測確認、欠陥なら同一 PR 修正)— 起草者推奨 A を覆すユーザー選択
- Q4 = A(捏造 fixture 是正を含める)
