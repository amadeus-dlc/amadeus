# Risk & Sequencing Rationale — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(FR-4d の検証ギャップ)、unit-of-work-dependency.md(DAG・交差材料)、unit-of-work.md(Unit 境界)、components.md(規模)、unit-of-work-story-map.md(価値順)、team-practices.md(規律)

## 順序の根拠(リスク制御としての明示)

1. **Bolt 1 = U1 を skeleton にする理由**: 最小の end-to-end 配線(utility → plugin CLI → 出力透過)で「委譲様式・usage 三重同期・t67 更新」という本 intent の反復パターンを最初に1回実証し、ユーザーゲートで様式を固定してから残 Bolt に展開する。書込系(install)や graph 変更(runner-gen)を skeleton に含めない — 失敗時の巻き戻し面を最小化
2. **Bolt 2 → Bolt 3 の直列**: amadeus-plugin.ts の同一ファイル交差(U2 = install 追加、U3 = spawn 配線)。U2 先行により U3 の配線点(handleCompose/handleDrop)が install 込みの最終形の上に乗り、rebase 衝突の窓を消す
3. **Bolt 3 のリスク集中への手当**: FR-4d(本 repo で再現不能な #1598)は compose 済みホスト模擬 fixture を Bolt 3 スコープ内で先に作る(検証手段を実装より先に確立 — 落ちる実証を可能にする順序)
4. **Bolt 4 終端**: 文言は入口確定後(component-dependency.md C5 依存)。docs 先行は陳腐化の再発源

## リスク台帳(feasibility raid-log の Construction 面への引き継ぎ)

| リスク | Bolt | 手当 |
|---|---|---|
| R1 #1598 方式(ADR-1 確定済み: graph フィールド焼き込み) | 3 | 縮退先(ownedPaths)まで ADR に明文。fixture 先行 |
| R2 utility.ts 肥大・complexity/coverage 接触 | 1 | 薄い委譲+匿名増ゼロ+in-process seam(FR-2d) |
| R3 install 部分失敗 | 2 | tmp→rename+3値判定(ADR-2)。5ケーステストで固定 |
| R4 docs の面誤記(スキル=7面/ハンドラ=core 投影の区別) | 4 | 19-plugins 更新時に面の区別を明記 |
| 未検証領域を残したままの PR 発行(unverified-raid-is-live-risk) | 全 | 各 Bolt の RAID「未実測」項は当該 Bolt 内で実測してから PR(先送りはユーザー裁定必須 — bt-no-silent-scope-narrowing) |
