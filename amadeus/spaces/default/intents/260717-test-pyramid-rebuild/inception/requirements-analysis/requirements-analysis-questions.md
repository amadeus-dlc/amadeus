# Requirements Analysis — 明確化質問(260717-test-pyramid-rebuild、#684)

<!-- 判定証跡(eoc1-evidence-in-questions-header):
判定: Q1〜Q3 選挙必要(真に未決の設計判断 — 比率目標/層境界/移設対象は Issue 論点、単独決定禁止)/ Q4 選挙不要(既決導出 — 計測導出・グリーン維持の転記)。
Q4 選挙不要判定の leader 承認: 2026-07-17T10:52Z(agmsg 一次記録)。
選挙: E-TPR-RA として leader へ配信依頼(agmsg 一次記録)
裁定受領: E-TPR-RA 2026-07-17T10:51:14Z 開票 — Q1〜Q3 すべて A 採用・全会一致 4/4 全票 GoA 1(シャッフル写像公開済み。agmsg 一次記録)
回答の記入は選挙裁定の受領後にのみ行う(election-answer-after-ruling)。 -->

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`、`../../ideation/scope-definition/scope-document.md`、codekb `business-overview.md`・`architecture.md`・`code-structure.md`、`../practices-discovery/team-practices.md`

## 選挙対象の宣言(1問1行)

- Q1: 選挙必要 — 比率目標の形(サイズ観点でどの分布を理想とするか。実測 small 60/medium 377/large 3 = 14%/86%/0.7%)
- Q2: 選挙必要 — 層境界の定義(tier ディレクトリ層と size の対応をどう規約化するか)
- Q3: 選挙必要 — 移設対象の選定基準(unit 非 small 163件のどれを優先移設候補とするか)
- Q4: 既決導出 — 導出方法=計測(classifyTestSize)から、グリーン維持、実移設は Out(intent-statement/scope 転記)

## Q1: サイズ比率目標の形は?

前提実測(RE): small 60(14%)/ medium 377(86%)/ large 3(0.7%)。理想ピラミッドは small 多数。

- A. **サイズ比率のガイドライン目標(強制でなく指針)**: small ≥ 50% / medium ≤ 45% / large ≤ 5% を中長期目標として文書化。現状(14/86/0.7)からのギャップを台帳化し、移設で段階的に近づける(強制ゲート化は本 intent Out — 移設 intent で検討)
- B. 厳格な数値ゲート(比率違反で CI 赤)を今導入
- C. tier 別の目標(unit=small 中心/integration=medium/e2e=large 許容)を size でなく tier で設計
- X. その他(修正案)

[Answer]: A — サイズ比率ガイドライン目標(small≥50/medium≤45/large≤5%・指針・ギャップ台帳化・強制ゲート化 Out、E-TPR-RA Q1=A)

## Q2: 層境界(tier×size)の定義は?

前提実測: 現状 tier(ディレクトリ)と size(動的性質)は独立。unit に medium 162件が同居。

- A. **tier は size の上限を規約化**: unit=small のみ(medium/large は違反)/ integration=medium まで / e2e=large まで許容。size ドリフトゲートを tier-aware に拡張する設計を記す(実装は移設 intent)。size は classifyTestSize が唯一の真実源
- B. tier と size を完全分離(ディレクトリは論理分類のみ、size は別軸)
- C. tier を廃止し size ディレクトリ(small/medium/large)へ再編
- X. その他

[Answer]: A — tier が size 上限を規約化(unit=small/integration=medium/e2e=large、classifyTestSize 唯一真実源・tier-aware ドリフトゲートは設計のみ、E-TPR-RA Q2=A)

## Q3: 移設対象の選定基準は?

前提実測: unit 非 small 163件(FS 153/spawn 99 主因)。

- A. **in-process seam 化可能性で優先度付け**: FS fixture I/O(153件)のうち関数直接呼び出し(seam)へ置換可能なものを最優先(既存 seam-export ノルムの適用先)、spawn(99件)は CLI/hook 検証で本質的に medium なものは integration へ移設(size でなく tier を正す)。選定台帳を成果物化(移設実装は Out)
- B. 全 163件を一律移設対象
- C. 移設せず現状を許容(比率目標のみ文書化)
- X. その他

[Answer]: A — seam 化可能性で優先度付け(FS 153 の seam 置換可能分最優先・spawn 99 の本質 medium は integration へ・選定台帳成果物化、E-TPR-RA Q3=A)

## Q4: 導出方法・グリーン維持は?(既決導出)

- A. 分類・比率・境界はすべて classifyTestSize の計測から導出(ハードコード禁止=検証劇場 Forbidden)。既存スイートのグリーン維持。実移設は本 intent Out(別 intent、計画=B-4 まで)
- X. その他

[Answer]: A — 計測導出・グリーン維持・実移設 Out(Q4 E-OC1 承認 2026-07-17T10:52Z)
