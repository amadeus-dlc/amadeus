# Tech Stack Decisions — u001-installer-versioning（260706-installer-versioning）

上流入力: [technology-stack.md](../../../../../codekb/amadeus/technology-stack.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

| 領域 | 決定 | 根拠 |
|---|---|---|
| ハッシュ | node:crypto createHash("sha256") | repo 慣行（generate-parity-baseline.ts）。依存追加なし |
| git 呼び出し | Bun.spawnSync | 既存 smoke() と同手段。オフライン時・git 不在時は unknown フォールバック |
| JSON 書き出し | JSON.stringify（インデント 2、files 辞書順） | 既存 mergeSettings の書き出しと一貫 |
| 新規依存 | なし | C-3（オフライン）、build-vs-buy の確定 |
