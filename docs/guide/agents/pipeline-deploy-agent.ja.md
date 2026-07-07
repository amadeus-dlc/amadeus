# Pipeline & Deploy Agent

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細解説](README.md) · 技術リファレンス: [pipeline-deploy-agent](../../reference/agents/pipeline-deploy-agent.md)

amadeus-pipeline-deploy-agent は CI/CD エンジニアかつリリースマネージャーです。ビルド仕様とインフラのターゲットを、品質ゲート、ロールバックの安全性、完全な監査可能性を備え、コードをコミットから本番へと運ぶ完全自動化されたパイプラインへと翻訳します。

amadeus-pipeline-deploy-agent は Inception、Construction、Operation にまたがる 4 つのステージをリードします。パイプラインツール、デプロイスクリプト、スモークテストコマンドを実行するための Bash アクセスを持ちます。

## リードするステージ

| ステージ | フェーズ | 説明 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | チームのプラクティスとエンジニアリングルールを発見し、確認時にチームおよびプロジェクトのルールへ昇格させる |
| 3.7 CI Pipeline | Construction | 品質ゲートを伴う CI パイプライン構成 |
| 4.1 Deployment Pipeline | Operation | デプロイ戦略とロールバック手順を伴う CD パイプライン |
| 4.3 Deployment Execution | Operation | デプロイを実行し、スモークテストを走らせ、ヘルスを監視する |

## サポートするステージ

amadeus-pipeline-deploy-agent は助言役としてどのステージもサポートしません。

## 期待できること

amadeus-pipeline-deploy-agent がアクティブなとき、既存の CI/CD インフラ、デプロイのターゲット、ブランチ戦略、ロールバック要件について問いかけます。パイプライン構成(CI 設定ファイル、品質ゲート定義)、デプロイ戦略(ブルーグリーン、カナリア、ローリング)、ロールバックランブックを生成します。Deployment Execution の間、実際のデプロイをオーケストレーションし、スモークテストを走らせ、ヘルスメトリクスを監視します。

## 協働の仕方

amadeus-pipeline-deploy-agent は amadeus-developer-agent からビルド可能なソースとテストスイートを、amadeus-quality-agent から品質ゲート定義を、amadeus-aws-platform-agent から環境エンドポイントを受け取ります。そのデプロイされたサービスは可観測性のセットアップのために amadeus-operations-agent へ引き渡され、デプロイ成果物はパフォーマンス検証のために amadeus-quality-agent へ渡されます。

## 主要な原則

- すべてのコミットはリリース候補である — すべてのゲートを通過すれば、本番の準備ができている
- すべてのデプロイにはテスト済みのロールバックパスがなければならない
- CI パイプラインは時間単位ではなく分単位で完了すべき — 遅いパイプラインはバッチ化を助長する
- 品質ゲートは、欠陥のある成果物がユーザーに届くのを防ぐために存在する
- スモークテストがサービスの健全性を確認するまで、デプロイは完了していない
