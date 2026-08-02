# Code Generation Plan — u3-vocabulary-supply

上流入力(consumes 全数): `../functional-design/business-logic-model.md` / `business-rules.md` / `domain-entities.md`、`../nfr-requirements/`(5件)、`../nfr-design/`(5件)、`../../../inception/units-generation/unit-of-work.md`(u3 節・AC1〜4・テスト割当節)、`../../u2-loader-generalization/functional-design/domain-entities.md`(VerifiedTlaSources / VerifiedModelSource / selectVerifiedModel の受け口型)

## 目的

FormalElection の語彙(named invariants 7件・trace state variables 7件)をコード定数から model-map.json の `vocabulary` 宣言へ移管し(唯一の源、ADR-6)、arm / toolchain / byte-pin をモデル別語彙供給へ一般化する(FR-4 / FR-6)。frozen model receipt identity・TLC grammar semantics・失敗分類は不変(ADR-10 / NFR-1)。

## 前提の確認(u2 未着地)

本 Bolt の worktree には u2 の loader 一般化が**未着地**(loader は単数形 `loadVerifiedTlaSource()` / `VerifiedTlaSource` のまま、shim ではなく旧実装そのもの)。したがって:

- 語彙解決(`namedInvariantsFor` / `traceVocabularyFor`)は u1 の `ModelMapModel` のみに依存する純粋関数として完全実装できる。
- loader 選択面は **今日コンパイルが通り、かつ u2 着地時に最小差分で複数形 API へ置き換わる構造**にする。tla-arm.ts / run-model-check-source.ts の該当箇所に MERGE-NOTE コメントを残し、code-summary にマージ調整事項を記録する。shim は存在しないため除去対象なし(単数 API は u2 が shim 化して残す想定 — その除去も u3 のマージ時責務として記録)。

## 実装計画(実行順)

1. `specs/tla/model-map.json`: FormalElection エントリへ vocabulary 追加(7+7、現行定数と順序含め一字一致。identity 値・entries・MirrorLifecycle エントリ不変 — BR-P4)
2. `tla-arm.ts`: `TLA_NAMED_INVARIANTS` / `TlaNamedInvariant` 削除、`namedInvariantsFor` 新設(vocabulary 省略は MODEL_MAP_INVALID)、receipt キー型 `Record<string, …>` 緩和、invariantMap / invariantRhs / generateFrozenTlaModelFromSource / validateFrozenTlaModelReceipt の語彙引数化、frozen 生成は FormalElection 明示固定(ADR-10)のまま loader 語彙から供給
3. `tlc-toolchain.ts`: `TRACE_STATE_VARIABLES` 削除、`TraceVocabulary` / `traceVocabularyFor` / `traceLabelPattern`(escapeRegExp 埋込み)新設、`TlcOutputInput.vocabulary` 必須化、parseTrace / counterexample / initial-state 反例の 6 箇所を語彙参照へ、`hasFrozenModelOutputBinding` は一字不変(コメントのみ)
4. `run-model-check-source.ts`: `bindRequestedModel` による要求モデル名選択 byte-pin(照合 semantics・メッセージ不変)、`RunModelCheckSource.vocabulary` 配給
5. 型追随(必須フィールド追加のコンパイル波及): `TlcPrepareInput` / `PreparedTlcRun` / `PreparedPlannedTlcRun` へ vocabulary スレッド(fs-tlc-toolchain.ts)、run-model-check-execution.ts、run-skeleton-ci.ts、tests/formal-verif/support 2 件、tlc-runtime / planned-tlc-runtime / run-model-check 統合、tlc-output 単体
6. テスト: 新規 t404(語彙 pin・receipt 不変 pin・MirrorLifecycle fixture 双方向・省略 red・和集合拒否)+ run-model-check-source 統合へ未登録要求 red・語彙配給 assert・コード既定値削除の grep ガード追加
7. 検証: 対象テスト green / typecheck / biome / test:ci 全量 / `bun scripts/package.ts` 再生成 + `--check` / `promote:self:check`

## AC 対応

- AC1: t404 の FormalElection 語彙 deep-equal pin(順序含む)+ frozen receipt 不変 pin + 既存 identity 定数 pin(統合)の期待値不変 green
- AC2: t404 の vocabulary 省略 red(MODEL_MAP_INVALID、fallback なし)+ MirrorLifecycle 語彙での未知 invariant 拒否(和集合緩和なし)
- AC3: bindRequestedModel の要求名選択 + 統合の未登録要求 red + 既存 drift 赤ケース期待値不変
- AC4: typecheck / lint / test:ci green、drift guard 両方 exit 0、テスト同 PR

## 結果

実装・検証は `code-summary.md` のとおり。
