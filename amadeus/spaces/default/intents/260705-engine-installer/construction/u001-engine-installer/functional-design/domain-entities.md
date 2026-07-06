# Domain Entities — u001-engine-installer（260705-engine-installer）

上流入力: [business-logic-model.md](business-logic-model.md)、[component-methods.md](../../../inception/application-design/component-methods.md)

## エンティティ

| エンティティ | 説明 | 主な属性 |
|---|---|---|
| マニフェスト | 配布対象の宣言的列挙（唯一の正） | engineDirs（7）、skillsGlobPrefix、claudeSymlinks（7）、amadeusMd（removeSections / removeBlocks / devReferencePatterns）、hooksWiring（11） |
| 工程 | インストールの実行単位（5 個、直列） | 番号、名前（engine / skills / symlinks / settings / smoke）、対応関数 |
| 配布元 | clone した本リポジトリ（読み取り専用） | root path、.agents/amadeus/、skills 2 系統、AMADEUS.md |
| 対象 workspace | インストール先（--target） | 事前チェック結果、既存資産（settings.json、skills、aidlc/） |
| エラー中断 | 衝突・解析不能・I/O 失敗時の停止 | 失敗工程、対象 path、原因、fix 案内、exit code 1 |
| 専用 eval | 一時 workspace での実インストール検証 | 検証項目（FR-2.1〜2.11、FR-4.1）、一時 dir（try/finally で片付け） |

## 関係

- マニフェストは全工程と eval の唯一の参照元である（BR-6。二重定義を作らない）。
- 工程は直列で、エラー中断は以降の工程を実行しない（BR-4）。
- 対象 workspace の `aidlc/` はどのエンティティからも書き込み参照されない（BR-1）。
