# Inception Phase Guardrails

これらのルールは、`phase: inception` を宣言するすべてのステージに、対応するフェーズルールとしてインポートされ適用される。

## Requirements Quality

- 要件はテスト可能かつ検証可能でなければならない — 各要件に明確な合否基準を設ける
- 曖昧な表現(「速い」「簡単」「使いやすい」)は、測定可能な閾値と対にしない限り避ける
- 要件間の未解決の矛盾を持ち越さない。明示的に表面化させ解決する

## Architecture Standards

- アーキテクチャ決定にはトレードオフ分析を必須とする — 検討した代替案を最低2つ文書化する
- すべての ADR に含める: Context、Decision、Consequences、Alternatives Rejected
- 主要なアーキテクチャ決定ごとに、セキュリティとコンプライアンスへの影響を扱う
- 後方互換レイヤー・移行シム・新旧の二重実装・非推奨API の維持は、既定でスコープ外とする。導入する場合は「なぜ互換が必要か」を requirements/NFR まで遡れる根拠付きの ADR として明示し、代替(古い挙動を削除して置き換える案)を Alternatives Rejected に記録する。根拠のない互換維持を design に持ち込まない
- ユニット分割・コンポーネント設計には規模の正当化を含める: 各ユニットの推定規模と、既存インフラ(CI ジョブ・テストランナー・既存ツール)の再利用棚卸し(reuse inventory)を成果物に記録し、新規の機構・ジョブ・ツールは既存で代替できない根拠がある場合のみ導入する。intent に規模バジェットが与えられている場合、超過は承認ゲートで停止する

## User Stories

- ユーザーストーリーの受け入れ基準は Given/When/Then(BDD)形式に従う
- 各ストーリーはアクター、アクション、ビジネス価値を特定する
- ストーリーは独立してテスト可能にする — 順序の中でしか意味を持たないストーリーを避ける

## Traceability

- すべての要件は ideation の成果物(intent、feasibility、scope)まで遡れなければならない
- inception で新しい要件を導入する場合は、必ずその由来を文書化する

## Software Design Principles

要件に依らず常時適用する設計原則。詳細は `amadeus/spaces/default/knowledge/amadeus-shared/software-design/` の同名ディレクトリを参照する(索引: 同ディレクトリの `README.md`)。

- **パッケージ/モジュール設計は変更の制御として行う**: 見た目の整理ではなく、情報隠蔽・変更理由の凝集・依存方向の制御・リリース境界で分割を決める。循環依存を作らない(`package-design`)。既存構造の再編は小さく検証可能な手順で行う(`refactoring-packages`)
- **モジュールは実装詳細を隠し、狭いAPIだけを公開する**: 内部構造への到達経路を公開APIに含めない
- **方式依存の設計知識は採用時のみ適用する**: DDD 集約設計・CQRS/ES・Clean Architecture 等の方式別原則は、プロジェクトがその方式を採用する場合に限り適用し、採用プロジェクトは `memory/project.md` に索引(`software-design/README.md`)へのポインタルールを追加する。採用していないプロジェクトに方式のセレモニーを持ち込まない

## Corrections
