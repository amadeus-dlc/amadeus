# Design System Mapping — Engine Installer（260705-engine-installer）

上流入力: [interaction-spec.md](interaction-spec.md)

## 適用判断

GUI のデザインシステムは存在しないため不適用とする。代替として、CLI の出力語彙を repo 既存の CLI 慣行に対応付ける。

## CLI 代替対応

| 要素 | 本 CLI | 既存慣行の対応 |
|---|---|---|
| 進行表示 | `[n/5] <step> <detail>` | wireframes.md の 5 工程。既存 eval（engine-e2e）の逐次 `ok:` 行と同系の逐次表示 |
| エラー | `amadeus-install: error...` + `fix:` 行 | dev-scripts 群の stderr 慣行（原因 + 対処） |
| 機械可読ラベル | 英語（step 名、path） | 機械可読ラベルは英語のまま使う（org.md） |
