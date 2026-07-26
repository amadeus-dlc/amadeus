上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

# Services — 260725-kimi-harness

> 上流入力の使用箇所: requirements.md の FR-2/FR-3/FR-9 の実行形態を整理。architecture.md の現行節(plugin 出荷モデル・プロセス起動型の協調構造)をサービス判定の根拠として使用。component-inventory.md の現行節(3閉集合)を導入経路の列挙対象の根拠として使用。team-practices.md の Walking Skeleton 方針により、最初の Bolt(C1)は hook adapter 不在でも成立する実行単位のみで構成されることを確認した。

## サービス定義の判定

本 intent はネットワークサービス・常駐プロセスを**持たない**(CLI/ライブラリ変更)。サービス層の設計(同期/非同期・REST/gRPC・オーケストレーション)は該当しない。以下はサービスに相当する実行単位の整理(プロセス起動型の協調)。

## 実行単位と協調パターン

| 実行単位 | 起動者 | 協調 |
|---|---|---|
| hook adapter | Kimi CLI(イベント発火) | fire-and-forget のプロセス起動。Stop/UserPromptSubmit/PreToolUse のみ応答が主フローに影響(同期応答) |
| core hooks/tools | adapter からの subprocess | 既存の決定的 CLI 呼出(同期) |
| setup マージモジュール | setup CLI(install/upgrade) | wizard の対話フロー内で plan report → confirm → apply の直列(既存流儀) |
| doctor probe | `/skill:amadeus --doctor` | 読み取り中心の検査(同期・advisory) |
| live driver | テストランナー | `kimi -p` の spawn + 出力回収(同期) |

## ライフサイクルとスケーリング

- hook adapter: イベントごとに短命プロセス。並行起動されうる(同一イベントの複数ルールは Kimi が並行実行)ため、core hooks 側の既存ロック機構(mkdir ベース)に依存し、adapter 自体は状態を持たない
- マージモジュール: install/upgrade の実行中のみ。冪等で再入可能
- 新規の常駐・共有状態は一切導入しない
