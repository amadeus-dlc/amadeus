# Code Summary — Unit tla-specs-relocation

上流: `code-generation-plan.md`(Step 1〜13)、`functional-design/`(E-1〜6 / BR-1〜15 / L-1〜6)、`inception/requirements-analysis/requirements.md`(FR-1〜9)。トレーサビリティは FR 番号(user-stories は scope 上 SKIP のため FR をトレース先とする)。

## Files created / modified

### Move(FR-1、Step 1)
- `git mv specs/tla → amadeus/spaces/default/specs/tla`(9ファイル、rename 検出済み)
- 自己参照コメント5行を新パス表記へ(BR-7 の許容変更のみ)
- `model-map.json`: path 値5箇所を新正準パスへ + content 変更分の identity 3件を再ピン(下記「判断」1)

### Core(FR-2/FR-3/FR-5/FR-6/FR-7、Step 2-5,7)
- `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` — **E-1 `resolveSpecRoots()` 新設**(cursor 直接読取 seam、safe-name 検証複製、LegacySpecError 単一点検出)+ E-2 正準パス生成(tlaModelPath/tlaCfgPath/tlaModelMapPath/isCanonicalSpecDir)。旧パス値 map は validator reject(BR-13c)
- `packages/framework/core/tools/amadeus-plugin-activation.ts` — watch glob `tla/**`(所有ルート基底)、`specRootForHost` を resolver 委譲、`projectRootForHost` 分離新設、advisory ターゲット表記を動的 specTarget へ(verdict 語彙不変)
- `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` — MODEL_MAP_RELATIVE_PATH 廃止→resolver 経由、テンプレート3箇所は map 宣言値から dir 導出
- `packages/framework/core/sensors/amadeus-model-completeness.md` — matches glob を固定深度形 `**/{amadeus/spaces/*/specs/tla/**,...}` へ(両エンジン実測済み)
- `packages/framework/core/tools/amadeus-advisory-choice.ts`、`packages/framework/core/tools/tla-module-deps.ts`

### Plugin(FR-2/FR-4/FR-7、Step 6)
- `tla-model-loader-internal.ts`(walk-up root 条件から specs/tla 存在チェック除去、resolver 委譲、LegacySpecError→MODEL_MAP_INVALID 変換で非 throw 契約維持)、`tla-evidence.ts`(defaultStoreRoot)、`tla-authoring.ts`(:189 fallback 含む、留保1)、`tla-applicability.ts`、`tla-model-map.ts`(barrel re-export)、`ci-model-check-domain.ts`(isCanonicalSpecMount)、`node-ci-model-check-port.ts:316`(セグメント結合形の追加捕捉)、`run-model-check-diagnostic.ts`、`stages/formal-model-check.md`、`README.md`
- `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` / `tla-module-deps.ts` — **生成鏡像**。手編集せず `bun run build` で byte-identical 再生成(BR-11、guard: t-package-generated-plugin-sources green)

### Docs(FR-8、Step 9 — 英日ペア同期)
- `docs/reference/21-formal-model-following.{md,ja.md}` / `22-formal-model-supply.{md,ja.md}` / `07-sensor-system.{md,ja.md}` / `docs/guide/19-plugins.{md,ja.md}` / `docs/amadeus-files.{md,ja.md}`(layout に `specs/` 追記)

### Tests(FR-9、Step 10-11)
- 既存 51 ファイル + support 4 ファイルを新正準レイアウトへ(fixture 生成・期待値・advisory 文言)
- 新規: `tests/integration/t481-spec-root-resolver.integration.test.ts`(legacy fail-closed・新旧両存・space 解決・鏡像同一挙動)、`tests/unit/t482-legacy-model-map-paths.test.ts`(旧パス値 reject + 非 default space 受理の正対照)

## Key implementation decisions

1. **identity 再ピン**(plan からの deviation): 自己参照コメント5行の書換はコンテンツ変更のため、content-based identity は該当3件(MirrorLifecycle.tla/cfg、MirrorLifecycleCore.tla)を再計算。FormalElection 2件は content 不変で identity 一致を実測(パス移動で identity が変わらないことの実証)。BR-8 の「不変」はパスのみの移動に適用される記述であり、FR-5 の「digest 再ピン込み」と整合
2. **validator pin の形**: 「生成値完全一致」から「canonical dir 形状+ファイル名一致」へ(pure parser が space を知り得ないため。`<space>` は safe-name 任意値を許容し multi-space の一般形を潰さない。旧パス reject の BR-13c は維持)
3. **`projectRootForHost` 分離**: `specRootForHost` が `amadeus-advisory-declaration.ts` で project root として流用されていたため、返り値変更の影響遮断のため分離新設
4. **セグメント結合形の捕捉**: `node-ci-model-check-port.ts:316` の `join(root,"specs","tla")` はリテラル grep をすり抜ける形で RE scan 列挙外だったが、CI runner の実 mount 生成箇所として必須変更(同型を tests でも走査済み)

## Test coverage summary(Step 12 前時点)

- 変更対象スイート: **659 pass / 0 fail / 3 skip(pre-existing docker-env gates)/ 53 ファイル**(unit 286、integration 334、e2e 19 + 新規 t481/t482 含む)
- `bun run typecheck` exit 0、`bun run lint` exit 0(443 warnings = cognitive-complexity baseline、新規エラーなし)
- 落ちる実証: (a) t481(legacy fail-closed)、(b) t320(新パス drift 発火)、(c) t482(旧パス値 reject)
- 鏡像 guard(t-package-generated-plugin-sources)3 pass
- 実リポジトリ end-to-end: loadVerifiedTlaSources green、sensor CLI `{"pass":true}`
- 旧パス残存ヒット: 10 hits / 6ファイル、すべて正当(移設手順メッセージ本文・fail-closed 説明コメント・レガシー検出テストの入力)

## Deviations from plan

- 上記「判断」1/2/3/4(plan Step 2/3/6 の実装形の具体化)。計画外の追加変更は `node-ci-model-check-port.ts:316` のみ(判断4)
- Step 12 の隔離2回ビルド再現性・source-only:check・グラフ不変量は build-and-test ステージで実施
