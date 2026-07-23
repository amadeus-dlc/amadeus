# Team Practices — 260719-mirror-productization(部分ドラフト・変更セクションなし)

上流入力(consumes 全数): code-structure、technology-stack、dependencies、code-quality-assessment、architecture、business-overview(いずれも本日 2026-07-23T01:07:15Z 直前に diff-refresh 済みの codekb — re-scans/260719-mirror-productization.md、base a326f47bc / observed d96ffe3be)。

## 差分分析の結論(変更なし)

practices-discovery:c2(再実行では変更セクションのみの部分ドラフト)に従い、本ドラフトは canonical 5セクション(Way of Working / Walking Skeleton / Testing Posture / Deployment / Code Style)を**一切含まない** — affirm 済み team.md の現行 5 セクションと codekb 実測の間に乖離が検出されなかったため(照合の詳細は evidence.md)。practices-promote は空セクションドラフトに対し無変更 no-op として振る舞い、既存 affirm 内容を byte 温存する。

## 照合サマリ

| セクション | affirm 済み内容(要点) | codekb 実測との整合 |
|---|---|---|
| Way of Working | main 中心・短命ブランチ・PR/squash、正本編集+dist 再生成 | 整合(business-overview / architecture の current 節に変更なし) |
| Walking Skeleton | greenfield 初回 Bolt を e2e スライスで確認、bugfix は skip | 整合(変更なし) |
| Testing Posture | tests/ 配下・Bun runner 4層+二層検証 posture | 整合(code-quality-assessment の current 節と一致) |
| Deployment | release.yml workflow_dispatch 一本 | 整合(区間 a326f47bc..HEAD に release.yml の posture 変更なし) |
| Code Style | TypeScript/ESM+Bun 直接実行、Biome lint、formatter 無効、strict tsc、functional-domain-modeling-ts | 整合(code-structure / technology-stack と一致。amadeus-mirror.ts 自体が判別ユニオン様式の準拠例 — re-scan (1)) |

## 本 intent 固有の注記(promote 非対象)

本 intent は「gh を optional runtime 依存として許容するノルム改定」をスコープに含むが、これは requirements/design の裁定と §13/norm PR を経て将来変更されるものであり、**現行 affirm 済み practices(gh-scripts-boundary: gh は scripts/ 限定・packages/framework/ 内 gh 参照 0 件を RE で実測)を本ステージで先取り変更しない**。
