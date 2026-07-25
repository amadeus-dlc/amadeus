上流入力(consumes 全数): intent-statement, feasibility-assessment, constraint-register

# Intent Backlog — 260725-kimi-harness

優先順位は dependency-first + risk-first(scope-definition:c3)。payload 実機差異リスク(R1: raid-log)を持つ adapter を先行し、live capture を early に取る。テストは各項目に随伴(org.md Testing Posture: feature = コードと並行してテスト作成)。

## 優先度付き proto-Units

| # | proto-Unit | 依存 | リスク/価値の根拠 |
|---|---|---|---|
| 1 | M1 ハーネス定義(manifest + authored surfaces) | なし | 全ての土台。packager が manifest を自動検出するため、以降の全作業の前提 |
| 2 | M2a payload live capture + adapter 骨格 | M1 | 最大リスク R1 の早期解消。Q1 許可済みの実機配線で全9イベントの payload を採取し、adapter の変換表を実測で固定 |
| 3 | M2b adapter 完成 + 契約テスト | M2a | 9 target の正規化。採取済み payload を流して core hook 効果を断言 |
| 4 | M3 配線マージ機構(setup CLI) | M1 | OC-1 境界の中核。managed block の冪等・バックアップ・dry-run・除去 |
| 5 | M4 コア編集3箇所(doctor/swarm/harness-dirs) | M1 | 小粒。doctor arm は M2/M3 の成果物を検査対象にするため後続でもよい |
| 6 | M5 配布・CI 列挙 | M1 | 小粒の列挙更新 |
| 7 | M6 dist 生成 + promote-self dogfood | M1-M5 | 統合ポイント。実機 `/skill:amadeus` 起動・hook 発火・doctor パスを確認 |
| 8 | M7 残りの決定的テスト整備 | M2-M6 | dist 構造 smoke・setup マージ単体・swarm resolve 分岐 |
| 9 | M9 live driver + journey | M6 | driver 新規作成(kimi -p 駆動)。実走して green を確認してからマージ |
| 10 | M8 ドキュメント | M6-M7 | 実装確定後に書く(実測に基づく手順書とするため) |

## バリューストリーム

Kimi ユーザーが `/skill:amadeus` を起動してワークフローを hooks 込みで完走できる体験が価値の核心:

1. **導入**: setup CLI が dist/kimi を配置し(M5)、managed block をユーザー承認付きで config.toml へマージ(M3)
2. **起動**: `/skill:amadeus` が orchestrator SKILL.md から起動し(M1/M10)、hooks が presence mint・audit・sensors・stop loop を駆動(M2)
3. **運用**: doctor が配線・バージョン・機能 probe を検査(M4)。問題時は手動 fallback 手順と除去手順が docs にある(M8)
4. **検証(本チーム)**: dogfood(M6)・決定的テスト(M7)・live journey(M9)が品質を継続保証

## 見積もりメモ

- M1-M6 は全て既存パターンの踏襲(cursor/codex の先例あり)で、新規設計は M3 のマージ機構と M9 の driver が主
- constraint-register TC-1/TC-2/OC-1 は M3 の受け入れ条件に直接対応
- 大きさの上限は設けず、凝集性で判定する(intent-capture:c4 の既定)。現状の見立てでは最大の塊は M2(adapter + live capture + 契約テスト)
