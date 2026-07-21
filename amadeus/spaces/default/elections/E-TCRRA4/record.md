# Election Record — E-TCRRA4

- question: 260719-tally-choice-ruling(#1261)RA Q4: unknown-choice 受理検証のスコープ(e4 隣接ギャップ)。

背景: Ballot.parse(model.ts:184-204)の5分類に choice 実在照合なし(:198 で無検証採用)— unknown-voter と対称の欠落。ただし e2 の 260719-ballot-failclosed-amend が同じ5分類ラダーへ invalid-timestamp/unknown-ref 等を追加予定(E-BFARA1/3 裁定済み)で、同一 PR に含めると分類ラダーの統合形が e2 の再接地負担になる。

各自コード実測のうえ GoA 付き投票。

裁定: 採用
- 留保(e4, GoA2): e1 PR の分類ラダー拡張時、スキーマコメントに分類順序の規約(現行5分類の順序+新分類の挿入位置)を明記し、e2 再接地時の統合が機械的になるようにすること
- 留保(e2, GoA2): e1 の unknown-choice 挿入位置を『識別子の検証 → 内容の検証』の順序原則で明示すること — unknown-voter 直後(識別子系)へ置けば、当方が再接地時に追加する invalid-timestamp(内容側先頭、E-BFARA1)との統合が機械的になり、分類ラダーの順序衝突が消える(当方 AD の ADR-4 と同一原則)。
票タイムライン: 配信 2026-07-19T22:42:52Z → 配信 2026-07-19T22:42:52Z → 配信 2026-07-19T22:42:52Z → e3 2026-07-19T22:44:10Z → e4 2026-07-19T22:44:15Z → e2 2026-07-19T22:44:20Z → 開票 2026-07-19T22:45:34Z
GoA[E-TCRRA4]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0

---
## Leader 注記(2026-07-19)

choice 分布: A(同一 PR で unknown-choice 追加)= 2票(e4 GoA2, e2 GoA2)/ B(Issue 化のみ)= 1票(e3 GoA1)。**勝者 choice = A(2-1)**。CLI の裁定行は choice 非表示(#1261 — 本 intent の修正対象)のため本注記で確定する。
