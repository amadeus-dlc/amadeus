# Units of Work — formal-verif-value-chain

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

components.md の C1〜C10 を、**独立に実装可能**な境界(units-generation:c1 (a))で 8 Unit へ編成する。Bolt 編成(粒度は 2.8 の設問)と PR 粒度は delivery-planning が決める — 本ファイルの責務は構造(依存 DAG)のみ(2026-07-31 ノルム改訂 #1842 に伴う表現追従。Unit 分割自体は不変)。依存は component-dependency.md の依存グラフを継承し、規模見積りは components.md の数値を按分する。

## u1-runner-relocation(walking skeleton)

- 内容: C1(24 ファイル移設+ADR-2 model-map 複製同伴+drift check 配線)+C10 の CI パス付け替え(FR-A4)+stage 本文の参照書き換え(FR-A2)+dist 7 ハーネス再生成。
- 対応 FR: FR-A1 / FR-A2 / FR-A4。AC(u1 単独で達成可能な条件に限定): 分類 A/B/C の 24 ファイルが `plugins/formal-model-check/tools/` に実在し `bun` で runner 実行可、CI が移設後パスで意味論不変に green、grep AC 4面(plugin 配布面)0 件。`scripts/formal-verif/` ディレクトリの非存在は u2 の AC(分類 D 30 ファイルが残るため u1 時点では存在する — 中間状態として正常)。
- deployable 根拠: このユニットだけで「プラグイン所有ツリーから runner が e2e で回る」— walking skeleton の薄スライス(scope Q1 裁定)。
- 見積り: 移設 24+複製 1、実質 diff は参照書き換え+drift 配線(数十行)+dist 再生成。

## u2-residue-deletion

- 内容: C10 の削除面 — 分類 D 30 ファイル+参照テスト・fixture・support の削除、complexity-baseline 20 件除去、allowlist 該当エントリ整理、分類 A 台帳エントリの機械 remap(FR-A5)。
- AC: 削除後 `bash tests/run-tests.sh --ci` green、台帳 stale 0、`test -d scripts/formal-verif` exit 1(ディレクトリ完全消滅は本 Unit で達成)。
- deployable 根拠: 削除単独で CI green を保つ(到達不能コードの純減)。

## u3-boundary-guard

- 内容: C6 — t377 境界ガード新設(AC 4面の全数検査、落ちる実証+corpus sweep)。
- 対応 FR: FR-A6 / NFR-5。
- deployable 根拠: ガード1本の追加で単独 PR として意味が閉じる。

## u4-tools-distribution

- 内容: C2(manifest `tools` フィールド+compose 書込+digest 対称拡張+drop 対称)+C3(一括 compose verb)+本 repo 全現存ツリーの compose 実施(FR-B1 AC)。
- 対応 FR: FR-A3 / FR-B1。ADR-1 準拠。
- deployable 根拠: C2/C3 は同一モジュール群(compose/plugin CLI)で、配布機構+その利用が1 PR で閉じる。

## u5-advisories-channel

- 内容: C4(advisories 構造化フィールド+stage-protocol 追記)+C5(発火点3点+run 単位ラッチ)。
- 対応 FR: FR-B2 / FR-B3。ADR-5 準拠。
- deployable 根拠: orchestrate/activation の同一クラスタで、チャネル+発火点が対で初めて価値になる(片側だけでは出荷不可 — units-generation:c1 の統合則)。

## u6-impl-only-path

- 内容: C7 — `updateModelMap --impl-only`+監査行+MODEL_UNCHANGED 案内文面+センサー manifest 文書同期。
- 対応 FR: FR-D1 / FR-D2。
- deployable 根拠: #1510 の閉包が1 PR で完結。

## u7-mirror-model

- 内容: C8(model-map v2 スキーマ+MirrorLifecycle.tla/.cfg+model-map エントリ登録+TLC 完走+落ちる実証)+C9(モデル工程文書)。
- 対応 FR: FR-C1 / FR-C2 / FR-C3。ADR-3 / ADR-4 準拠。
- deployable 根拠: モデル+工程文書で「新規プロトコルへの供給工程」が初めて利用可能になる。

## u8-e2e-acceptance(検証専用 Unit — Q1 裁定)

- 内容: FR-E1〜E3 の e2e audit 実測(実 spec 変更→advisories 消費→ステージ起動→検証結果到達、CP1/CP2 両貫通、mirror モデル到達)+発見不具合の glue 修正+実測記録の record 固定。
- 対応 FR: FR-E。機構テスト green のみでの完了不可の執行点。
- deployable 根拠: コード出荷はないが本 intent の完了定義そのもの — 前 intent の盲点(価値不達のまま成功扱い)の再発防止として独立 Bolt 化(ユーザー裁定 2026-07-31)。

## Unit 横断の共通契約

- **C10 の分割申告**: components.md の C10(CI 付け替え+残骸削除)は u1(CI 付け替え = FR-A4)と u2(残骸削除 = FR-A5)へ意図的に分割した — CI 消費の付け替えは移設と不可分(u1)、削除は独立に CI green を保てる純減(u2)のため。1 Unit ≠ 1 Component の対応はこの1件のみ。

- 各 Unit は TDD 既定(NFR-2、純移設・純削除は適用外だが前後 green+drift 必須)、dist 7 ハーネス同期(NFR-3)、台帳 remap(NFR-4)。
- テスト採番: u3=t377 / u5=t378(advisories)+t381(発火点ラッチ)/ u4=t379 / u6=t380(decisions.md の予約どおり)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:30:58Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: u1 AC が u1 境界で達成不能 / Minor: C10 分割無申告)→ AC 帰属是正(u1→u2 移動+requirements 同期是正・申告付き)+分割申告 → iteration 2 READY(GoA 1)。UTC 2026-07-31T10:30:25Z

### Findings

- iteration1 Major: u1 AC の test -d 非存在主張が u2 完了前提 — u1 単独達成可能条件へ限定し u2 AC へ移動、FR-A1/A5 も申告付き同期是正
- iteration1 Minor: C10 の u1/u2 分割無申告 — Unit 横断の共通契約へ明示申告
