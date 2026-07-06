# Rough Mockups Questions — 260706-installer-versioning（Issue #543）

上流入力: [wireframes.md](wireframes.md)、[user-flow.md](user-flow.md)

## 確認済み事項

出力様式・フローの骨子は協議確定 6 問（feasibility）から機械的に導出でき、新規の質問はない。

## Inception へ引き継ぐ確定待ち（骨子であり本ステージでは固定しない）

| 項目 | 案 | 確定先 |
|---|---|---|
| manifest のファイル名 | `.amadeus-install.json`（target 直下） | requirements-analysis |
| 版確認の入口の形 | `--version-info` flag か `version` subcommand か | requirements-analysis（CLI 互換性 = 既存 usage との整合で判断） |
| 退避 dir の時刻表記 | ISO 8601 の `:` を `-` 置換（ファイルシステム安全） | functional-design |
| manifest 自身を files 表に含めるか | 含めない案（自己参照回避） | functional-design |
