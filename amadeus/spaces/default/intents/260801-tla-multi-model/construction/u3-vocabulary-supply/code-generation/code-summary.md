# Code Summary — u3-vocabulary-supply(code-generation)

**Intent**: 260801-tla-multi-model / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面) / **Stage**: code-generation

上流入力(consumes 全数): unit-of-work(u3 節・AC1〜4, テスト割当節), functional-design(business-logic-model / business-rules / domain-entities), nfr-requirements / nfr-design 全件, requirements(FR-4 / FR-6), components(C4 / C5 / C8), component-methods(C4 / C5), services(S2 / S4), decisions(ADR-3 / ADR-5 / ADR-6 / ADR-10), u2 functional-design(domain-entities §1〜§3 の受け口型)

## 前提: u2 未着地の裁定

本 worktree の loader は旧単数形(`loadVerifiedTlaSource()` / `VerifiedTlaSource.executionModel`)のままで、u2 の複数形 API(および期間限定 shim)は**存在しない**。よって:

- 語彙解決(`namedInvariantsFor` / `traceVocabularyFor`)は u1 の `ModelMapModel` のみに依存する純粋関数として完全実装した(I/O なし、BR-V2)。
- 選択結線は「今日コンパイルが通り、u2 着地時に最小差分で複数形へ置き換わる」構造にし、該当箇所へ MERGE-NOTE コメントを残した(tla-arm.ts `generateFrozenTlaModel`、run-model-check-source.ts `bindRequestedModel`)。
- shim は本 worktree に存在しないため除去対象なし。マージ時の調整事項は末尾「u2 統合のマージ調整事項」に記録。

## 変更内容

- `specs/tla/model-map.json`: FormalElection エントリへ `vocabulary` 追加のみ(namedInvariants 7件・traceStateVariables 7件、現行定数と順序含め一字一致 — BR-P1)。identity 値・entries 配列・MirrorLifecycle エントリ・schemaVersion は不変(BR-P4)。
- `plugins/formal-model-check/tools/tla-arm.ts`:
  - `TLA_NAMED_INVARIANTS` / `TlaNamedInvariant` を削除(BR-V1)。receipt の invariant キー型は `Record<string, …>` へ緩和(閉性は従来どおり `exactPlainObject` の実行時 closed-set 検査が強制)。
  - `namedInvariantsFor(model)` 新設: vocabulary 省略は `MODEL_MAP_INVALID`(kind MODEL_LOAD)の明示失敗。空配列・既定値・他モデル語彙への fallback なし(BR-V3/V4)。
  - `invariantMap` / `invariantRhs` / `generateFrozenTlaModelFromSource` / `createFrozenTlaModelReceipt` / `invariantReceiptShapeError` / `validateFrozenTlaModelReceipt` を語彙引数化(計算式・走査規則は一字不変 — BR-F2)。`validateFrozenTlaModelReceipt` の closed-set 期待キー集合は loader ピン経由の語彙から解決する(`frozenModelNamedInvariants`。解決不能は従来の regeneration 失敗パスと同じ reject メッセージに畳み込み、fail-closed)。
  - `generateFrozenTlaModel` は frozen モデルを **FormalElection に意図的固定**(ADR-10、BR-F3)したまま、語彙を map 宣言から供給する。u2 複数形への置換位置を MERGE-NOTE で明示。
- `plugins/formal-model-check/tools/tlc-toolchain.ts`:
  - `TRACE_STATE_VARIABLES` を削除(BR-V1)。`TraceVocabulary` / `traceVocabularyFor(model)` 新設(moduleName は `model.name` から導出 — BR-V6。vocabulary 省略は `MODEL_MAP_INVALID` 明示失敗)。
  - `TlcOutputInput` に `vocabulary: TraceVocabulary` を必須追加。`parseTrace` / `counterexampleExploration` / `initialStateCounterexampleExploration` の語彙参照化(変数列の数・順序一致 semantics、未知 invariant 拒否の分類・メッセージは不変 — BR-G1/G3/G4)。
  - トレースラベル regex は `traceLabelPattern(moduleName)` として `escapeRegExp` 埋込みで一般化(grammar 本体は一字不変 — BR-G2)。t404 からの検証用に `traceLabelPattern` を export。
  - `hasFrozenModelOutputBinding` は**一字不変**(一般化対象外のコメントのみ追加 — ADR-10 / BR-F1)。
