# Requirements — 260726-t258-p95-flake(Issue #1511)

上流入力(consumes 全数): business-overview.md(CI 可視赤の運用影響)、architecture.md(性能ゲート2様式 — 絶対 ceiling vs 相対+noise floor — の断面)、code-structure.md(t258/t257 の配置と判定述語の所在)— いずれも codekb 260726-t258-p95-flake 断面(observed `09c669901`)。事実の詳細は record 内 scan-notes.md。

## Intent 分析

`t258-lifecycle-transaction.test.ts:461-462` の絶対 latency ceiling(archive p95 ≤ 500ms / recovery p95 ≤ 750ms)が、共有 CI ランナーの負荷スパイク分散(同一コミット並列ジョブで recovery 219↔767ms / archive 248↔887ms — #1511 クロスレビュー実測)のレンジ内側にあり、コード非交差の PR でも main push が偽赤になる。予算 500/750 は #1424 でユーザーが選んだ round number で、CI 実測 p95(41.2 / 29.3ms)から導出されていない。目標は**退行検出力を保ったままランナー負荷起因の偽赤を構造的に消す**こと。

- 種別: バグ修正(テスト判定の偽赤)/ スコープ: amadeus-bugfix / 深度: Minimal
- 裁定: Q1 = A(noop 相対+絶対予算の AND 二段判定)、Q2 = A(同根 t257 も同一 PR)— questions ファイル「裁定の記録」参照

## 機能要件

### FR-1: t258 latency 判定の median 基準化(改訂裁定 Q1改=C — 承認系譜は questions「裁定の記録」参照)
fail 条件を「**mode の 100 サンプルの median > 絶対予算(archive 500ms / recovery 750ms)**」とする。
- **承認系譜(approval-lineage)**: 当初裁定 Q1=A(noop 相対+絶対 AND)→ builder の実装前実測で前提反証(noop は空ウィンドウ ≈40ns で負荷非相関 — 高負荷スイープで archive 2.3倍膨張時も noop 平坦)→ ユーザー再裁定 Q1改=C(2026-07-26T22:05Z、p95→median の契約変更を正準リスト(4)で承認)。無申告逸脱ではない
- スパイクは 50% 未満なら吸収(median の頑健性)、実退行(全サンプルのシフト)は検出 — mirror-distribution-benchmark-aggregate(#1507)の median 権威様式と同型
- #1424 の絶対予算**値**(500/750)は不変。判定統計量のみ p95 → median
- p95 は判定から外すが **provenance 出力に維持**(観測継続)。median 値(archiveMedianMs / recoveryMedianMs)を provenance へ**追加**(既存フィールド不変 — NFR-3)
- median 実装は長さ非依存の正しい定義(plugin-discovery-overhead-gate の教訓コメント準拠 — 固定 index 禁止)
- 受け入れ基準:
  1. **スパイク吸収**: 合成サンプル列(実在集計値 767.446207 / 886.793806ms 級のスパイクを 6〜49 個含む、合成である旨と構成式をラベル)で、旧判定(p95 ceiling)が赤・新判定(median)が green の対照を固定
  2. **退行検出**: 全サンプルが予算超へシフトした合成列で新判定が赤(落ちる実証)

### FR-2: 判定述語の分離と in-process テスト
判定ロジックを `tests/lib/` 配下の純関数(named constants + fail-closed — 空配列・非有限値は fail)へ分離し、t258 本体はそれを呼ぶ。述語は unit テストで in-process 駆動する。
- 受け入れ基準: 述語 **unit テスト**がハッピーパス+エッジ(境界値・非有限・空列)+FR-1 基準1/2 の対照をカバー。**分担**: FR-2 は述語純関数の unit 面、FR-4 は t258 統合面の配線1ケース

### FR-3: 同根 t257 の同方式是正(裁定 Q2=A)
`t257-status-registry-migration.test.ts:240-241`(strictReadP95Ms ≤ 100 / migrationP95Ms ≤ 250)を同じ median 基準述語へ是正する(予算値 100/250 は不変・判定統計量のみ変更)。
- 受け入れ基準: t257/t258 が同一述語(canonical 1定義)を共有し、独立再定義を作らない(cid:nfr-requirements:cross-unit-note-canonical-reference の判定述語版)

### FR-4: リグレッションテスト(regression-first)
- FR-1 基準1の合成スパイク列を旧判定(p95 ceiling 単独)へ当てると赤・新判定では green、の対照を**修正前に赤**として固定(fixture は合成である旨と構成式を明記)
- 統合面: 新述語の fail が t258/t257 の fail として実際に伝播する配線1ケース(値レベルの網羅は FR-2 unit 側)

### FR-5: Issue クローズ
- 受け入れ基準: PR の main 着地実測後、#1511 へ新判定式(median 基準)・前提反証の経緯・合成シナリオ検証の結果を記録してクローズ(close-after-landing)

## 非機能要件

- **NFR-1**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run coverage:ci` グリーン、lcov patch 未カバー 0(述語は tests/lib/ の in-process 計測面に置く)
- **NFR-2**: t258/t257 の実行時間・サンプル数・ベンチ構造(spawnSync child、100 サンプル、warmup 10)は不変 — 変えるのは判定のみ
- **NFR-3**: LIFECYCLE_TRANSACTION_BENCHMARK の provenance 出力行は維持(フィールド追加は可、既存フィールドの削除・改名は不可 — 監視系の消費者が居る前提の保守側)

## 制約

- dist/self-install 非対象(tests/ のみの変更 — 配布面に tests は含まれない)。dist:check / promote:self:check は無風であることを確認
- 新規ベンチジョブ・CI ワークフロー変更はしない(判定側で解決 — 負荷分離案は採らない)

## 前提

- ~~noop 同時スパイク相関~~ **反証済み**(builder 実測 2026-07-26: noop は空計測ウィンドウで負荷非相関)— FR-1 の承認系譜参照。noop 測定自体は RSS 差分用に不変で維持
- t259 は既に相対形で安全(scan-notes §7)— 変更しない

## Out of scope

- CI ジョブ分離・リトライ内蔵・専用ランナー(判定側で十分)
- 予算値の引き上げ(Q1 で C 案棄却)
- plugin-discovery / mirror-aggregate 系(それぞれ #1525/#1489 で解決済み)

## Open questions

- なし(Q1/Q2 裁定済み。相対 floor の具体値は FR-1 の導出式要求に従い実装時に実測から確定)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T21:31:23Z
- **Iteration:** 1
- **Scope decision:** none

FR-1/FR-4 の「#1511 実測値リプレイ」基準が、現行 provenance に存在しない noop 値・生サンプル列への依拠を前提としており QA が実装不能(Major)。FR-2/FR-4 の退行ケース分担が不明(Minor)。裁定反映・絶対予算維持・引用実在・上流参照は妥当。

### Findings

- [Major] リプレイ基準がデータ実在に反する — 現行 result に noopP95Ms なし・生配列非出力(t258:448-460 実測)。合成シナリオ明示化または provenance 拡張への差替を要求
- [Minor] FR-2(述語 unit)と FR-4(統合 regression)の退行ケース分担が不明記

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T21:31:23Z
- **Iteration:** 2
- **Scope decision:** none

是正版は Major(受け入れ基準の二面化 — 実在集計値+ラベル付き合成 noop の代表シナリオ+provenance への noopP95Ms 追加による将来リプレイ可能化)と Minor(FR-2=unit 値レベル網羅 / FR-4=統合配線1ケースの分担明記)の双方を閉じている。新たな矛盾・抜け道なし。file:line・cid 引用の再検証一致。

### Findings

- None
