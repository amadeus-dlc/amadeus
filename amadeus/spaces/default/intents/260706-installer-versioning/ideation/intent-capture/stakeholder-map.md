# Stakeholder Map — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](intent-statement.md)

## 利害関係者

| 関係者 | 区分 | 関心と影響 |
|---|---|---|
| Maintainer（j5ik2o） | 決定者 | 更新戦略の選定（契約級判断のエスカレーション先）、gate 承認、merge |
| インストーラ利用者 | 影響者 | カスタマイズの保全、版の判別、非対話 1 コマンドの維持 |
| leader + engineer1〜5（開発チーム） | 影響者 / 協議参加者 | 設計論点のピア協議（全メンバー同報、#534 前例）、#573（engineer1）との接触面 |
| 後続 Intent の実装者 | 影響者 | manifest 形式と更新戦略が今後のインストーラ変更の前提になる |

## コミュニケーション要件

- 設計論点の確定は questions ファイル + 全メンバー同報ピア協議（期限 15 分、回答 1 件成立、採用判断は当方）。
- 契約級の変更（配布契約の改定を含む場合）は leader 経由で人間へ個別エスカレーション。
- 4 イベント報告（gate 到達 / PR 作成 / ブロック / Intent 完了）を leader へ送る。
