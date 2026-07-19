# Stakeholder Map — mirror-productization

> 上流入力(consumes 全数): なし(intent 起点 — intent-statement.md と同一の grilling 前提知識 G-1〜G-7)

## ステークホルダー

| 誰 | 関心 | 本 intent での接点 |
|---|---|---|
| フレームワーク利用チームの leader | intent の共有面(ミラー Issue)の鮮度維持を手作業なしで | phase 境界 ask / auto-mirror(sync のみ)の一次受益者 |
| conductor(メンバー/ソロ) | workflow の節目でミラー同期が指令として届くこと | engine の ask/print 指令の実行者 |
| リカバリー実施者 | 乖離時に「診断→修復」へ最短で入れる単独入口 | `/amadeus-mirror status` の利用者 |
| GitHub 上の閲覧者(チーム外含む) | ミラー Issue が record の現在地を正しく指すこと | sync 品質の間接受益者(直接操作なし) |
| フレームワーク保守者(このリポジトリ) | 配布3面の drift guard 整合・Bun-only 原則の一貫性 | G-1 ノルム改定(gh optional)と drift guard 配線の当事者 |
| gh 未導入の配布先ユーザー | ミラー機能不在でも workflow が止まらないこと | loud エラー(exit 1)+機能スキップの設計対象(G-1) |

## 非ステークホルダー(明示)

- GitHub 以外のトラッカー(GitLab 等)の利用者 — 本 intent は gh/GitHub 前提。transport 抽象化は将来判断
- 既存設定(Construction Autonomy Mode 等)の利用者 — 3層 config への移行は本 intent のスコープ外(G-5b)
