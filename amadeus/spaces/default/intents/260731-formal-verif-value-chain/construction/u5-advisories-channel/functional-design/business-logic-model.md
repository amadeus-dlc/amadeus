# Business Logic Model — u5-advisories-channel

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u5 は advisory の機械消費チャネル(FR-B2)と発火点3点+run 単位ラッチ(FR-B3)を実装する Unit(unit-of-work.md の u5、components.md の C4+C5、component-methods.md の C4/C5 節、services.md の next 行、decisions.md ADR-5)。

## 判定・変換のモデル

### L1: activation 判定(既存 — 変更なし)

`activationAdvisoryForHost` の3値判定(changed / never-run / current)と fail-closed 方針(:155/:192 — 不明時は never-run 側)は不変。第1ゲート(compose 済みか :230)も不変。

### L2: 構造化(新規)

判定結果を `Advisory = { plugin, code: "changed" | "never-run", message, stage }` へ構造化する(ADR-5)。
- `plugin`: 発火元プラグイン名(現状 formal-model-check 固定だが型は一般)
- `code`: 判定3値のうち発火2値と 1:1(current は Advisory を生成しない)
- `message`: 従来の stderr 1行文面と同一文字列(既存文面 :209/:211 を再利用 — 文言変更なし)
- `stage`: 発火点のステージ slug(どのチェックポイントで出たか)

### L3: 発火点集合(変更)

`ACTIVATION_ADVISORY_STAGE = "build-and-test"`(単一定数 :1293)→ `ACTIVATION_ADVISORY_STAGES = {"requirements-analysis", "functional-design", "build-and-test"}`(集合)。emit ガード(:1306)は集合 membership 判定へ。CP1(requirements-analysis)= 要件矛盾の上流検出、CP2(functional-design)= 設計矛盾の検出、build-and-test = 最終安全網(Q3=A 裁定)。

**発火経路は2つ**(reviewer iteration 1 の実測指摘による精密化): 主経路 `emitForSlug`(amadeus-orchestrate.ts:3347-3363、handleNext の2分岐 :2797/:2823 から呼出)に加え、**`--single` 経路 `emitSingleRunStage`(:3390)にも同じ advisory 配線を追加する** — stage-runner スキル(/amadeus-requirements-analysis 等 = `--single` パッケージング)で CP1/CP2 が無音不発になる穴を塞ぐ(価値不達の再演防止)。「単一呼出し site」前提はこの2経路化で完全に失効するため、ラッチ(L4)が両経路をまたいで重複を抑止する。

### L4: run 単位ラッチ(新規)

述語: `latched(runtimeDir, plugin, code) → bool`。同一 (plugin, code) の Advisory は同一 run で1回だけ emit(2回目以降は L2 生成をスキップ)。ラッチ実体は machine-local runtime(gitignored、hooks-health 系と同じ置き場)— record を汚さない(ADR-5)。run の境界はラッチファイルの置き場のライフサイクル(セッション/intent runtime)に従う。

### L5: 出力合成(変更)

- stdout: directive JSON へ `advisories: Advisory[]` を追加(**非空時のみフィールドを載せる** — 空配列は載せない)。
- stderr: 従来の1行出力を併用維持(message をそのまま出す — 既存挙動の保存)。
- stage-protocol.md へ「directive.advisories が載っていたら conductor はユーザーへ提示する」規範を追記(FR-B2)。

## 不変条件

- **I1(バイト純度)**: advisories 追加後も stdout は単一の valid JSON。既存 directive 消費側の parse を壊さない — 実装前に消費側棚卸し(repo grep)必須(FR-B2 AC、R-3)。
- **I2(沈黙の保存)**: current 判定・非発火ステージ・compose 未済ホストでは advisories フィールド自体が現れない(現状の無出力挙動と同型)。
- **I3(fail-closed 維持)**: 判定不能時は never-run 側(発火側)に倒す既存方針を変えない。
- **I4(ラッチの局所性)**: ラッチ状態は commit 面に混入しない(gitignored 配下のみ)。

## 実行フロー(テキスト)

next 呼出 → ステージ解決 → slug ∈ ACTIVATION_ADVISORY_STAGES? → yes → activationAdvisoriesForHost(hostRoot) → 判定 changed/never-run → latched? → no → Advisory 生成+markAdvisoryEmitted → directive.advisories へ合流+stderr 1行 → stdout emit

<!-- Text fallback: 上記は左から右への単方向フロー。latched=yes / current 判定 / 非発火ステージ / compose 未済はいずれも「advisories なし」へ合流 -->

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T12:25:55Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: --single 経路の発火漏れ未申告 / Minor: 上流2件の本文未参照)→ 2経路配線+実参照追記で是正、iteration 2 READY。新規 Minor(stale コメント :1297-1299 の実装時改訂)は BR-U5-7 として反映済み。reviewer のスコープ外読取2件(iteration 1 自己申告)は diary へ記録。UTC 2026-07-31T12:25:03Z

### Findings

- iteration1 Major: emitSingleRunStage が advisory を呼ばず stage-runner スキルで CP1/CP2 無音不発 — 方針(b) 2経路配線で是正
- iteration1 Minor: services.md/component-methods.md の本文未参照 — 実参照追記で是正
- iteration2 Minor(非ブロッキング): :1297-1299 stale コメントの実装時改訂 — BR-U5-7 追加で受理
