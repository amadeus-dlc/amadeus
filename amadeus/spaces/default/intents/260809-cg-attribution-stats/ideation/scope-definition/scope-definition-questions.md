# Scope Definition Questions — CG 観測可能区間と帰属不能残余

- **Intent**: `260809-cg-attribution-stats`
- **Source**: [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695)、[intent-statement.md](../intent-capture/intent-statement.md)
- **Mode**: Guide me（Intent autonomy `semi` による自動裁定）
- **Question budget**: Standard、最大8問／使用4問（モード1問 + 運用3問）

## Settled Boundary

Issue #2695 の `In`、分節・会計規則、出力、完了条件 1〜10 はすべて SETTLED である。ユーザーの「issue記載からスコープ縮小は許されません。このIntentでカバーしてください。」という裁定に従い、minimum viable scope や must-have／nice-to-have を再質問しない。

確定済み能力は次の10群である。

1. `stage-stats` への attribution 集計追加
2. candidate inventory と event-set 展開
3. event eligibility・lifecycle identity・fail-closed 診断
4. measured／attribution population と曖昧 window identity の分離
5. clip・idle subtraction・category union・全 category union・会計恒等式
6. `--stage`・`--outliers`・空母集団・usage error 契約
7. 共通 semantic model と Markdown／CSV／JSON parity
8. category・coverage・overlap・outlier・missing instrumentation・methodology 出力
9. 合成／実 corpus 相当テストと既存契約の後方互換性
10. 出力追加後の3形式に対する 65,536 bytes 超 consumer 完走・digest parity

## Q1. 能力群の依存関係をどう整理するか？

A. 母集団・identity・区間会計と共通 semantic model を先に固定し、event adapter、CLI・3形式 renderer、回帰検証を依存順に積む（境界を維持）
B. 出力形式を先に作り、後から semantic model と会計規則を接続する（境界を維持）
C. 会計、event adapter、renderer、検証を独立並行で進め、最後に統合する（境界を維持）
D. 能力群の依存関係を設けず任意順で実装する（境界を維持）
X. Other (please specify)

[Answer]: A — 母集団・identity・区間会計と共通 semantic model を先に固定し、event adapter、CLI・3形式 renderer、回帰検証を依存順に積む。**Mode:** Guide me / `semi` auto-decision。**Evidence:** E-SD-2695-DEPENDENCIES-1、`auto-decision-794daa5a1148485766ac0c6c284dede3`、独立投票 2 対 0。

## Q2. 依存制約の中でどの sequencing preference を採るか？

A. Risk-first — FIFO 衝突、event eligibility、interval union、会計恒等式を先に赤いテストで固定する（境界を維持）
B. Dependency-first — 依存DAGだけを基準に最短のトポロジカル順で進める（境界を維持）
C. Value-first — 可視レポートを最初に作り、内部の厳密化を後続へ回す（境界を維持）
D. Deadline-first — 期限達成を優先し、検証面を後続へ送る（完了条件の延期となるため境界を狭める）
X. Other (please specify)

[Answer]: A — Risk-first。FIFO 衝突、event eligibility、interval union、会計恒等式を先に赤いテストで固定し、その後に出力と実サイズ検証を積む。**Mode:** Guide me / `semi` auto-decision。**Evidence:** E-SD-2695-SEQUENCING-1、`auto-decision-994437a1ae2a323a174e3e3dc7927617`、独立投票 2 対 0。

## Q3. 能力固有の hard deadline はあるか？

A. P2 として暦日締切は置かず、Issue #2695 の完了条件 1〜10 を満たす品質ゲートを優先する（境界を維持）
B. 最短日程を優先して即時完了を求める（境界を維持）
C. 特定の暦日を締切として設定する（境界を維持）
D. 別 Issue やリリース日を締切として同期する（境界を維持）
X. Other (please specify)

[Answer]: A — P2 として暦日締切は置かず、Issue #2695 の完了条件 1〜10 を満たす品質ゲートを優先する。**Mode:** Guide me / `semi` auto-decision。**Evidence:** E-SD-2695-DEADLINE-1、`auto-decision-48260a90d9f9db31bd11a1062407730d`、独立投票 2 対 0。

## Answer Analysis

- 未回答の `[Answer]:` は 0 件。
- 依存関係と sequencing は整合する。semantic model を基盤にしつつ、その内部では高リスクな identity・eligibility・union・恒等式から固定する。
- 暦日締切を置かないため、timeline を理由に完了条件を延期する矛盾はない。
- すべての回答は Issue #2695 の SETTLED boundary を維持し、能力・完了条件を削除しない。
