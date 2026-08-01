# Units of Work — 260801-tla-multi-model

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements(stories は user-stories ステージが本 intent のスコープ外で未生成のため consume なし)

components.md の C1〜C10 を、component-dependency.md の依存グラフと decisions.md の ADR-1〜ADR-10 に沿って **5 Unit** へ編成する(設計ハンドオフの U1〜U5 案を踏襲。境界の変更なし)。requirements.md の FR-1〜FR-6 と各 AC(red 実証4点を含む)の帰属を本ファイルで確定する。Bolt 編成・実装順の経済的裁定は Stage 2.8 delivery-planning の責務 — 本ファイルは構造(依存 DAG)のみを定める。walking skeleton は **off**(team-practices 確定・ADR-9)— Bolt 1 も通常の機能 Bolt として走る。

## u1-schema-resolver(C1+C2)

- 内容: C1 — model-map スキーマ拡張(`ModelMapModel` へ optional `auxiliaries` / `vocabulary` 追加、`exactObject` 許可キー集合の両形対応、aux 各要素の canonical identity 検証、byte-identical 2 複製の同時更新)。C2 — 新規 `tla-module-deps.ts`(EXTENDS/INSTANCE 行ベース抽出・推移閉包・fail-closed 境界)。
- 対応 FR: FR-1、FR-2(リゾルバ基盤)。decisions.md ADR-1 / ADR-3 / ADR-7 準拠。公開シグネチャは component-methods.md C1/C2 節どおり。
- 所有ファイル(exact paths):
  - `plugins/formal-model-check/tools/tla-model-map.ts`(拡張)
  - `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`(拡張、byte-identical 維持)
  - `packages/framework/core/tools/amadeus-formal-verif-model-map.ts`(拡張、byte-identical 維持)
  - `plugins/formal-model-check/tools/tla-module-deps.ts`(新規)
- 依存: なし(起点 Unit)。
- 見積り: S〜M(新規1ファイル+既存3ファイルの optional 拡張)。
- AC(本 Unit 単独で達成可能):
  1. **schema mismatch red**: `auxiliaries` の未知キー混入・空配列・specs/tla 境界外パス・非 canonical identity を含む model-map が `exactObject` / `parseAssetIdentity` 相当で**落ちる実証**(負例全件赤)。
  2. aux 正例(domain `amadeus.formal-verif.tla.module.v1` の canonical identity 宣言)が緑。省略時の既存2モデルのパース結果・identity 値は byte 不変(成功 iii)。
  3. リゾルバが MirrorLifecycle.tla:31-32 型(改行跨ぎ WITH 代入含む)から `MirrorLifecycleCore` を解決し、行コメント・ブロックコメント内の偽 EXTENDS/INSTANCE を検出しない(偽赤・偽緑の落ちる実証)。specs/tla 外・存在しないモジュール・循環参照は明示失敗。
  4. byte-identical 2 複製が同一 byte で更新され、`bun run typecheck` / `lint` / 既存テスト green(patch gate 0-hit 不許容)。

## u2-loader-generalization(C3)

- 内容: C3 — loader 一般化。`verifyRegisteredAssets` の全登録モデル化(実行モデル skip 撤廃)+ aux 照合 + C2 推移解決との宣言照合(loader 側検出点、双方向不一致を赤)+ `VerifiedTlaSource` → 全モデル配列への改訂(`TLA_EXECUTION_MODEL_NAME` 等の固定導出撤廃、`selectVerifiedModel` 相当の絞り込み)。interaction 契約は services.md S1 どおり。
- 対応 FR: FR-2(loader 側赤化)、FR-4(実行選択)、FR-6(照合基盤)。ADR-2 / ADR-4 準拠。
- 所有ファイル:
  - `plugins/formal-model-check/tools/tla-model-loader-internal.ts`(改訂)
  - `plugins/formal-model-check/tools/tla-model-loader.ts`(改訂)
- 依存: u1(C1 スキーマの aux 宣言形と C2 リゾルバを消費)。
- 見積り: M(検証面の意味改訂+無引数ピンの改訂追随)。
- AC:
  1. **declaration-mismatch red(loader 側)**: MirrorLifecycle 仮宣言で宣言漏れ・過剰宣言の両方向について loader 検証が**落ちる実証**(SOURCE_DRIFT 系の明示失敗、双方向)。
  2. 無引数 loader が「全登録モデルの検証済みソース配列」を返す。未登録モデル名の選択要求は明示失敗(NFR-2、silent fallback なし)。
  3. 無引数ピン(t-formal-verif-tla-model-loader.test.ts:10-13)が FR-4 確定裁定どおり改訂され、FormalElection の identity 照合結果は変更前後で不変(成功 iii の pin)。
  4. 既存テスト green + patch gate 充足。

## u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

