# Services — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08
> 上流入力: `../requirements-analysis/requirements.md`、`components.md`、codekb `architecture.md`

## サービストポロジー

常駐サービスは存在しない。実行単位は**短命の CLI プロセス1つ**(`amadeus-setup`)であり、オーケストレーションは cli モジュール内の直列パイプライン(resolve → fetch → plan → report → confirm → apply → manifest → verify)で行う。コレオグラフィ/イベント駆動は不要(feasibility の AWS 観点: クラウドインフラなし)。

## 外部サービス契約

| 相手 | エンドポイント | 用途 | 契約上の注意 |
|------|----------------|------|--------------|
| GitHub REST API | `GET https://api.github.com/repos/amadeus-dlc/amadeus/releases`、`.../tags` | バージョン一覧の解決(FR-006) | 認証なし。rate limit 60 req/h/IP — resolver は1実行あたり最大2リクエストに抑える。403/429 は rate-limit 分類で案内(FR-012) |
| GitHub codeload | `GET https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/vX.Y.Z` | 配布物アーカイブ取得 | 認証なし。1回自動リトライ(FR-012)。ダウンロードは一時ディレクトリへ、展開後に検証 |
| npm レジストリ | (実行時は使用しない) | パッケージ配布(publish 時のみ、手動) | FR-015 手順書・FR-018 pack 検証の対象 |

## ライフサイクルとスケーリング特性

- プロセス寿命: 1コマンド実行分(目標1分以内、NFR-001)。中断(Ctrl-C)時は apply 前ならファイル無変更、apply 中は plan/backup 設計により部分適用が検出可能(マニフェスト未更新のため次回 upgrade が partial と分類 — FR-005)
- 同時実行: 同一ターゲットへの並行実行は想定外(初回リリースではロックを設けない。partial 検出が安全網)
- スケーリング: 該当なし(ローカル CLI)
