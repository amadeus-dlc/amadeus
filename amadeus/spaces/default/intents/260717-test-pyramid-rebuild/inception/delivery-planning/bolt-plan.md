上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

# Bolt Plan — test-pyramid-rebuild(#684)

本 intent は **設計・計画・台帳 materialize まで**(FR-7、requirements.md:40-43)。実テスト移設・run-tests.sh 実装変更・新分類器・tier-aware ゲートの CI 実装配線は **すべて別 intent(Out)**。#1157 未接触。以下の Bolt 分割・見積りはこの境界を前提とする。

## Bolt シーケンス概観

ユニット依存 DAG(unit-of-work-dependency.md)は U1 を根とし、U2・U3 が U1 のみに依存する2分岐(相互依存なし)。Bolt はこの DAG を尊重し、**Bolt 1 = U1(根)を単独・ゲート付き**で先行させ、**Bolt 2/3 = U2・U3 を並行**させる heuristic(walking-skeleton-first)を採る。理由は risk-and-sequencing-rationale.md に記す。

| Bolt | 内容ユニット | 依存 Bolt | 並行可否 |
| --- | --- | --- | --- |
| Bolt 1 | U1-size-ledger | なし(根) | 単独(スケルトン) |
| Bolt 2 | U2-layer-spec-gate | Bolt 1 完了後 | Bolt 3 と並行可 |
| Bolt 3 | U3-migration-coverage | Bolt 1 完了後 | Bolt 2 と並行可 |

## Bolt 1: U1 サイズ分類台帳(SizeLedger)の materialize

### 目的

全テスト442ファイル(tests/ 全域再帰、既存 `test_pyramid` コレクタと同型の無制限再帰列挙)を `classifyTestSize`(`tests/lib/test-size.ts:49`、size 唯一真実源、ADR-04)で決定的分類した計測導出台帳を正式 record 成果物として materialize する(C1、FR-1、AC-1a/1b)。

### 含むユニット

U1-size-ledger のみ(unit-of-work.md:21-70)。

### 成果物

- tier×size マトリクス(unit 211 / integration 147 / e2e 68 / smoke 14 / harness 1 / lib 1、計442。small 60 / medium 379 / large 3。tier は開いた集合で harness/lib は補助 tier=規約対象外)
- 全442行の台帳(`file` / `tier` / `measured` / `declared` / `signals`)
- `buildLedgerRow` / `buildSizeLedger` 純関数の設計(消費契約含む)
- 実測 ref(measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)併記(measurement-ref-in-artifacts)

### 受け入れ基準(unit-of-work.md AC-1a/1b を Bolt DoD として採用)

