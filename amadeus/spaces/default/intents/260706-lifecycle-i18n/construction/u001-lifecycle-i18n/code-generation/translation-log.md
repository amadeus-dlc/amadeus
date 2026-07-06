# 対訳記録 — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [domain-entities.md](../functional-design/domain-entities.md)（訳語対応表 = 正）、[business-logic-model.md](../functional-design/business-logic-model.md)（執筆手順）

## B001-core-docs（overview / scopes / state）

### 実行記録

- 翻訳一次執筆は文書単位の subagent 3 体へ並行委譲した（訳語対応表・BR・policy・前例様式を prompt で固定）。
- #541 純正性検証（conductor による fresh 実測）を 3 文書すべてで実施し pass:
  - 決定論検査: 見出し数 / コードフェンス数 / 表行数 / 行数が英日で一致（overview 20/2/39/293、scopes 10/0/52/131、state 11/2/30/162）。
  - ja.md 無改変検証: git HEAD の日本語原文との diff が「H1 対訳併記 + リンク再指向（lifecycle 相互 = ja→ja、直下対訳あり = ja→ja）」だけであることを 3 文書とも機械照合。
  - glossary 適合: retired (GD009) / canonical ledger / single entry point / human gate / human merge / working conventions / reduction / Input substitution on reduction を英語版で確認。
  - 意味論スポット確認: overview の Intake / Initialization / phase gate / v2 差分表、state の 台帳と PR 断面 / 索引、scopes の Inputs / Scope adaptation を節単位で読み比べ、乖離なし。

### 新規に確立した訳（表にない語の追記。BR-2）

- 本節は B001 時点で追加なし（subagent の報告と conductor 検証で、対応表と機械可読ラベルの範囲で訳出できた）。

### 既知の一時状態

- overview.ja.md は ideation.ja.md / inception.ja.md / construction.ja.md へリンクするが、これらは B002 で作成する（Bolt 直列の設計どおり。PR は B001 + B002 を同梱するため出荷時点では解決する）。

### 陳腐化の報告（subagent からの報告、conductor 判断）

- なし（3 体とも報告なし）。

## B002-phase-docs（ideation / inception / construction）

### 実行記録

- 翻訳一次執筆は subagent 3 体へ並行委譲（B001 と同体制。B001 完成後の overview.md 英語記法節を語彙の正として prompt に固定）。
- #541 純正性検証を 3 文書すべてで実施し pass:
  - 決定論検査: ideation 45/0/148/329、inception 52/0/186/398、construction 46/0/165/360（見出し/フェンス/表行/行数が英日一致）。
  - 日本語残存: 3 文書とも 0（機械検査）。
  - ja.md 無改変検証: git HEAD 原文との diff が H1 対訳併記 + リンク再指向だけであることを 3 文書とも機械照合。
  - glossary 適合: Conditional (brownfield)、Required (when <stage> runs)、user project description in the record's audit shard、Input substitution on reduction を確認。

### conductor 統一パス（文書間ゆれの正規化）

subagent 間で生じた表記ゆれ 3 種を正規化した。

| ゆれ | 統一形 | 補正 |
|---|---|---|
| `v2 counterpart` / `v2 Counterpart`（Outputs 表ヘッダ） | `v2 Counterpart`（Metadata の `v2 Source` と対） | ideation ×7、construction ×7 を置換（計 22 で uniform） |
| `Learning record of the stage's execution` / `Learning record of stage execution`（memory 行） | `Learning record of stage execution` | ideation ×7、construction ×7 を置換 |
| Mode 欄 `internal (may delegate to a subagent)` / `internal (delegable to a subagent)` | `internal (delegable to a subagent)` | construction ×1 を置換 |

### 新規に確立した訳（BR-2 の追記）

| 日本語 | 英語 | 初出 |
|---|---|---|
| v2 対応（Outputs 表ヘッダ） | v2 Counterpart | B002（3 文書共通） |
| stage 実行の学習記録（…） | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | B002 |
| 確認した質問と回答 | Confirmed questions and answers | B002（3 文書共通） |
| Execution 判定基準（見出し） | Execution criteria | B002（3 文書共通） |
| internal（subagent 委譲可） | internal (delegable to a subagent) | B002 |
| 実行単位 | Execution unit | B002（construction） |

### 逆方向リンクの整合（B002 最終手順、FR-2.4 / BR-10 の最小追加）

直下 4 ファイル・5 箇所（steering.ja.md ×2、aidlc-v2-operation-phase-boundary.ja.md / aidlc-v2-build-and-test-failure-handling.ja.md / aidlc-v2-sensor-learn-mapping.ja.md 各 1）の lifecycle/<name>.md 参照を <name>.ja.md へ更新した。

### FR-4.3 の機械照合（fresh）

- 12 lifecycle ファイル + 逆方向 4 ファイルの全ローカルリンクの実在照合 = 破損 0。
- 正準 6 ファイル（<name>.md）の実在 = 流入参照 16 ファイル・30 箇所は無破壊。

### 実行上の学び（記録）

- inception の検査を subagent の書き込み進行中に行い「未翻訳 156 行」と誤検出した。検査は subagent の完了通知（または書き込み静止の確認）後に行う。
- 陳腐化の報告: 3 体とも「なし」（tr-state のみ、state.md 119 行付近の #464 後続作業への言及を報告 → 忠実対訳のまま温存。実在する未完了作業への言及であり陳腐化ではないと conductor 判断）。

### §12a code-generation 反復 1 の指摘と修正

- [MEDIUM] inception.ja.md の 4 箇所だけがリンクの表示テキストまで .ja.md へ書き換えており、他 5 文書の規約（表示テキストは <name>.md のまま、href だけ .ja.md）と不一致だった。conductor 統一パスがリンク表示テキストの規約を検査対象にしていなかったことが捕捉漏れの原因。4 箇所を href のみ変更へ修正し、規約「ja 版のリンクは表示テキストを <name>.md のまま保ち、href だけを .ja.md にする」を対訳記録の正式規約として明文化した。
