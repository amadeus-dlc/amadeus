# Tech Stack Decisions — u001-engine-installer（260705-engine-installer）

上流入力: [services.md](../../../inception/application-design/services.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 決定

| 領域 | 決定 | 根拠 |
|---|---|---|
| 言語・ランタイム | TypeScript + Bun（単体実行、npm 依存なし） | dev-scripts ルール（CON-5）、オフライン前提（NFR-2） |
| ファイル操作 | node:fs（cpSync / symlinkSync / lstatSync ほか）+ node:path | 標準 API のみ。実現可能性は feasibility で実測済み |
| JSON 処理 | JSON.parse / JSON.stringify（2 space） | 依存追加なし。settings.json は deep-equal 検証（BR-10） |
| 正規表現 | new RegExp(文字列) で構築（dev 参照パターン） | パターンに / を含むためリテラル不可（functional-design の確定） |
| 検証基盤 | 既存 eval 慣行（一時 dir + try/finally、決定論的） | engine-e2e / pdm-scope の前例 |

## 不採用

- npm パッケージ（fs-extra、commander 等）: 標準 API で足り、オフライン前提に反するため不採用。
- shell スクリプト: dev-scripts ルール（複雑な処理は TypeScript へ）により不採用。
