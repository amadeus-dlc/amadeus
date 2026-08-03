# Business Rules — u8-source-only-switch

上流入力(consumes 全数): requirements(FR-4.2/4.3/4.5・FR-5・NFR-2/3)、component-methods(C7 段階2 / C8)、components(C7/C8/C9)、unit-of-work(u8 統合根拠と前提 = u2〜u7 全完了)、unit-of-work-story-map(Slice 3)、services(negative 確認)。

## ルール一覧

- **BR-U8-1(原子性)**: 追跡除外・旧 check 撤去・第3ガード再定義・境界ガード有効化・C8 再責務化は**単一 PR** で行う。分割は検査空白または恒久赤を生む(ADR-A8 / reviewer 教訓)
- **BR-U8-2(前提ゲート)**: 着手前提 = Bolt 1〜6 全着地+クリーン環境検証(移行順序4)の完了。本 Bolt のゲート提示(delivery-planning Q1 裁定 = 人間ゲート)にその実測結果を添付
- **BR-U8-3(作業ツリー保全)**: 追跡除外は `git rm --cached`(index のみ)で行い、作業ツリーの生成物・per-user ランタイム・稼働中 worktree を削除しない(FR-3.4 と同系の不可侵)
- **BR-U8-4(境界ガードの期待集合)**: 生成対象パターンは u6 正本(allowlist)と u1 の同梱範囲申告(8ディレクトリ)から導出し、独立の第2定義を作らない
- **BR-U8-5(第3ガードの不変量)**: business-logic-model の (i)〜(v) を検査集合とし、コミット済み graph との比較を行わない。落ちる実証: 架空 sensor id を stage frontmatter へ注入して赤(vocabulary-collision 型の実証)
- **BR-U8-6(落ちる実証の1セット化)**: 境界ガードの赤実測は「注入 → 赤確認 → revert push」を不可分1セットで、切替 PR ブランチ上で実施(falling-proof-injection-one-set。マージ承認済み PR への注入残置禁止)
- **BR-U8-7(u5/u6/u7 の先行前提)**: promote-self.ts への変更は u5/u6 着地後の実 diff 再接地で行う(c6)。ci.yml は u7 着地形(段階1)からの撤去差分
- **BR-U8-9(歴史的例外の処理基準)**: `.codex/hooks.json` の `.gitattributes` 可視化例外(未追跡 — u6 申し送り)は**維持**する。根拠: 例外の維持は挙動を変えず(linguist 表示のみ)、撤去は独立の文書的変更として u9 の文書 PR へ回せるため、原子切替 PR のスコープを増やさない。u6 の gitattributesExpectation は例外を明示引数化済みで整合テストと矛盾しない
- **BR-U8-8(復旧方針)**: 切替後の欠陥は前進修正を既定とし、履歴 rewrite・force push をしない(deployment-pipeline:c3 整合。ADR-A8 Reversibility — 戻すには dist 再コミットの重い操作であることをゲートで開示)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U8-1/3 | FR-5.1(追跡除外)/ NFR-2(git status クリーン)/ 受け入れ「生成ファイルが追跡対象に残っていない」 |
| BR-U8-4/6 | FR-4.5(境界ガード+落ちる実証) |
| BR-U8-5 | FR-4.3(第3ガード再定義 — OQ-4 確定)/ 受け入れ「第3ガードが自己参照化していない」 |
| BR-U8-2 | Constraints(移行順序)+ bolt-plan(Bolt 7 ゲート) |
| BR-U8-8 | risk-and-sequencing のロールバック方針 |
| BR-U8-9 | u6 申し送りの処理基準(維持 — 原子切替のスコープ最小化) |
