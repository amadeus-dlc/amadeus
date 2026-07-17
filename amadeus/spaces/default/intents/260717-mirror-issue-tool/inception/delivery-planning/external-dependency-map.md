# External Dependency Map — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 外部依存

| 依存 | 種別 | 検証手段 | 障害時 |
|---|---|---|---|
| gh CLI(認証済み) | 実行時必須 | ensureGhReady(gh auth status) | loud エラー exit 1(FR-1.3) |
| GitHub Issues API(gh 経由) | 実行時 | gh の exit code 自己捕捉 | stderr 透過+exit 1(NFR-2) |
| amadeus-lib(repo 内) | ビルド時 import | tsc 型検査 | CI 赤で検出 |

新規外部サービス契約・クレデンシャル追加なし。

## 依存の受け入れ判定

上表3依存はすべて既存環境で充足済み(gh 認証は feasibility で実測、amadeus-lib は repo 内)。新規調達・承認が必要な依存はゼロ — construction 進行のブロッカーなし。
