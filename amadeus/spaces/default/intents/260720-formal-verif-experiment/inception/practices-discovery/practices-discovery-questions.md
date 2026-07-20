# Practices Discovery 質問

- Interaction mode: Guide me
- Evidence basis: Brownfield 4領域調査(pipeline/deploy、quality、developer、DevSecOps)

## Q1. Brownfield 形式検証実験の Walking Skeleton

既存 team practice は「greenfield の最初の Construction Bolt では walking skeleton を使い、bugfix では skip」と定めています。本 intent は既存の選挙 CLI に対する実験で、その中間に当たります。どの方針にしますか。

- A. この intent に限り walking skeleton を使う。最初の Bolt で「1欠陥の再注入 → 1アーム実行 → 決定論的判定 → CI 証跡」を end-to-end で実証してから残りへ展開する。team 横断ルールは変更しない。
- B. Brownfield の検証実験では常に walking skeleton を使う、という team practice へ拡張する。
- C. この intent では walking skeleton を使わず、既存 CLI とテスト基盤を前提に全実験アームを直接構築する。team 横断ルールは変更しない。
- D. Brownfield の検証実験では walking skeleton を使わない、という team practice へ拡張する。
- X. その他(自由記述)

[Answer]: A — この intent に限り walking skeleton を使う。最初の Bolt で「1欠陥の再注入 → 1アーム実行 → 決定論的判定 → CI 証跡」を end-to-end で実証してから残りへ展開する。team 横断ルールは変更しない。  
**Answered at:** 2026-07-20T06:40:06Z  
**ユーザー直接承認:** 2026-07-20T06:40:06Z  
**Mode:** Guide me