- `plugins/formal-model-check/tools/run-model-check-source.ts`: `bindRequestedModel` を新設し、byte-pin を要求モデル名(basename)選択へ一般化。照合 semantics・drift メッセージ文字列は不変(BR-B1)。`RunModelCheckSource` に `vocabulary: TraceVocabulary` を追加し toolchain 正規化の入力語彙として配給(BR-B4)。`publicContractIdentity` の計算式は不変(BR-B3)。
- 型追随(`TlcOutputInput.vocabulary` 必須化のコンパイル波及、期待値・semantics は不変):
  - `plugins/formal-model-check/tools/tlc-toolchain.ts` の `TlcPrepareInput` / `PreparedTlcRun` に `vocabulary` 追加。
  - `plugins/formal-model-check/tools/fs-tlc-toolchain.ts`: `PreparedPlannedTlcRun` に `vocabulary` 追加し、2箇所の `parseTlcOutput174` 呼出へ prepared 経由で配給。
  - `plugins/formal-model-check/tools/run-model-check-execution.ts`: `preparePlanned` 入力へ `source.vocabulary` を配給。
  - `plugins/formal-model-check/tools/run-skeleton-ci.ts`: skeleton は FormalElection 語彙固定のまま、loader 検証済み宣言から `traceVocabularyFor` で解決して配給(コード既定値なし)。
- テスト:
  - `tests/unit/t404-tla-vocabulary-supply.test.ts`(新規5件): 後述 AC 証跡どおり。unit スコープの size 純粋性ゲート(small のみ)に適合させるため、実 map の取得は loader 経由(`loadVerifiedTlaSource().modelMap`)とし、テストファイル自身は fs API に触れない。
  - `tests/unit/t-formal-verif-tlc-output.test.ts`: `context` ヘルパへ map 由来の `TraceVocabulary` を追加(語彙リテラルの複製なし — 実 map を loader 経由で解決)。期待値は一切不変。
  - `tests/integration/t-formal-verif-run-model-check-source.integration.test.ts`: 正常系へ語彙配給の deep-equal assert 追加、未登録モデル名要求の MODEL_MAP_INVALID red 追加(AC3)、コード既定値削除の grep ガード追加(BR-V1 — loader 統合 :387-393 と同型のソース文字列検査。fs を読むため unit ではなく本 integration ファイルに配置)。MirrorLifecycle 要求は u2 未着地の現状では同一の明示失敗になることを MERGE-NOTE コメント付きで pin(u2/u4 着地後に再訪)。
  - `tests/integration/t-formal-verif-tlc-runtime.integration.test.ts` / `t-formal-verif-planned-tlc-runtime.integration.test.ts` / `t-formal-verif-run-model-check.integration.test.ts` / `tests/formal-verif/support/tla-toolchain-harness.ts` / `tla-real-toolchain-probe.ts`: vocabulary スレッドの型追随のみ(期待値不変)。
  - `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts:392` の文字列検査は `"loadVerifiedTlaSource()"` のまま**現状維持で green**(本 worktree では単数呼出を保持しているため)。u2 着地と同時の複数形化で `"loadVerifiedTlaSources()"` へ追随する — マージ調整事項 (3)。
- 生成ツリー追随: `bun scripts/package.ts` 再生成(dist/ 各ハーネス)、`bun run promote:self` 適用。

## AC 証跡

- **AC1(FormalElection 語彙 pin + frozen receipt identity 不変)**: t404「pins the FormalElection vocabulary in the model map byte-for-byte」が実 map の 7+7 件を順序含め deep-equal で pin(identity 値・entries 件数の不変も同ケースで assert)。「keeps the frozen model receipt identical under map-supplied vocabulary」が固定 publicContractIdentity で receipt 決定性・キー集合=語彙集合を pin。既存の identity 定数 pin(loader 統合)・tlc-output / tlc-toolchain 系は期待値不変のまま green。green。
- **AC2(vocabulary 省略 red + 未知 invariant 拒否の保存)**: t404「fails closed when a model declares no vocabulary」が `namedInvariantsFor` / `traceVocabularyFor` 両方の MODEL_MAP_INVALID(kind MODEL_LOAD)明示失敗と fallback 不存在を実証。「rejects a counterexample invariant outside the requested model's closed set」が MirrorLifecycle 語彙のもとで FormalElection の invariant 名(ChoiceWinner)を報告する反例入力を従来どおり `failed("GRAMMAR", "counterexample invariant is outside the frozen set")` で落とすことを実証(和集合緩和の偽陰性なし — BR-V5/G4)。green。
- **AC3(byte-pin の要求モデル選択)**: `bindRequestedModel` が要求名で選択し、統合テストの新規ケース「rejects a request for a model with no verified source binding」が未登録名の明示失敗(MODEL_MAP_INVALID)を実証。既存の drift 赤ケース(誤バイト・cfg drift・メッセージ文字列)は期待値不変で green(照合 semantics 不変)。green。
- **AC4(既存 green + patch gate)**: 下表のとおり typecheck / lint / 関連スイート green、drift guard 両方 exit 0。テストは修正と同一コミット。green。

