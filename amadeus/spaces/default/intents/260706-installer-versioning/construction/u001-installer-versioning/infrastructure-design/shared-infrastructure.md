# Shared Infrastructure — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（B002 手順 7 = 自己導入の走査除外）

## 共有物への影響

| 共有物 | 影響 | 手当て |
|---|---|---|
| installer eval 基盤（隔離 tmp workspace） | assertion 追加のみ（基盤は不変） | DR-3 の片付け規約を踏襲 |
| parity / baseline 走査 | なし（.agents/ 起点のため repo 直下の manifest / 退避 dir は構造上対象外。§12a nfr 反復で実測済み） | 実装時に再確認（B002 手順 7） |
| .gitignore | 自己導入時の誤 commit 防止で 2 エントリ追加候補 | B002 手順 7 |
| rename-leftovers / lints | 別機構 2 つとも repo 直下 dotfile を対象にしない（実測済み）: rename-leftovers は allowlist.json の scanRoots、lints は 各 check.ts の defaultInclude がいずれも固定 named リスト | 実装時に allowlist.json と lints/*/check.ts をそれぞれ grep 再確認 |
