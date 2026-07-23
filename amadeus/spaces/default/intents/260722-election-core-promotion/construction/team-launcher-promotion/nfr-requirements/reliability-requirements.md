# Reliability Requirements — team-launcher-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 信頼性要件

- フェイルファスト: business-rules BR-1(prerequisite 検査は main 処理前)+BR-3(OS 判定先行)により、部分起動後の失敗を構造的に排除(requirements FR-3c/3d の loud エラー契約)
- 既存の set -euo pipefail は維持(business-logic-model — 検査追加は既存エラー規律の枠内)
- doctor advisory は表示のみで既存 doctor の信頼性意味論(exit code)へ不影響(BR-5)
- technology-stack のとおり実行環境は macOS/Linux 限定 — 非対応環境ではフェイルファスト(サイレント破損禁止)

## 検証

- 不在・非対応分岐の実到達検証は U4(business-rules の検証割付どおり e2e 層)。本 Unit では fake PATH の integration テストで exit 1+文言4要素を assert(BR-2)