## 検証コマンドと結果

| コマンド | 結果 |
|---|---|
| `bun test tests/unit/t404-tla-vocabulary-supply.test.ts` | 5 pass / 0 fail、exit 0 |
| `bun test tests/unit/t404-… tests/unit/t-formal-verif-{tlc-output,tlc-toolchain,tlc-public-surface,model-map-v2,tla-model-loader,canonical-core}.test.ts tests/unit/t401-…` | 97 pass / 0 fail、exit 0(t404 6件時代の計測。最終形は下行) |
| `bun test tests/unit/t404-… tests/unit/t-test-size-drift.test.ts tests/integration/t-formal-verif-run-model-check-source.integration.test.ts` | 25 pass / 1 fail(size 純粋性ガード — t402 既存赤のみ、乖離 1 参照) |
| `bun test tests/integration/t-formal-verif-{run-model-check-source,tla-model-loader,tlc-runtime,planned-tlc-runtime,run-model-check,mirror-model-registration}.integration.test.ts tests/integration/t380-…` | 79 pass / 0 fail、exit 0 |
| `bun test tests/integration/{t320,t321,t322,t378,t381,t382}* tests/integration/t-formal-verif-model-completeness-sensor… tests/unit/t-formal-verif-model-completeness-sensor…` | 109 pass / 0 fail、exit 0 |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(cognitive-complexity warning は既存ベースラインどおり) |
| `bun run test:ci`(全量、2回) | 716 ファイル中 1 ファイル(t-test-size-drift)1 件失敗 — 乖離 1。u3 起因の offender は解消済み |
| `bun scripts/package.ts` / `bun scripts/package.ts --check` | 両方 exit 0 |
| `bun run promote:self:check` | exit 0 |

## 乖離・留意