- 内容: C4 — `TLA_NAMED_INVARIANTS` / `TRACE_STATE_VARIABLES` / トレースラベル regex / 反例変数列検証 / `hasFrozenModelOutputBinding` のモデル別語彙供給化(語彙源は model-map.json の optional `vocabulary`、toolchain は loader 経由でのみ受領)。C5 — byte-pin 照合の要求モデル選択一般化。C8 のうち **FormalElection エントリへの vocabulary 追加**(現行7件 invariant + TRACE_STATE_VARIABLES を値不変で移管。identity 値・entries 配列・パース結果は不変 — ADR-3 / ADR-10)。
- 対応 FR: FR-4、FR-6(語彙値 pin)。ADR-5 / ADR-6 準拠。公開面は component-methods.md C4/C5、配給フローは services.md S2/S3 どおり。
- 所有ファイル:
  - `plugins/formal-model-check/tools/tla-arm.ts`(一般化)
  - `plugins/formal-model-check/tools/tlc-toolchain.ts`(一般化)
  - `plugins/formal-model-check/tools/run-model-check-source.ts`(一般化)
  - `specs/tla/model-map.json`(FormalElection vocabulary フィールド追加のみ — MirrorLifecycle 面は u4)
- 依存: u1(vocabulary optional フィールドのスキーマ受入が前提)。
- 見積り: M(語彙供給経路の切替+pin 維持)。
- AC:
  1. FormalElection に供給される語彙値(invariant 7件・TRACE_STATE_VARIABLES・ラベル)が現行定数と一字一致(pin テスト、FR-6)。frozen model receipt identity 不変(`hasFrozenModelOutputBinding` 系 pin は据置き・変化時に落ちる)。
  2. vocabulary 省略モデルの TRACE 解析要求が明示失敗(fail-closed の落ちる実証)。未知 invariant 名の拒否は従来どおり。
  3. byte-pin 照合が要求モデル名で選択され、未登録モデル要求は明示失敗。既存の照合 semantics(誤バイトは赤)は不変。
  4. 既存テスト green + patch gate 充足。

## u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

- 内容: C7 — sensor `check` / `updateModelMap` の第2検出点(C2 リゾルバ共有、不一致を sensor 赤 / updateModelMap 補正、aux identity は domain 付き canonical で loader と同一アルゴリズム)。C8 のうち **MirrorLifecycle エントリ**への `auxiliaries`(MirrorLifecycleCore.tla の canonical identity pin)+ vocabulary(3件 invariant)宣言。
- 対応 FR: FR-2(sensor 側赤化)、FR-3。ADR-2 / ADR-6 / ADR-7 準拠。
- 所有ファイル:
  - `packages/framework/core/tools/amadeus-sensor-model-completeness.ts`(拡張)
  - `specs/tla/model-map.json`(MirrorLifecycle auxiliaries+vocabulary 追記)
  - model-map.json entries sha256 の連動更新(`updateModelMap --impl-only` 経路、component-dependency.md 共有資源節どおり — implementation entries 変更に伴う drift pin 更新)
- 依存: u1(リゾルバ・スキーマ)、u2(loader の aux 照合が宣言 pin と整合する前提)。
- 見積り: S〜M(検出点1面+宣言追記+impl-only 書戻し)。
- AC:
  1. **Core semantic edit red**: MirrorLifecycleCore.tla への意味論編集で drift ガード(loader 照合)が**落ちる実証** — 成功 (ii) の直接証拠。
  2. **declaration-mismatch red(sensor 側)**: 宣言漏れ・過剰宣言を sensor `check` が赤、updateModelMap が宣言を機械補正する落ちる実証(loader 側とは別検出点、ADR-2 の二重化)。
  3. MirrorLifecycle の aux identity 値が updateModelMap 計算値と loader 照合値で一致(同一アルゴリズムの実証)。
  4. AsImplemented / Vacuity は不変(Out of scope A2 の非接触を grep で証明)。既存テスト green + patch gate 充足。

## u5-ci-all-models-measure(C6+C9+C10)

- 内容: C6 — CI ポート/診断/スケルトンの引数化・全登録モデル反復(`run` 既定=全モデル逐次、per-model evidence `<root>/<model-name>/`、`verify` 全モデル検査、skeleton はモデル選択のみ引数化し frozen 生成は FormalElection 語彙のまま)。C9 — ci.yml ジョブのステップ名・サマリの複数モデル追随(workflow_dispatch / permissions / timeout 30 分は不変)。C10 — stage doc の実装追随(実装先行)。
- 対応 FR: FR-4(CI 面)、FR-5。ADR-8(measure-first)準拠。
- 所有ファイル:
  - `plugins/formal-model-check/tools/node-ci-model-check-port.ts`(引数化)
  - `plugins/formal-model-check/tools/run-model-check-ci.ts`(全モデル反復)
  - `plugins/formal-model-check/tools/run-model-check-diagnostic.ts`(引数化)
  - `plugins/formal-model-check/tools/run-skeleton-ci.ts`(引数化)
  - `.github/workflows/ci.yml`(formal-model-check ジョブ、:508-564)
  - `plugins/formal-model-check/stages/formal-model-check.md`(doc 追随)
