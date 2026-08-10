# Units of Work — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: units-generation (2.7) / **Depth**: Standard

上流入力(consumes 全数): `components.md`(C1-C6 の改訂単位と規模割付 — Unit への束ね方の正本)、`component-methods.md`(C3 の新判定関数2つと C4 の assert 面 — U2 の作業内容)、`services.md`(実行時役割 — Unit が常駐サービスを持たないことの確認)、`component-dependency.md`(C1 根の無循環依存 — Unit 間依存の導出元)、`decisions.md`(ADR-1/2/3 — U1/U2 の実装様式の確定済み前提)、`requirements.md`(FR 22件 — 各 Unit の受け入れ基準の正本)。

## Unit 一覧

「片側だけでは利用者価値を出荷できない境界は単一 Unit へ統合」(cid:units-generation:c1 (a))に従い、C1/C2/C5(規律の正本・参照面・standalone 入口)は分離すると「protocol は新しいが選択画面とスキルが旧仕様」という非出荷可能な中間状態を作るため単一 Unit に統合する。C3+C4(センサー+契約テスト)は write⇔check の対で分離不能。C6+検証は投影の一括 sweep。

| Unit | kind | 含むコンポーネント | 対応 FR | 規模見積り(components.md の割付から機械合算) | 複雑度 | Deployment model |
|---|---|---|---|---|---|---|
| U1 `protocol-core` | spec | C1(grilling-protocol 正本)+ C2(stage-protocol 参照面)+ C5(standalone スキル) | FR-PROTO-1〜10、FR-CONTRACT-1/2/5、FR-PROJ-1、FR-CONTRACT-6(暫定 — t415 最小差し替えのみ。完全化は U2) | 185-310行差分(C1 140-210 + C2 25-60 + C5 20-40) | **L**(骨格逐語+overlay の全面改稿・被参照最多) | N/A — 配布物(protocol/skill md)であり実行体を持たない。配布は既存 self-install/dist 再生成経路(FR-PROJ-4)に乗る |
| U2 `budget-sensor` | **library** | C3(question-budget センサー)+ C4(契約テスト) | FR-CONTRACT-3/4/6(+FR-PROTO-8 / FR-PROTO-7 の検査面 AC — U1 定義の遮断器・刈りノード列挙を U2 の述語が検査する straddle) | 100-240行差分(C3 40-90 + C4 60-150) | **M**(既存単一ファイルへの判定関数2つ+テスト3態) | N/A — standalone runtime を持たない検査モジュール(既存センサー dispatcher が embedded 実行)。kind=library は §12a i1 FOLLOW-UP を受けた変更(service は scalability/reliability 系 produces_kinds を不要に誘発するため) |
| U3 `projection-sweep` | packaging | C6(prose/docs 投影)+ FR-PROJ-4(build・source-only・隔離2回・t199) | FR-PROJ-2/3/4 | 20-40行差分+検証実行 | **S**(機械的語彙置換+検証コマンド実行) | N/A — docs/prose の同期であり deployment 実体なし。配布検証(build 再生成)自体が本 Unit の作業 |

Unit 外(運用・検証手順、components.md の注記どおり): FR-DOG-1(dogfood 実走 — build-and-test 段の受け入れ実走)、FR-LAND-1(着地後報告 — workflow 完了後の手順)。

## 各 Unit の完了条件(FR の AC を束ねたもの)

- **U1**: 骨格マーカー間テキストがピン原文と diff 空(FR-PROTO-1)/ 帰属 SHA 1 hit(FR-PROTO-2)/ overlay 分離(FR-PROTO-3)/ rounds・frontier・枝刈り表・遮断器・刈りノード列挙・annex 写像・D3/D4 接続の規定実在(FR-PROTO-4〜10)/ stage-protocol の Step 3d 改訂・§8 接続段落・semi 除外明文(FR-CONTRACT-1/2/5)/ SKILL.md のレベル引数と Free 既定(FR-PROJ-1)。
- **U2**: センサー3態テスト(マーカー付き超過+記録あり=PASS / 記録なし=FAIL / 未知 depth=warning)の落ちる実証込み green(FR-CONTRACT-4)/ VALID_DEPTH_VALUES 3値 assert(FR-CONTRACT-3)/ t415 改訂の対角実測 — 改訂後 t415 × 改訂後正本 = green、改訂前 t415 × 改訂後正本 = 赤(FR-CONTRACT-6)/ 遮断器発火の落ちる実証(FR-PROTO-8 AC)。
- **U3**: `git grep -in "one question at a time"` 0 hit・対訳キー 0 hit・hybrid 系 0 hit(FR-PROJ-2/3)/ `bun run build`・`bun run source-only:check`・隔離2回ビルド・t199 の exit 0 実測(FR-PROJ-4)。

## 独立実装可能性の検証(cid:units-generation:c1 (b))

- U1 は単独で「新しい grilling 規律一式」を出荷可能(センサー・sweep なしでも protocol/スキル/選択画面が一貫)。
- U2 は U1 の確定文言に依存(pin 対象)— U1 完了後は単独実装可能。U2 なしの U1 は機械検査が旧仕様のまま残るが、センサーは advisory であり旧検査は grilling マーカー不在ファイルに対して従来どおり正しく動く(壊れた中間状態にならない)。
- U3 は U1 の語彙確定に依存 — U1 完了後は単独実装可能。
- PR 粒度: 1 Unit = 1 Bolt = 1 PR を既定(team.md Way of Working)。編成は delivery-planning で確定。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T05:40:18Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY(GoA 5): FR 22件被覆・edge block 機械妥当性(parseUnitsBlock 実読照合)・依存・規模合算は健全。BLOCKER 1件 = stage Step 6 必須項目(Deployment model per unit / S/M/L/XL 複雑度)が unit-of-work.md に欠落。FOLLOW-UP: U2 kind=service は根拠薄弱(library が実態・多数派で、produces_kinds の下流波及も小さい)。NIT 2件(依存文書の自己矛盾表現・FR-PROTO-7 straddle 未注記)

### Findings

- BLOCKER | unit-of-work.md が units-generation.md:112-114 の必須項目(Deployment model per unit / Relative complexity S/M/L/XL)を欠く — N/A 判断も未記録
- FOLLOW-UP | U2 kind=service は library が実態に近い(センサーは standalone runtime を持たない検査モジュール、他 intent の多数派分類も library。produces_kinds 経由の下流波及を考慮)
- NIT | unit-of-work-dependency.md:30 の「制約は無し — ただし…」の自己矛盾表現の言い換え
- NIT | FR-PROTO-7 の U2 への AC straddle が FR-PROTO-8 と異なり未注記

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T05:44:14Z
- **Iteration:** 2
- **Scope decision:** none

READY(GoA 2): i1 の BLOCKER(複雑度 S/M/L/XL・Deployment model 列+N/A 根拠)と FOLLOW-UP(U2 kind=library 変更、edge block 同期、UNIT_KINDS 閉語彙内を実読照合)、NIT 2件すべて閉包確認。kind 変更の新規矛盾なし。留保: library の produces_kinds 実適用は次段(nfr-design)で再確認

### Findings

- FOLLOW-UP | kind=library の produces_kinds 実適用(nfr-design の適用成果物集合)は次段で再確認する — units-generation 段では未観測