1. **test:ci の 1 件失敗は base 由来の既存赤(t402)**: 全量実行(716 ファイル / 9733 assertions)で失敗するのは `tests/unit/t-test-size-drift.test.ts` の layer×size 純粋性ガードのみ。初回実行時の offender は `t402-tla-module-deps`(u1 着地分)と `t404-tla-vocabulary-supply`(本 Unit)の2件で、t404 は unit スコープの small 上限に適合するよう再構成した(map 取得を loader 経由化し fs 非接触化、grep ガードは medium 許容の integration ファイルへ移動)。再実行で offender は **t402 のみ**に縮小。t402 は `readFileSync` による実ファイル証跡(u1 AC3)を含むため静的分類が medium となり unit 上限(small)違反となるが、**本 Unit は t402 に一切触れておらず、offender としての検出は u1 コミット時点の base で再現する**(分類はテストファイル自身の静的スキャンのみに依存し、当該ファイルは HEAD 不変)。修復選択肢は (a) t402 を tests/integration へ移す(import パス・`import.meta.dir` 相対はそのまま機能)、(b) 実ファイル読取を注入経路化して small 化、(c) allowlist 再生成(同ファイルの note が "only to SHRINK" と明記するため非推奨)— u1 スコープの是正として conductor へ引き上げる。u3 自身の追加ファイルはゲート適合済み。
2. **u2 受け口の暫定形**: u3 設計 §4.3 / §5.1 の `loadVerifiedTlaSources()` + `selectVerifiedModel(...)` は u2 未着地のため、同じ選択 semantics を持つ単数形での実装に留めた(MERGE-NOTE 参照)。`bindRequestedModel` の失敗 detail は中立的な `model <name> has no verified source to bind` とした(u2 の `selectVerifiedModel` の失敗メッセージとは別物 — マージ時に u2 側の文字列へ統一)。
3. **u5 所有ファイルへの最小追随**: `TlcOutputInput` / `TlcPrepareInput` への `vocabulary` 必須追加は型上の強制であり、u5 所有の `run-skeleton-ci.ts`・`tests/formal-verif/support/` 2 件・planned-tlc-runtime 統合へコンパイル追随の最小編集を行った(unit-of-work の「実走系が語彙供給切替で落ちる場合は u3 改訂へ再仕分け」の但し書きに相当)。いずれも語彙の出所は loader 検証済み宣言であり、期待値・semantics の変更はない。
4. **fs-tlc-toolchain.ts / run-model-check-execution.ts への追随**: unit-of-work の u3 所有ファイル表にないが、`TlcPrepareInput` 必須フィールド追加のコンパイル波及として最小の vocabulary スレッド追加を行った(配給経路は設計 §2.3 の「run 系が語彙を乗せる」流れの具現化。toolchain 本体が map/loader を読む経路は作っていない)。
5. **t404 の MirrorLifecycle 変数タプル検査**: 設計 §8.1 は「3 変数のトレース行が変数列検査を通ること」を求めるが、`parseTrace` は非 export のため直接検査は行わず、(a) `traceVocabularyFor` が 3 変数を順序どおり供給する deep-equal、(b) 和集合拒否ケース内で MirrorLifecycle 変数タプルを持つ 2 状態のトレースがラベル・変数列検査を通過したうえで invariant メンバシップでのみ落ちること(detail が membership 固有メッセージであることで帰属を固定)、の2点で供給契約を pin した。実変数列の受入は FormalElection 面(tlc-output 既存ケース、期待値不変)で実証済み。
6. **`canonicalRecord`(sensor, u4 所有)の既知の落とし穴**: `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` の `canonicalRecord` は publish 時に `auxiliaries` / `vocabulary` を再出力しない(u1 スキーマ追加時点からの既存挙動)。`updateModelMap` の publish 経路が走ると vocabulary が欠落する。現状は `impl-unchanged` 短絡で実害は出ないが、**u4 が `updateModelMap --impl-only` を実 map に対して走らせる前に canonicalRecord の optional フィールド保持が必要** — u4 への引き渡し事項として記録する(t380 は temp コピー駆動のため現行でも green を確認済み)。
7. **`.claude/plugins` 合成ツリーは HEAD 時点で stale**: dogfood 合成ツリー(`.claude/plugins/formal-model-check/tools/`)は u1 時点でも同期されておらず HEAD で既に drift していた。`amadeus-plugin.ts compose` は "tool path already in host" で拒否するため本 Unit では触らず、従来どおり `bun scripts/package.ts`(dist/)と `promote:self` のみで追随した(u1 と同一手順)。合成ツリーの復旧は別途の裁定事項。
8. `amadeus-state.md` / audit shard の差分は swarm driver の記録であり、本 Unit の実装コミットには含めない(u1 と同じ扱い)。

## u2 統合のマージ調整事項(conductor 向け)

1. **tla-arm.ts `generateFrozenTlaModel`**: `loadVerifiedTlaSource()` → `loadVerifiedTlaSources()` + `selectVerifiedModel(sources, "FormalElection")` へ置換し、`namedInvariantsFor(selected.value.model)` を呼ぶ(MERGE-NOTE コメント位置)。u2 が残す期間限定 shim `loadVerifiedTlaSource()` / `VerifiedTlaSource` / `loadVerifiedTlaSourceInternal` は、本 Unit 側の2ファイル(tla-arm.ts / run-model-check-source.ts)と run-skeleton-ci.ts・テスト群の複数形追随が完了した時点で **u3 が除去する**(u2 domain-entities 旧型対応表の裁定どおり)。
2. **run-model-check-source.ts `bindRequestedModel`**: 本体を `selectVerifiedModel(sources, requestedName)` へ置換し、byte 照合相手を `selected.moduleBytes` / `selected.cfgBytes`、identity 計算を `selected.model.entries` へ切り替える。失敗分類(MODEL_MAP_INVALID / SOURCE_DRIFT)と drift メッセージ文字列は維持。
3. **loader 統合テスト :392 の文字列追随**: tla-arm.ts 複数形化と同時に `expect(adapterSource).toContain("loadVerifiedTlaSources()")` へ更新(u2 §6 オープン事項 (b)、u3 持ちの確定)。
4. **統合テストの MirrorLifecycle ケース**: run-model-check-source 統合の MERGE-NOTE ケースは、u2 着地後は選択が成功し結果が u4 の MirrorLifecycle vocabulary 宣言依存になる — u4 着地時に成功系ケースへ転換すること。
5. **`RunModelCheckSource.source` 型**: u2 着地で `VerifiedModelSource` へ追随(現状は `VerifiedTlaSource`)。消費者(run-model-check-execution 等)は `source.vocabulary` / `source.modelReceipt` 経由のため波及は限定的。

## Review

(未実施)
