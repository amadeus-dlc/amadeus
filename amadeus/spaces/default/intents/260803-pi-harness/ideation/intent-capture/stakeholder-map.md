# Stakeholder Map — 260803-pi-harness

## Stakeholder 一覧

| Stakeholder | 役割 | 主な関心 | 本intentとの関係 |
|---|---|---|---|
| プロジェクトオーナー（ユーザー本人） | 決定者・最初の利用者 | Pi上でAmadeusを安全かつ完全に利用できること。正式対応の品質基準が曖昧でないこと | スコープ、配布契約、完了条件、各承認ゲートの最終裁定者 |
| Pi Coding Agentを使うAmadeus利用者 | 外部顧客 | Pi標準のskill・extension・package体験でAI-DLCを導入・実行できること | `dist/pi`、setup CLI、Pi Package、利用者文書の受け手 |
| Amadeus開発者・保守者 | 実行者・内部顧客 | 共通コアを分岐させずにPiを保守でき、他ハーネスへの回帰を検出できること | ハーネスadapter、生成・配布・doctor・テストの実装と保守を担う |
| Pi Coding Agent保守者 | 外部影響者 | 公開されたextension event、package、CLI契約に沿った統合であること | 上流API変更がPi adapterの互換性と最低対応版に影響する |
| Amadeusリリース・CI保守者 | 内部影響者 | 生成物のdriftがなく、二重配布経路が再現可能であること | packaging parity、promote-self、全ハーネス回帰、live test gateを監視する |

## 決定者と影響者

- **最終決定者**: プロジェクトオーナー。ソロモードで、Intent、スコープ、設計上の公開契約、各ステージ成果物を承認する
- **技術上の制約提供者**: Pi Coding Agentの公開APIと実装。Pi 0.83.0のevent・package・CLI surfaceを互換性基準とする
- **品質上の影響者**: Amadeus開発者・CI保守者。既存ハーネスのparity、決定性、監査証跡を維持できない変更は受け入れない
- **独立した外部承認者**: 現時点では存在しない。公開サポートに必要な証拠は自動テストとdogfood記録で補う

## 影響を受ける領域

| 領域 | 想定される影響 |
|---|---|
| ハーネスmanifest・Pi用手書きソース | skill、extension lifecycle adapter、質問表示、subagent driver、Pi固有設定の追加 |
| 共通コアのハーネス境界 | Piの識別、doctor、許可済みharness値など、既存の拡張点に限定した追加 |
| packaging・promote-self・`dist/pi/` | Pi生成物の決定的生成とdrift guardへの参加 |
| setup CLI・Pi Package | `--harness pi`と`pi install -l`の二重導入、および両経路のparity保証 |
| テストハーネス | extension event契約、subagent、doctor、packaging、TUI dogfood、opt-in live journeyの追加 |
| 利用者・保守者向け文書 | Piの前提条件、project trust、導入、起動、制約、トラブルシュート、移植構造の説明 |

## Communication 要件

- 本AI-DLCの承認ゲートを、公開契約とトレードオフの合意点として使用する
- ステージ成果物はactive intent配下に日本語で記録し、設計・実装・検証の追跡可能性を保つ
- ユーザー向け文書では「Pi Agent Core対応」と「Pi Coding Agentハーネス対応」を明確に区別し、今回の正式対象が後者であることを明記する
- 最低対応版、project trust、Pi Packageが任意コードを実行すること、live testのopt-in条件を導入文書で明示する
- 正式対応を表明する前に、決定的テスト結果と実機dogfood結果を同じ完了報告で共有する
- Pi上流のeventまたはpackage契約が変わった場合は、doctorと適合テストの失敗を更新判断の入口とする
