# Stakeholder Map — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): Issue #1048、intent-statement.md。

## ステークホルダー

| ステークホルダー | 関心 | 関与 |
| --- | --- | --- |
| フレームワーク利用者(opencode / Cursor 利用開発者) | `install --harness <name>` の一貫した導線 — 手動配置回避 | 受益者(ユーザー可視契約の対象) |
| フレームワーク保守チーム(本チーム) | 閉じ列挙の全数性がテストで固定され、次のハーネス追加時に漏れが機械検出されること | 実装・レビュー |
| リリース運用(release.yml / npm publish) | packages/setup の公開物内容が実検証されること(c4 既決 — npm pack 実ツール) | 検証面の消費者 |
| 外部コントリビュータ(haginot さん等) | installer 挙動の変更が docs(codex-cli.md 等の兄弟ガイド)と整合すること | 間接(ドキュメント整合) |

## 対立・調整点

- 「installer 5 のみ更新」vs「runtime 2 + migrate 1 + self-install 1 も同時更新」— スコープ判断は requirements-analysis の付随判断(pre-declared 分岐)で確定する。前 intent RE の分類(installer 5 = 正しさ必須 / 他 = advisory・dogfood)が判断材料
