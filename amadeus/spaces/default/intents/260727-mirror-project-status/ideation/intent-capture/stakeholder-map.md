# Stakeholder Map — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。入力は GitHub Issue #1560 とユーザーとの Grill me 対話)

## 主要ステークホルダーと関心事

| ステークホルダー | 種別 | 関心事 |
|---|---|---|
| ソロ運用者(本リポジトリのユーザー) | 一次ユーザー / 意思決定者 | Project ボードが手動編集ゼロで実状態に収束すること。誤 close・誤 Status 更新が起きないこと |
| Amadeus 配布先のチーム利用者 | 将来ユーザー | 配布 framework runtime に含まれる mirror capability として、自チームの Project 運用でも同じ保証が成立すること。認証要件(`project` scope 等)がドキュメント化されていること |
| Amadeus フレームワーク保守者 | 開発者 / 影響者 | 既存 mirror モジュール群(gateway / executor / state codec / reducer / lifecycle / repair)への統合が境界を保つこと。全ハーネス projection の drift guard が通ること |
| GitHub(外部サービス) | 外部依存 | ProjectV2 GraphQL API の認証 scope・rate limit・部分成功セマンティクスが失敗・再試行設計の制約になる |

## 意思決定者 vs 影響者

- **意思決定者**: ソロ運用者(= 本ワークフローの承認ゲート保持者)。スコープ・受入条件の変更、マージ承認はすべてこの1名。
- **影響者**: Amadeus 保守者視点(コード境界・テスト・配布同期)と GitHub API 制約(実現可能性の外部条件)。いずれも決定権は持たず、要件・設計への入力となる。

## コミュニケーション要件

- 進捗と裁定は intent record(本ディレクトリ配下)を正本とし、GitHub Issue #1560 側は状態行の更新のみ(record → Issue の一方向、intent-first ミラー運用に準拠)。
- 認証・権限に関する利用者向け説明(必要な GitHub token scope、権限不足時の診断の読み方)は受入条件の一部としてドキュメント化する。
- 失敗時(pending / safety-blocked)の状態は利用者へ可視化し、無音のまま同期停止しない(Issue の失敗・再試行セマンティクス欄に準拠)。
