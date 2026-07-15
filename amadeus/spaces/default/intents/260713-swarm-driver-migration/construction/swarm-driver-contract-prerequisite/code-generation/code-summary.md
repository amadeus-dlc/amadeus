# U-04 prerequisite コード生成サマリー

## 結果

U-04 `codex-native-driver` が安全に実装できるよう、U-01/U-02のprovider-neutral contractへProbeBinding、pre-arm execution binding、versioned Codex mode evidence、候補総45秒budgetのseamを追加した。production adapter、C-11、selector、fallback policy、driver vocabularyは変更していない。

## 実装

- `ProbeResult`へclosed schemaの`ProbeBindingReferenceV1`を追加した。available probeだけが保持でき、driver/mode、Codex resolved model、lowercase SHA-256 seed/final digestを検証する。
- selection projectionとcheckpoint parseを通じてbinding referenceを保持し、unknown field、secret-like field、partial binding、driver/mode mismatchを拒否する。
- `AdapterExecutionPlan`へoptionalな`NativeExecutionBinding`を追加した。probe binding、tool environment policy digest、sandbox policy digestをprovider arm前の`PreparedNativeRun`へimmutableに保存する。
- CodexのC-08は`codex-ultra-v1:<resolved-model-id>`だけでなく、selected ProbeBindingのmode identifierとresolved modelへの完全一致を要求する。Claude/Kiroのliteral exact policyは維持した。
- native candidateの共通probe timeoutを10,000msから45,000msへ更新した。provider固有step ceilingはadapter側の責務として残した。
- framework coreの変更をClaude、Codex、Kiro CLI、Kiro IDEの生成treeとproject-local self installへ同期した。

## TDDとレビュー

- `t223`: ProbeBindingのimmutable value、closed schema、selection round-trip、digest、driver/mode、Codex/non-Codex resolved model、secret/unknown field拒否。
- `t229`: versioned Codex mode、selected ProbeBindingとの完全一致、legacy/missing/mismatch/empty拒否、既存evidence policy回帰。
- `t231`: resolve contextと45秒budget、bindingのpre-arm checkpoint、mismatch/partial fail-closed。
- `t237`: AdapterExecutionPlanからPreparedNativeRunへのimmutable binding伝達とarm前callback。
- 独立レビューIteration 1は非Codex空resolved modelの契約不整合を指摘し、RED→GREENで修正した。Iteration 2は`READY`で追加指摘なし。

## 検証

- focused回帰: 12ファイル、381 tests、失敗0。
- review修正後focused: 4ファイル、87 tests、失敗0。
- full coverage CI: 363 files、5,278 assertions、失敗0。
- project coverage gate: 66.5213%、baseline比 +25.5819pp。
- typecheck、lint、complexity gate、coverage registry、packaging parity、dist check、promote-self check、diff checkはgreen。
- AWS credential依存のlive testとClaude substrate依存testは環境条件によりskipされた。

## 逸脱確認

- C-11 source差分: 0件。
- production provider adapter差分: 0件。
- selector順序、fallback policy、driver literal、registration cardinalityの意味変更: 0件。complexity gate対応で既存fallback検証をhelperへ移したが、条件と戻り値は同一である。
- U-03/U-04/U-05 production実装: 未着手。本PRはその前提契約だけを対象とする。
