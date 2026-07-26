# Stakeholder Map — plugin-host-delivery

## 主要ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | プロダクトオーナー / 意思決定者 | 上流 v2.3.0 相当の導入 UX 達成、既存安全契約の維持、upstream sync の機械検証可能性 |
| Amadeus 利用者(6ハーネス) | 受益者 | インストールだけでワークフローが拡張される体験。`--single` 手動起動の解消 |
| Amadeus 保守者(本チーム/ソロ conductor) | 実装・保守 | 正本 1 つからの投影で 6 ハーネスの drift を防ぐ。適合テストで sync 欠落を検出 |
| プラグイン作者(将来) | 拡張者 | ハーネス中立の authoring 面(`plugins/<name>/`)の安定契約 |
| 上流 awslabs/aidlc-workflows | 参照仕様の提供者 | 一方向参照のみ(commit `29a31f78` の doc / test-pro / t188 を正準として追跡) |

## 意思決定者 vs 影響者

- **意思決定者**: ユーザー(j5ik2o)。ステージゲート承認、activation policy 裁定(application-design ADR ゲート)、PR マージ承認、Intent Mirror の create/close 承認境界
- **影響者**: 上流 v2.3.0 の仕様・テスト(追従対象だが決定権はなし — Amadeus 側の安全契約が優先し、相違は設計判断として文書化する)、各ハーネスのプラグイン機構仕様(能力マトリクスの制約条件)

## コミュニケーション要件

- 共有面は本 intent の **Intent Mirror Issue**(record → Issue の一方向同期。節目に状態行更新、完了時に着地確認のうえクローズ)。旧 #1543 は intent 成立後に破棄可(ユーザー裁定 2026-07-26)
- ソロモード運用: 未決事項・仕様変更・不可逆操作は AskUserQuestion でユーザーへエスカレーション。ゲートごとに承認を取り切る
- Construction の成果は Bolt ごとに PR + スカッシュマージ(人間承認)。工程記録はチェックポイントコミットで本線へ流す
