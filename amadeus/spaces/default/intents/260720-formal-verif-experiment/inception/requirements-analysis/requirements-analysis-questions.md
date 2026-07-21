# Requirements Analysis — 明確化質問(260720-formal-verif-experiment)

> **対話モード**: Guide me。ユーザーの継続命令に従い、真に未決の判断は team election へ付議する。
> **E-OC1 判定**: Q1〜Q3 は実験分母・勝者決定・walking-skeleton の公平性を変える未決判断であり、選挙必須。裁定前は `[Answer]:` を空欄で保持する。
> **裁定受領**: fresh再選挙 E-FVERA1R〜3R は verify成功・recorded。旧 E-FVERA1〜3 は timeline-order 失敗のため未成立のまま参照しない。裁定通知 2026-07-20T07:48:13Z。
> **§13裁定**: E-FVERAS13 は候補採用0件で可(3-0、GoA favor3、留保0、verify成功・recorded)。裁定通知 2026-07-20T08:00:36Z。

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`。

## Q1: 欠陥台帳の分母とクラスタ境界

実測コンテキスト: Issue単位では #1261、#1262、#1252、#1253 と per-voter resolution の5クラスタ。一方、修正PR #1268/#1277/#1273 の挙動差分には choice winner、unknown-choice 拒否、receivedAt 軸、invalid-timestamp 拒否、amend submission、unknown-ref 拒否、per-voter resolution の7原子的predicateがある。ユーザー承認済み成功指標は6件であり、分母を推測で固定できない。

- A. 6挙動クラスタ: choice winner / unknown-choice / receivedAt / invalid-timestamp / amend acceptance(submission+unknown-ref) / per-voter resolution
- B. 5実事故クラスタ: #1261 / #1262 / #1252 / #1253 / per-voter resolution。成功指標を5件へ訂正する
- C. 7原子的predicate: amend submission と unknown-ref を分離し、成功指標を7件へ訂正する
- D. 分母をApplication Designまで未確定のまま送り、設計時に決める
- E. 6件目の独立した実事故が特定できるまで実験を停止する
- X. Other (please specify)

[Answer]: C(E-FVERA1R裁定。choice C=2票 / A=1票、GoA 1x1 2x2)

- 留保(e3、GoA2、原文): 「7 predicateを採るのは、各行が単独の再注入で赤化し、健全baselineで緑化する falling proof を持つ場合に限る。独立実証できない組は二重計上せず再クラスタ化すること。」
- 留保(e1、GoA2、原文): “7 predicates are admissible only if every row has an independently reproducible red/green injection proof. If any predicate cannot be isolated, collapse to the evidence-grounded five incident/root clusters and correct the success metric; do not manufacture six through asymmetric clustering.”
- 票: e2 07:44:55Z(受理07:45:17Z) → e3 07:45:04Z(受理07:45:37Z) → e1 07:45:33Z(受理07:46:38Z) → 開票07:47:14Z

## Q2: 両アーム適格時のコスト最小判定

実測コンテキスト: 全欠陥検出はhard条件。偽陽性、authoring差分行数、実装経過時間、CI実行秒数は単位が異なるため、単なる「コスト最小」では同点・trade-off時の停止条件が閉じない。

- A. 辞書式: 全件検出 → 健全baseline偽陽性0 → authored LOC最小 → 実装経過時間最小 → CI実行時間中央値最小
- B. Pareto: 全件検出かつ偽陽性0を満たした後、全コストで非劣位なら勝者。相互trade-offなら「両方適格・勝者なし」と確定する
- C. 等重みrank: LOC・実装時間・CI時間の順位点を等重み合算し、最小点を勝者とする
- D. CI優先: 全件検出・偽陽性0の後、CI時間 → LOC → 実装時間の辞書式で決める
- E. 測定値だけを確定し、trade-offが残る場合はユーザーが最終選択する
- X. Other (please specify)

[Answer]: B(E-FVERA2R裁定。Pareto比較で、全件検出後も異単位costのtrade-offが残る場合は「両方適格・勝者なし」と確定。choice B=2票 / A=1票、GoA 1x3。票: e2 07:44:55Z(受理07:45:23Z) → e3 07:45:05Z(受理07:45:37Z) → e1 07:45:33Z(受理07:46:38Z) → 開票07:47:15Z)

## Q3: walking-skeleton の最初の欠陥×アーム

実測コンテキスト: Practices Discoveryで「1欠陥再注入 → 1 arm → 決定論的verdict → CI証跡」を最初のConstruction Boltとすることは既決。blind性を守るため、どの案でもarmの仕様をfreezeしてcommitした後に注入branchの正体を開示する。

- A. TLA+/TLC × invalid-timestamp(#1252): 最大の導入リスク(JVM/TLC)を先に潰す
- B. TS判定器 × invalid-timestamp(#1252): 既存fast-checkで最短のend-to-end配線を先に証明する
- C. deterministic hashで6欠陥×2アームから1組を選ぶ: 人為的な有利不利を避ける
- D. 既知台帳外のsynthetic defectを使う: 比較対象6件への学習汚染を避ける
- E. Delivery Planningまで組を未確定にし、依存DAG確定後に選ぶ
- X. Other (please specify)

[Answer]: A(E-FVERA3R裁定。TLA+/TLC armを先行し、#1252 invalid-timestampをrisk-firstで注入する。arm仕様freeze commit後に注入branchの正体を開示する。choice A=2票 / B=1票、GoA 1x3。票: e2 07:44:55Z(受理07:45:32Z) → e3 07:45:06Z(受理07:45:37Z) → e1 07:45:33Z(受理07:46:38Z) → 開票07:47:15Z)
