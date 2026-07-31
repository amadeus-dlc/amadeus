# Business Logic Model — u4-tools-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u4 は plugin tools の配布機構(FR-A3、components.md C2)と一括 compose verb(FR-B1、components.md C3)を実装し、本 repo の全現存ハーネスツリーを compose 済みにする Unit(unit-of-work.md の u4)。story-map の「compose した plugin が配布先で自立実行できる」に対応。ADR-1(tools フィールド新設)準拠。

## 変換・判定のモデル

### M1: manifest 拡張(C2)

`PluginManifest` へ `tools: readonly string[]` を追加。`parseTools`: 相対パス・`tools/` 配下限定・`expectRelPath`(amadeus-plugin-compose.ts:1470-1478 — 絶対パス・空セグメント・`.`/`..` 拒否)による検証(既存 parseStages の検証流儀を再利用 — component-methods.md C2。同所の旧記載 isUnsafeRelativePath は scripts/plugin-projection.ts:192 の projection 時安全検査(別文脈のシンボル)で本文脈不適用 — reviewer 実測により expectRelPath へ訂正・上流へも同根伝播)。欠落時 `[]`(後方互換 — tools なし plugin は挙動不変)。

### M2: compose 書込の拡張(C2)

`composeWriteSet` の hostWrites へ toolsCopies(verbatim コピー — prose 変換なし)を合流。`ownedPaths` へ tools パスを含める。**digest 面の対称拡張(必須)**: `ownedStageDigests`(:584-586、stages のみ走査)を stages+tools 走査(例 `ownedRecordDigests`)へ拡張し `ownedContentDigests`(:558)の算出元とする — 欠くと `planPluginDrop`(:703-718)が tools を expectedDigest undefined の drift として拒否し drop 不能(AD reviewer iteration 1 Major の是正事項 — component-methods.md C2 の必須項)。

### M3: drop の対称(C2)

drop は ownedPaths(stages+tools)を digest 照合のうえ削除。compose⇔drop の対称性テストを必須とする(symmetric-pair-review)。

### M4: 一括 compose verb(C3)

検出した現存ハーネスツリー集合(既存 KNOWN_HARNESS_DIRS 系の検出流儀を再利用)に対し、各 hostRoot で staging 確認 → compose を直列実行。staging(`.amadeus-plugin-src`)不在のツリーは install 起点から staging を先行配置。1ツリー失敗で全体を中断せず、失敗を loud 列挙して exit 非0(fail-closed 集計 — component-methods.md C3)。**verb 命名は本 FD で確定(services.md の「FD で確定」責務の履行)**: 既存 `compose` verb(実文法 `compose [--if-stale] [--project-root <dir>]` — plugin 名の positional は取らず、hostRoot の staging `.amadeus-plugin-src/` に置かれた plugin 群を対象とする。amadeus-plugin.ts の parseCompose 実測)への明示フラグ `--all-harnesses` とする — 新 verb を増やさず(MECE)、`--all-harnesses` は**対象 hostRoot 集合を検出済み全ハーネスへ広げる**(plugin 選択ではない)。フラグなしは従来どおり単一 hostRoot。

### M5: 本 repo への適用(FR-B1 AC)

一括 compose を実行し、全現存ツリーの composition record が composed を示すこと+stage 到達(next がステージを解決)を実測。

## 不変条件

- **I1(u1 前提)**: 配布対象の tools 実体は u1 が移設済みの `plugins/formal-model-check/tools/`(edge block depends_on どおり)。
- **I2(trusted path 拡張は不適用 — 削除)**: ADR-1 Consequences が掲げた「allowlist :35-36 の trusted path 制約へ tools/ を追加」は、reviewer 実測により**機構不適合と確定**した — 当該制約の実体 `trustedPluginStageFile`(amadeus-orchestrate.ts:1204-1225 / amadeus-graph.ts:1997-2030)は `PluginRecord.stageIndex`(`buildStageIndex(m.stages)` :559 — stages のみから構築)の検証専用で、tools パスを渡す呼出しは存在しない(全域 grep で呼出1箇所)。tools 実行時の信頼検査が将来必要になった場合は、実在する呼出し元を特定して具体 M ステップ+テストで導入する(bare な allowlist 行参照はしない)。ADR-1 Consequences へも同根の訂正を申告付きで伝播。
- **I3(zero-plugin 不変)**: plugin なし構成の compose/projection 挙動はバイト不変(既存 t311-zero-plugin-byte-identical が保証 — 破らない)。
- **I4(宣言駆動)**: tools 配布は manifest 宣言分のみ(projection の全走査と混同しない — ADR-1 Alternatives Rejected (a))。

## テスト設計(t379 予約済み)

(1) manifest tools の parse(正常・不正パス拒否・欠落時 []) (2) compose 後の host に tools 実在+digest 記録 (3) drop で tools が消える(対称)+digest 不一致時の拒否 (4) 一括 compose の複数ツリー成功/部分失敗の fail-closed 集計 (5) 配布先自立実行(compose 済み host で runner が bun 実行可能 — FR-A3 AC)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T13:05:36Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: ADR-1 由来 trusted-path 拡張の機構不適合 / Minor 2)→ I2 撤回+上流伝播・シンボル訂正・verb 命名確定で是正、iteration 2 READY(GoA 2)。iteration 2 の Minor 2(非実在の言い過ぎ・compose 実文法)も即時是正済み(全3ファイル、旧文法残存 0 を grep 検証)。UTC 2026-07-31T13:03:59Z

### Findings

- iteration1 Major: I2 trusted-path 拡張は trustedPluginStageFile(stageIndex 専用)に不適用 — 撤回し ADR-1 へ申告付き伝播
- iteration1 Minor: 非実在シンボル引用 — expectRelPath へ訂正(後に『別文脈シンボル』へ精密化)
- iteration1 Minor: verb 命名再先送り — compose --all-harnesses(hostRoot 集合拡大フラグ)で FD 確定
- iteration2 Minor: compose 実文法(positional なし)への訂正 — FD/services 是正済み
