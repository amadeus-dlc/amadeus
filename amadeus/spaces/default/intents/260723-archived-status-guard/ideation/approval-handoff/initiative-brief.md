# Initiative Brief — 260723-archived-status-guard

上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register。

## イニシアチブ要約

「誤って再開してはいけない intent を機構が守る」— registry status の enum 化(in-flight/parked/complete/archived)+archived への誤再開ガード(cursor/next/unpark の loud 拒否)+archive/unarchive の human-presence 必須 verb 対+260713 の移行。Issue #1396(enhancement/P2、ユーザー着手承認 2026-07-23)。

## スコープと実現可能性(inception への引き継ぎ)

- In: S1〜S5(scope-document)。Out: registry への parked 書込・#1309 実装面・elections 統一
- 判定 GO(feasibility): 書込面1点 chokepoint(state.ts:1904)・ガード3経路 seam 実在・human-presence 既習様式・移行 provenance 実在をすべて実測
- proto-Unit 4件(U1 enum → U2 guard / U3 verbs 並行 → U4 migration+proof、概算規模付き — intent-backlog)

## SKIP ステージの扱い(N/A 根拠 — 捏造しない)

- market-research: N/A(内部ツーリングの欠陥修正系 enhancement — 市場面なし)。代替内部証拠 = Issue #1396 のクロスレビュー(e4/e6)+ユーザー着手承認
- team-formation: N/A(チームは稼働中の run 編成をそのまま使用 — staffing は Construction 期の delivery-planning で確定)
- rough-mockups: N/A(UI なし)。CLI 出力契約は cid:ui-less-mockups-as-output-contract に従い design 段で verdict 別出力文言+exit code のモックとして充足する(先取りしない)

## リソース確約(Ideation で確約する範囲のみ)

Inception の分析(RE 差分・requirements・design 系)と人間ゲートまで。Construction の staffing・スケジュールは delivery-planning で承認する(approval-handoff:c3)。
