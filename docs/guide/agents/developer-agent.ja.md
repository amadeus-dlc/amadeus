# Developer Agent

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細解説](README.md) · 技術リファレンス: [developer-agent](../../reference/agents/developer-agent.md)

amadeus-developer-agent はシニアソフトウェア開発者です。アーキテクチャ設計とユニット仕様を本番品質のコードへと翻訳します。リバースエンジニアリングの際には、amadeus-architect-agent が統合する深いコードスキャンを実施します。

amadeus-developer-agent は Inception と Construction にまたがる 2 つのステージをリードします。そのうちの 1 つ(Code Generation)はサブエージェントとして — ユーザーとのやり取りなしに動作する自律的なサブプロセスとして — 実行されます。ビルドツール、パッケージマネージャ、テストコマンドを実行するための Bash アクセスを持ちます。

Workspace Detection(0.2)は以前は amadeus-developer-agent がサブエージェントとしてリードしていましたが、現在は `amadeus-utility init` 内でルールベースのスキャナーとして決定論的に実行されます。amadeus-developer-agent はもはや Initialization には関与しません。

## リードするステージ

| ステージ | フェーズ | 説明 |
|-------|-------|-------------|
| 2.1 Reverse Engineering(コードスキャン) | Inception | architect の統合のための構造化された分析を生成する深いコードスキャン |
| 3.5 Code Generation | Construction | 設計仕様から作業単位を実装(ユニット単位) |

## サポートするステージ

| ステージ | フェーズ | 貢献 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | コードパターンの証拠スキャン |
| 3.1 Functional Design | Construction | API 契約とデータモデルの入力 |
| 4.3 Deployment Execution | Operation | データベースマイグレーション |

## 期待できること

Code Generation の間、amadeus-developer-agent はサブエージェントとして実行されます — 直接やり取りすることはありません。進捗インジケータが表示され、完了時に結果が表示されます。オーケストレーターがまずコード生成計画を承認のために提示し、その後サブエージェントが各ステップを実装します。

アプリケーションコードはワークスペースルートへ直接書き込まれます(intent の record dir へではありません)。intent の record dir にある `code-summary.md` 成果物が、作成または変更された内容を記録します。

## 協働の仕方

amadeus-developer-agent は amadeus-architect-agent からユニット仕様と設計パターンを、amadeus-quality-agent からテスト要件を受け取ります。CDK/インフラの整合については amadeus-aws-platform-agent と、セキュアコーディングについては amadeus-devsecops-agent と協働します。そのコードスキャン結果は統合のために amadeus-architect-agent へ供給され、実装されたコードはテストのために amadeus-quality-agent へ引き渡されます。

## 主要な原則

- 機能する、テスト済みの実装を提供する — リファクタリングは後続のイテレーションで行う
- プロジェクトの既存のパターンと規約に従う
- 読みやすくデバッグしやすいコードを書く — 巧妙な抽象化を避ける
- 入力を早期に検証し、意味のあるエラーをスローし、決して例外を握りつぶさない
- 生成されるすべてのユニットには少なくともハッピーパスのテストを含める
- リバースエンジニアリングでは、スキャンの徹底性が統合の品質を決定する
