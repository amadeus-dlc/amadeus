# Monitoring Design — u001-installer-versioning（260706-installer-versioning）

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、refined-mockups の mockups.md

## 適用判断

常駐監視は不適用（単発 CLI）。可観測性は CLI 出力そのもので担う:

- 実行時の可観測性 = summary（退避列挙・obsolete 内数・restored 件数）と `fix:` 付きエラー（無言の失敗禁止）。
- 事後の可観測性 = manifest（版・時刻・ハッシュ表）と `--version-info`。
- 導入後健全性 = 既存 smoke（doctor）を変更なしで踏襲。