- 依存: u2(全モデル loader)、u3(語彙供給 — MirrorLifecycle 実行に必須)、u4(MirrorLifecycle 宣言+pin が CI 実行の前提)。
- 見積り: M(4ツール+CI+doc。実測待ちの壁打ち時間を含む)。
- AC:
  1. **both-models injection red**: FormalElection / MirrorLifecycle の**両モデル**で注入変異に対し TLC 検証が**落ちる実証**(#1920 AC)。
  2. **CI green 実測**: formal-model-check ジョブが全登録モデルを逐次実行し、MirrorLifecycle AsIntended を完全探索(completion marker + state 統計、基準 208,628 states / 89,099 distinct / depth 18、D3)で green — **実測証跡を record へ固定**(ADR-8。30 分 timeout 超過時のみ time-box 後続裁定へエスカレーション、本 Unit で勝手に緩めない)。
  3. `run --model <name>` の単一絞り込みが機能し、未登録名は明示失敗。per-model evidence ディレクトリ構造の pin。
  4. stage doc 記述が実装 semantics と一致(doc 先行解消)。既存テスト green + patch gate 充足。ci.yml の permissions/if/timeout 差分なし(NFR-3、D-制約 C2)。

## テスト割当(改訂 vs 新規)と 27 ファイル仕分け

component-dependency.md の仕分け原則(**単一モデル前提の固定のみ改訂、参照として正しいものは維持**)を 27 ファイルへ確定適用する。

- **改訂(前提が変わる)**:
  - `tests/unit/t-formal-verif-tla-model-loader.test.ts`(:10-13 無引数ピン → 全モデル配列意味へ改訂)— u2
  - `tests/unit/t-formal-verif-model-map-v2.test.ts`(aux/vocabulary 正例 + exactObject 負例拡張。既存ケース期待値は不変)— u1
  - `tests/unit/t-formal-verif-tlc-toolchain.test.ts` / `tests/unit/t-formal-verif-tlc-output.test.ts`(語彙のグローバル定数前提 → vocabulary 供給経由へ追従。期待語彙値は不変)— u3
  - `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` / `t-formal-verif-run-model-check-source.integration.test.ts`(全モデル化・byte-pin 選択の追従)— u2 / u3
  - `tests/integration/t-formal-verif-node-ci-model-check-port.integration.test.ts` / `t-formal-verif-run-model-check-diagnostic.integration.test.ts` / `t-formal-verif-ci-workflow.integration.test.ts` / `t-formal-verif-run-model-check.integration.test.ts` / `t-formal-verif-ci-model-check-runner.integration.test.ts`(引数化・全モデル駆動への追従)— u5
  - `tests/formal-verif/support/` 3 ファイル(tla-mutation-probe / tla-real-toolchain-probe / tla-toolchain-harness)— 両モデル注入 red の probe 一般化。u5
- **維持(変更したら落ちる検査として据置き)**: frozen model receipt / `hasFrozenModelOutputBinding` 系、FormalElection identity 期待値、t380 impl-only updateModelMap 統合、t-formal-verif-mirror-model-registration、t-formal-verif-model-completeness-sensor 系の現行合格面、activation 系(t320/t321/t322/t378/t381/t382)、t-formal-verif-canonical-core、e2e 2 ファイル、planned-tlc-runtime / tlc-runtime / run-model-check-real(参照として正しい面は期待値不変 — 実走系が語彙供給切替で落ちる場合は「維持」ではなく u3 改訂へ再仕分けし code-summary に記録)。
- **新規(採番予約 — 現行最大 t401、次の空きから連番)**:
  - **t402** = u1 リゾルバ推移解決(単体。偽 EXTENDS 誤検出・境界外 fail-closed 含む)
  - **t403** = u2 loader 宣言不一致 red + 全モデル配列契約(単体)
  - **t404** = u3 語彙供給 pin(FormalElection 語彙値一字一致 + vocabulary 省略モデルの明示失敗)(単体)
  - **t405** = u4 Core 意味論編集 red + sensor 宣言不一致 red(統合)
  - **t406** = u5 両モデル注入 red + 全モデル CI 駆動(統合。実測証跡の assert 含む)
- patch coverage ゲート(team-practices Testing Posture): 全 Unit で変更行 0-hit 不許容。テストは修正と同 PR で運ぶ。

## Unit 横断の共通契約

- 各 Unit は TDD 既定(team-practices)。dist/・`.kimi-code/` 等の生成ツリーは各 Unit の最後に `bun scripts/package.ts` 再生成で追随(手編集禁止)。plugin tools が self-install 配布対象かは実装時に code-structure.md 現在節で確認(requirements Constraints)。
- 1 Unit ≠ 1 Component の対応: C8(model-map.json 宣言)は u3(FormalElection vocabulary)と u4(MirrorLifecycle auxiliaries+vocabulary)へ意図的に分割した — 同一ファイルを2 Unit が触るため、**u4 は u3 の map 変更を前提に追記する**(同一行の同時編集は発生しない: 別エントリ)。それ以外は 1 Unit = 1 Component 群。
- コメント・doc は日本語、コミットは英語 conventional(requirements Constraints)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T20:31:51Z
- **Iteration:** 1
- **Scope decision:** none

All C1-C10 owned by exactly one unit, FR-1..FR-6 covered, all six red-proofs/pins assigned, DAG acyclic and consistent, test triage matches the 27-file rule, skeleton off respected. Findings: none.

### Findings

- None