- 442行全数が `classifyTestSize` のスイープ出力から材料化され、tier×size マトリクスが実測値と一致する。ハードコードなし
- 全 size 値が実行出力の転記であり、実測 ref(HEAD SHA)を明記
- 台帳が「文書のふりをしたフィールド」でなく、3系統の消費者(コレクタ / 移設 intent / #683)を持つ派生物であること

### 行数規模見積り(unit-of-work.md:15,64 からの転記、点推定禁止 — 幅で記載)

**約560〜600行**(内訳: 台帳 materialize ≈460行 + `buildLedgerRow`/`buildSizeLedger` 純関数 ≈80〜120行 + 消費契約 ≈20行)。measurement ref: `3917a283a953165866170d235d3dc25ad2fd3643`(RE scan-notes.md:57 の442行決定的スイープ実測に基づく)。

### Walking Skeleton 姿勢

本 intent はグリーンフィールド要素(新パッケージ・新配布経路)を持たない既存コードベースへの設計・台帳 materialize 作業であり、org.md「Walking Skeleton」の greenfield 既定(mvp/enterprise/feature/poc/workshop/infra)に厳密には該当しない。一方で U1 は「他ユニットが依存する根」かつ「消費契約(コレクタ/移設 intent/#683)を持つ最小 end-to-end スライス」という性質上、**walking-skeleton 相当の単独・ゲート付き実行が理にかなう**(project.md「Walking Skeleton」: greenfield 要素を含む intent は最初の Bolt を小さな end-to-end スライスとして扱いゲートする)。ただし本 intent がこの既定の対象か(スケルトン姿勢の要否そのもの)は論点として残る — delivery-planning-questions.md Q1 へ送る。

### 並行可否(非交差判定 — c6)

Bolt 1 は根であり他 Bolt に先行するため並行判定は不要(単独実行)。編集正本は `amadeus/spaces/default/intents/260717-test-pyramid-rebuild/inception/delivery-planning/` 配下の後続 construction 成果物(record 内、tests/lib 配下の設計文書)であり、dist/self-install 面への書き込みはない見込み(実装 Out のため)。

## Bolt 2: U2 層責務仕様 + tier-aware ドリフトゲート設計 + 比率/実行時間予算ガイドライン

### 目的

各 tier の責務規約(C2)、tier-aware ドリフトゲートの判定 IF 設計(C3、実装 Out)、比率目標(FR-2)・実行時間予算(FR-5)のガイドラインを確立する。size 判定は U1 台帳を突き合わせるのみで独自判定を持たない。

### 含むユニット

U2-layer-spec-gate のみ(unit-of-work.md:71-111)。

### 成果物

- 層責務規約(C2): unit=small のみ / integration=medium まで / e2e=large まで / smoke=medium まで(`allowedMaxSize` の序数比較設計)。規約対象は 4 named tier のみで harness/lib 等の補助 tier は対象外(E-TPR-NR1)
- tier-aware ドリフトゲート判定 IF(C3、実装 Out): `TierSizeViolation` 判別ユニオンと `detectTierSizeViolation` / `buildTierDriftReport` の設計(既存 size ドリフトゲートへの非破壊温存、ADR-05)
- 比率目標ガイドライン(FR-2): small ≥ 50% / medium ≤ 45% / large ≤ 5% を named 定数で文書化。現状(13.6%/85.7%/0.68%)とのギャップ明記。強制ゲート化は Out
- 実行時間予算ガイドライン(FR-5): tier別実行時間を **本 Bolt 内で実測したうえで選挙確定**(AC-5a、requirements.md:33 = scope-document「実測前提・値は選挙」の routing 先)。実測前は基準値を断定しない

### 受け入れ基準(unit-of-work.md AC-3a/3b/3c、AC-2a/2c、AC-5a/5b を Bolt DoD として採用)

- tier×size 上限規約が確定し、`allowedMaxSize` が序数比較で表現されている(smoke=medium 含む)
- tier-aware ドリフトゲートの判定 IF が設計として記され、既存ゲートへの非破壊温存が明記されている。CI 配線は Out と明記
- 比率目標(50/45/5)が named 定数で文書化され、強制ゲート化 Out が明記されている
- tier 別実行時間予算が設計対象として宣言され、値は本 Bolt の実測+選挙で確定する routing が明記されている

### 行数規模見積り(unit-of-work.md:16,105 からの転記)

**約240行**(層責務規約 ≈60行 + tier-aware ゲート判定 IF 設計 ≈80行 + 比率目標文書 ≈40行 + 実行時間予算+tier別実測 ≈60行、いずれも点推定)。設計/文書のみで実装は Out。

### Walking Skeleton 姿勢

Bolt 1 承認後の拡張 Bolt。org.md のラダープロンプト(Bolt 1 出荷後「残りの Bolt はどう実行しますか」)の対象。

### 並行可否(非交差判定 — c6)

Bolt 3(U3)と編集正本が交差しない見込み: Bolt 2 は層責務規約・ゲート設計・予算ガイドラインの record 成果物、Bolt 3 は移設選定台帳・#683整合計画の record 成果物で、対象ファイルは別ディレクトリ(construction/U2-layer-spec-gate/ vs construction/U3-migration-coverage/)に分かれる想定。ともに U1 台帳(読み取りのみ、U1 は Bolt 1 で確定済み)を消費するが書き込みは行わない。**worktree 隔離での並行ディスパッチ可**(team.md「並行実装」— builder 最大4)。

## 実装スコープ境界(全 Bolt 共通、Out 明記)

- 台帳生成スクリプトの実装・CI 恒常生成配線・実移設(テスト書き換え・移動)・run-tests.sh 実装変更・新分類器実装・比率/実行時間のハードコード・tier-aware ドリフトゲートの CI 実装配線・落ちる実証・exit code 契約 — すべて別 intent(FR-7、unit-of-work.md 各ユニット「実装スコープ境界」節)
- #683 層別カバレッジの CI 配線・強制ゲート化は #683 スコープ(Out)
- #1157 未接触
