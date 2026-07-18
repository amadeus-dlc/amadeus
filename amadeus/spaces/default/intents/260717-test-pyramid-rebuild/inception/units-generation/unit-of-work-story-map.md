上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

# ユニットストーリーマップ — test-pyramid-rebuild(#684)

3ユニットをユーザー価値 / ジャーニーで整理する。本 intent の受益者は **フレームワーク保守チーム(移設 intent の実装者・#683 のカバレッジ担当・CI/品質を監視する leader)** であり、価値は「テストピラミッドの現状可視化 → 是正基準の確立 → 是正計画の materialize」という3段のジャーニーで生まれる。実是正(移設・CI 配線)は後続 intent が本 intent の成果物を母集団・規約として消費して行う(FR-7)。

## ジャーニー全体像

| ジャーニー段階 | ユニット | ユーザー価値 |
| --- | --- | --- |
| 1. 現状の可視化 | U1 サイズ分類台帳 | 「どのテストがどの size / tier か」を計測導出で1枚に。アイスクリームコーン型(medium 85.7%)を数値で確定 |
| 2. 是正基準の確立 | U2 層責務仕様 + tier ゲート設計 + 予算ガイドライン | 「あるべき配置」の規約と、逸脱を機械判定する IF、目標比率/実行時間予算の指針 |
| 3. 是正計画の materialize | U3 移設選定台帳 + #683 整合計画 | 「何を・どの順で直すか」を seam 化可能性で優先度付けし、カバレッジ経路と整合させる |

各段は前段の成果物を土台にする(U2/U3 は U1 台帳に依存、unit-of-work-dependency.md)。

## U1: 現状可視化 — サイズ分類台帳

### ユーザー価値

移設 intent の実装者と leader が、テストスイート全体の size×tier 分布を **計測導出の単一台帳** で把握できる。推測やハードコードでなく `classifyTestSize`(size 唯一真実源)の決定的スイープ出力なので、テスト増減時も再スイープで機械追随する(将来条件、requirements.md:47)。「medium 379件(85.7%)偏重」という核心所見が数値で裏付けられ、是正の必要性が定量化される。

### 受け入れ観点

- 442 行全数が台帳化され、tier×size マトリクスが RE 実測(tests/ 全域再帰、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)と一致する
- 各行に file / measured / declared / signals が揃い、消費者(test_pyramid コレクタ / 移設 intent / #683)を持つ派生物である(文書のふりをしたフィールドでない)
- 実測 ref が明記され、数値がすべて `classifyTestSize` 出力の転記である

## U2: 是正基準の確立 — 層責務仕様 + tier ゲート設計 + 予算ガイドライン

### ユーザー価値

「unit には small だけ、integration は medium まで、e2e は large まで、smoke は integration 相当(medium まで)」という **配置の規約** が明文化され、逸脱を機械判定する tier-aware ドリフトゲートの判定 IF が設計される。これにより移設 intent は「どのファイルがどの規約に違反しているか」を機械選定できる。加えて比率目標(small ≥ 50% / medium ≤ 45% / large ≤ 5%)と tier 別実行時間予算がガイドライン目標として与えられ、段階移設のゴールが定量化される。既存 size ドリフトゲートは非破壊温存され、既存の全 green を壊さない(FR-7)。

### 受け入れ観点

- tier×size 上限規約が確定し(smoke=medium 含む)、序数比較の `allowedMaxSize` 設計で表現されている
- tier-aware ゲートの判定 IF(`detectTierSizeViolation`)が設計として記され、既存ゲートへの非破壊温存(ADR-05)が明記されている。CI 配線・落ちる実証は Out と明記
- 比率目標が named 定数で文書化され、実行時間予算は本ユニットの tier 別実測 + 選挙で値を確定する routing が明記されている(実測前に基準値を断定しない)
- 強制ゲート化はいずれも Out と明記されている

## U3: 是正計画の materialize — 移設選定台帳 + #683 整合計画

### ユーザー価値

移設 intent の実装者が「何を・どの順で直すか」を **費用対効果順(seam 化可能性)** の選定台帳で受け取れる。unit 非 small 163件が (i) FS fixture I/O → in-process seam 化で small 化(最優先)、(ii) spawn の本質的 medium → integration へ retier、の2区分で優先度付けされ、着手順が明確になる。同時に #683 のカバレッジ担当が、層別カバレッジ測定経路を C1 台帳の tier キーと整合させる計画を得る。実是正・CI 配線は後続に委ね、本 intent は計画=母集団の materialize に閉じる。

### 受け入れ観点

- 163件の選定台帳が seam 化可能性で優先度付けされ、remediation 2区分で分類されている
- signal 内訳(FS 153 / spawn 99 / network 1 / timer 1)が重複計上・単純合算不可(≠ 163)と明記されている
- 実移設が Out(選定台帳=計画まで)と明記されている
- #683 層別カバレッジの tier キー整合計画が含まれ、CI 配線・強制ゲート化が #683 スコープ(Out)と明記されている

## 価値実現の順序性と独立性

U1 が根であり、可視化(U1)なしには是正基準(U2)も是正計画(U3)も材料を持てない。U2 と U3 は U1 完了後、それぞれ独立に価値を届けられる(相互依存なし、unit-of-work-dependency.md)。是正基準(U2)と是正計画(U3)は別々に移設 intent へ引き継がれ、規約(U2)を母集団台帳(U3)へ適用して実是正が後続 intent で行われる。本 intent の価値は「実是正の前提を完全に揃える」ことにあり、実装を伴う不可逆コミットは含まない(reversibility over perfection、ADR 全体)。
