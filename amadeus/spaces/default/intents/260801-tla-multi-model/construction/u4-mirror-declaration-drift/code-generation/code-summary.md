# Code Summary — u4-mirror-declaration-drift(code-generation)

**Intent**: 260801-tla-multi-model / **Unit**: u4-mirror-declaration-drift(C4) / **Stage**: code-generation

上流入力は unit-of-work の u4 節・AC1〜AC4・テスト割当、functional-design の declaration drift / 補正規則、NFR requirements/design、u1 の resolver、u2 の loader aux 検証である。テスト戦略は Comprehensive とし、公開 seam と実 `model-map.json` の両方を検証した。

## 変更内容

- `packages/framework/core/tools/tla-module-deps.ts` を canonical resolver として配置し、`scripts/package.ts` の `GENERATED_PLUGIN_SOURCES` から plugin コピーを生成する構成へ移した。sensor と loader が同一実装を共有し、core/plugin は byte-identical である。
- `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` に以下を追加した。
  - model が解決した推移的 aux 一覧と `model-map.json` の宣言を比較し、missing / extra を `declaration-drift` として検出する。
  - aux の読取・UTF-8・resolver 失敗を `declaration-unresolved` へ fail-closed に写像する。
  - aux identity を既存 SafeFileReader 経路で計測し、flagless `updateModelMap` で auxiliaries を canonical path 順に補正する。
  - `canonicalRecord` で optional auxiliaries / vocabulary を保持し、entries-only 更新の純粋性を維持する。
  - impl-only latch に aux identity と宣言一致を含め、実装だけの更新要求が model/cfg/aux/declaration drift を取り込まないようにした。
- `specs/tla/model-map.json` の MirrorLifecycle へ `MirrorLifecycleCore.tla` の canonical identity と、named invariants 3件・trace state variables 3件の vocabulary を登録した。
- `tests/integration/t405-mirror-declaration-drift.integration.test.ts` を追加し、同期 control、Core の意味論 drift とコメント drift、missing/extra、flagless 補正、三者 identity 一致、冪等性、循環参照 fail-closed を保護した。
- `tests/integration/t380-impl-only-model-map-update.integration.test.ts` に aux drift と宣言不一致の拒否、entries-only 更新で model/cfg/aux/vocabulary が不変であるケースを追加した。
- MirrorLifecycle 登録テストに Core identity・drift と vocabulary pin を追加した。u2 の「u4 まで宣言 gap」移行テストは、実 map の宣言成立を検証する green ケースへ更新した。
- 既存 sensor E2E fixture を現行 schema v2 と canonical audit envelope へ同期した。これは u4 の関連テスト掃討で顕在化した維持対象の stale fixture 修正であり、製品契約の変更ではない。
- generated plugin source drift テストの合成 workspace に resolver の canonical/generated 対を追加し、生成対象が2組になった後も MISSING / DIFFERS / writer の各分岐を単独で検証できるようにした。
- `bun scripts/package.ts` で sensor と resolver を全7ハーネスの `dist/` へ再生成した。生成物は手編集していない。

## TDD と AC 証跡

- **Red**: t405 の同期 control だけが green、Core 意味論/コメント drift、missing/extra、補正、循環参照の4 feature ケースが未実装 sensor に対して想定どおり fail することを先に実測した。
- **Green / AC1**: Core の意味論変更とコメントのみの変更がいずれも aux identity drift として検出され、宣言 gap の missing/extra も独立ケースで検出される。t405 5 pass。
- **Green / AC2**: flagless 補正後に sensor と loader が同じ解決集合を受理し、map 宣言・実 bytes・loader の `auxIdentities` が同一 identity になる。再補正は byte-identical。循環参照は fail-closed。t405 5 pass。
- **Green / AC3**: impl-only は aux drift / 宣言不一致を拒否し、正当な entries-only 更新は model/cfg/aux/vocabulary を保持する。t380 12 pass。
- **Green / AC4**: 実 map 登録、loader、sensor component/integration/E2E、生成物、typecheck、lint を回帰確認した。`MirrorLifecycleAsImplemented` と Vacuity 関連ファイルには接触していない。

## 検証コマンドと結果

| コマンド | 結果 |
|---|---|
| `bun test tests/integration/t405-mirror-declaration-drift.integration.test.ts` | 5 pass / 0 fail |
| `bun test tests/integration/t380-impl-only-model-map-update.integration.test.ts` | 12 pass / 0 fail |
| `bun test tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` | 7 pass / 0 fail |
| 変更対象6ファイルの最終一括テスト | 52 pass / 0 fail / 178 expect |
| sensor 関連 unit / integration / components / E2E と loader 回帰 | 全件 pass / 0 fail |
| `bun packages/framework/core/tools/amadeus-sensor-model-completeness.ts --project-dir .` | `pass: true` |
| `bun scripts/package.ts` / `bun scripts/package.ts --check` | 両方 exit 0、7ハーネス同期 |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0、既存許容 warning 354 / info 22 |
| `diff -q` canonical resolver / plugin resolver | exit 0(byte-identical) |
| `bun run test:ci` | 717 files / 9749 assertions。初回は 3 files / 7 assertions fail。うち u4 起因の generated-plugin-source fixture を修正後、当該 3 pass と変更対象一括 52 pass を確認。残る既存2 files / 5 assertions は下記 |

## 計画との差分・判断

- functional-design §9.2 で維持対象だった sensor E2E が、schema v1 fixture と旧 audit shape のため赤になった。u4 起因の関連回帰として再分類し、現行 schema v2 / canonical audit envelope へ最小更新した。
- u2 が明示した移行テスト「reports the MirrorLifecycle declaration gap on the real map until u4」は、u4 宣言追加後に赤へ転じる設計だったため、本 Unit で宣言成立を検証する green ケースへ更新した。
- `GENERATED_PLUGIN_SOURCES` の追加により既存の単一-source fixture が赤になったため、本 Unit の生成契約テストとして再分類し、resolver 対を含む fixture へ最小更新した。修正前 Red、修正後 3 pass を実測した。
- 本並列 worktree には u3 の FormalElection vocabulary 変更がまだ存在しない。u4 は MirrorLifecycle entry だけを変更し、sensor の canonical record は他モデルの optional vocabulary を保持する実装とした。統合時は `specs/tla/model-map.json` の別 entry 変更を両立させる必要がある。
- `amadeus-state.md` と audit shard は swarm driver / stage 実行の記録であり、親指示に従い本 Unit コミットへ含める。

## 残余リスク

- u4 実装上の blocker はない。
- フル CI の残余 baseline は `tests/unit/t-test-size-drift.test.ts` 1件(u1/u2 の `t402` / `t403` が unit-small 上限超過)と `tests/unit/t124-scope-transpose.test.ts` 4件(既存の temp compile における stage-graph/rules drift)である。両方を個別再実行して同じ 5 failure を確認し、u4 変更ファイルとの非関連を切り分けた。
- u3 と同じ `specs/tla/model-map.json` を編集するため merge conflict の可能性はあるが、意味的な変更対象は別 model entry である。MirrorLifecycle の auxiliaries / vocabulary と FormalElection の vocabulary を双方保持して解決する。
