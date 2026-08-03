# Business Rules — u9-docs-norms

上流入力(consumes 全数): requirements(FR-3.5/FR-6)、component-methods(C9)、components(C9)、unit-of-work(u9)、unit-of-work-story-map(Slice 4)、services(installer 文書の新経路整合)。

## ルール一覧

- **BR-U9-1(対象面の導出)**: 文書更新の対象は正規文書リスト起点でなく「dist / drift / promote / codeload」語彙の repo 全域 grep(docs/ + 正本知識ファイル両域)から導出する(enumeration-completeness-review の docs 追補に従う)
- **BR-U9-2(日英同期)**: README と README.ja は同一変更で同期(docs-language-ownership)。日本語は正書法を保つ
- **BR-U9-3(ノルム PR の分離)**: ノルム改訂(project.md 4点)は文書 PR に混載せず norm-changes-via-pr(別 PR・レビュー・ユーザー承認マージ)。本 Unit の成果は**文案起草まで**(PR 作成は conductor の執行業務として Bolt 外 — BLM と統一)。衝突第5項(CLAUDE.md 等の記述)は FR-6.1 の文書更新で実施(4+1 分割の精密化申告は BLM 参照)
- **BR-U9-4(G3 受容論証の所在)**: dist 手編集検出消失の受容論証は ADR-A8 (4) を正本とし、ノルム PR 文案はそれを引用する(受け入れ条件「扱いが設計成果物で明示」の閉包)
- **BR-U9-5(実態先行)**: 全文書は u8 着地後の実態を記述する。未着地の状態を先取りした文書を書かない
- **BR-U9-6(残存ゼロの機械確認)**: 更新完了時、旧契約語彙(「generated, committed, and drift-guarded」等の断定文)の残存 0 を grep で確認する。ただし記録面(codekb・intent record・履歴文書)の散文引用は対象外にスコープする(c1-ac-grep-surface-scope — 全域 0 件 AC の恒久偽を避ける)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U9-1/2/6 | FR-6.1 / 受け入れ「文書と .gitattributes が新境界と一致」 |
| BR-U9-3/4 | FR-6.2 / 受け入れ「規範衝突5点のノルム PR がマージ済み」— 本 Unit の受け入れは**文案起草の完了**まで。PR 作成〜マージは conductor 執行+人間承認(intent 完了判定には含むが Unit 受け入れには含まない) |
| BR-U9-5 | Slice 4 の順序拘束 |
