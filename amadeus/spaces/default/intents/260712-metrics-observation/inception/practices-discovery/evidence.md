# Evidence — practices-discovery(260712-metrics-observation)

> practices-discovery:c1 の執行: 同日(2026-07-12)の RE codekb がスキャン面(CI・テスト・コードスタイル・計測)をカバーしているため、証跡スキャンはこれを代用し、affirm 済み memory 層との差分ギャップのみを検査する。

## 代用した RE 証跡(本 intent、2026-07-12)

- CI 面: ci.yml(contents:read、typecheck·lint·drift·tests / Coverage Report の2ジョブ)・release.yml(contents:write 前例、GITHUB_TOKEN push の非トリガー性)— code-structure.md「計測 seam 台帳」節
- テスト面: 4層ランナー・coverage-totals.json・complexity-gate(CCN 15 ゲート)— 同上
- 配置・スタイル面: package.ts 対象グロブ(scripts/tests は dist 非コピー)、Biome/tsc 2構成(project.md Tech Stack と一致)

## memory 層との差分ギャップ検査(2026-07-12 時点の affirm 済み全文と対照)

- team.md は本日までのノルム PR(#902/#913/#916/#918/#920)で最新 — RE 観測面と矛盾する記載なし
- project.md の Tech Stack / Mandated(dist 同期・検証コマンド群)は RE 実測と一致
- **ギャップ: なし** — 本 intent が導入する「metrics-as-code(snapshot のリポジトリコミット)」は新規プラクティス候補だが、実装着地前の affirm は時期尚早(実績なきプラクティスの先行 affirm は P2 実測主義に反する)— construction 完了後の §13/ローリング PM で扱う
