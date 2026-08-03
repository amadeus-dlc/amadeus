# Frontend Components — u2-installer-asset

上流入力(consumes 全数): requirements(Out of Scope — UI なし)、components(C2 = installer CLI 経路のみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u2-installer-asset は `@amadeus-dlc/setup` CLI の取得経路変更のみで UI を持たない。produces 全件実在要件を満たす根拠付き N/A 宣言。

## 出力契約(人間可読面 — CLI エラーメッセージ)

- asset 欠落: `release asset not found for v<ver> (expected for versions >= <intro>) — this is an error, not a fallback`
- checksum 不一致: `checksum mismatch for amadeus-dist-v<ver>.tar.gz — refusing to install`
- SHA256SUMS 欠落: `checksum file missing for v<ver> — refusing to install unverified archive`
