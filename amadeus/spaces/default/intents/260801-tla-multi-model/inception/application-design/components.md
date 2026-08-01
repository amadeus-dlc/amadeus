# Components — 260801-tla-multi-model

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

requirements.md の FR-1〜FR-6 を実現する変更コンポーネントを列挙する。既存配置の実測は architecture.md / component-inventory.md の 260801-tla-multi-model 現在節(observed `33e196b8`)に依拠し、file:line は本ワークツリー HEAD で再確認済み。新規コンポーネントの新設はなし(component-inventory 現在節の判断と一致)——既存 plugin 内 6 面 + specs/tla + stage doc + ci.yml の拡張で閉じる。

## C1: model-map スキーマ拡張(FR-1)

`plugins/formal-model-check/tools/tla-model-map.ts`(loader 側)+ canonical コピー `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` / `packages/framework/core/tools/amadeus-formal-verif-model-map.ts`(byte-identical 2 複製、実測)。

- **責務**: `ModelMapModel` に optional `auxiliaries?: readonly ModelMapAssetIdentity[]` を追加。`parseModel` の `exactObject`(canonical 側 :204)を「`["cfg","entries","model","name"]` または `["auxiliaries","cfg","entries","model","name"]` のいずれか」へ拡張(FE Q2=A の非侵襲 optional 方式)。aux 各要素は `parseAssetIdentity` 相当の検証(path は `specs/tla/` 境界内の TLA モジュール命名規則、identity は小文字 SHA-256)を通す。省略時の既存2モデルのパース結果・identity 値は不変(成功 iii)。
- **インターフェース**: 既存 `parseTlaModelMap` / `findModelMapModel` / `ModelMapModel` 型の拡張のみ。新規 export 関数は追加しない可能性が高い(aux 解決は C2 に住む)。
- **カバー FR**: FR-1(基盤)、FR-3(宣言の器)、FR-6(不変性の pin 対象)。
- **留意**: byte-identical 複製は両方同時に同じ byte で更新し、dist 配布面は `bun scripts/package.ts` 再生成で追随させる(team-practices Code Style / dist 手編集禁止)。

## C2: EXTENDS/INSTANCE 推移解決リゾルバ(FR-2)

新規モジュール `plugins/formal-model-check/tools/tla-module-deps.ts`(仮称。既存 `canonical.ts` / `contract.ts` と同列の小粒モジュールとして置く)。

- **責務**: `.tla` ソースから `EXTENDS` 句と `INSTANCE <Module>(WITH …)` 句(MirrorLifecycle.tla:31-32 型、改行跨ぎの WITH 代入を含む)を行ベースで抽出し、`specs/tla/` 内モジュール名の推移閉包を返す。抽出規則: 行コメント(`\*` 以降)とブロックコメント(`(* … *)`、ネストなし実測)を除去した上で、行頭(前置空白許容)の `EXTENDS` / `INSTANCE` キーワードのみ採用。文字列リテラル中の誤検出は TLA+ モジュールが文字列を持たない現行4モジュールでは発生しないが、キーワード行頭縛りで構造的に排除する。
- **境界**: 解決先は同じ `specs/tla/` 内の `<Name>.tla` のみ。`specs/tla/` 外・存在しないモジュール・自己/循環参照は fail-closed の明示失敗。
- **カバー FR**: FR-2。
- **留意**: 解決集合は「モデル自身を除く補助モジュール集合」として正規化(ソート済み・重複排除)して返す。loader(C3)と sensor/updateModelMap(C7)の両方がこの1実装を呼ぶ(二重検出だが抽出実装は単一 — RA Q2=A は検出点の二重化であり実装の複製ではない)。

## C3: loader 一般化(FR-2 / FR-4)

`plugins/formal-model-check/tools/tla-model-loader-internal.ts` + `tla-model-loader.ts`(無引数 wrapper)。

- **責務**:
  - `verifyRegisteredAssets`(:252-275)を拡張し、全登録モデル(実行モデル skip の :258 を撤廃)について model/cfg/aux 全資産を identity 照合する。aux の照合は C1 で宣言された `auxiliaries` 配列を読み、各パスを `verifyAssetPath`(specs/tla 境界検査)で検証後、domain `amadeus.formal-verif.tla.module.v1` の canonical identity で照合(RA Q1=A)。
  - 同時に C2 の推移解決を全登録モデルに実行し、**解決集合 ≠ 宣言集合(auxiliaries)** を SOURCE_DRIFT 系の明示失敗で赤化(RA Q2=A の loader 側検出点)。宣言漏れ・過剰宣言の両方向を検出する。
  - 実行対象選択の一般化: `TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH`(tla-model-map.ts:52-54)の固定導出を撤廃し、`VerifiedTlaSource` を「全登録モデルの検証済みソース配列」へ改訂(SD Q1=A)。loader 無引数 wrapper の意味は「全モデルを検証して返す」に変わる(ピン改訂は requirements.md FR-4 で確定済み)。
- **インターフェース改訂**: `VerifiedTlaSource` → `VerifiedTlaSources`(仮称、`models: readonly VerifiedModelSource[]`、各要素に `model: ModelMapModel` / `moduleBytes` / `cfgBytes` / `moduleIdentity` / `cfgIdentity` / `auxIdentities` / `modelMap`)。`executionModel` 単一フィールドは撤廃し、呼出側がモデル名で選択する。
- **カバー FR**: FR-2(loader 側赤化)、FR-4(実行選択)、FR-6(結果不変の照合基盤)。
- **fail-closed**: 未登録モデル名の選択要求・aux identity 不一致・解決不一致は全て `Result` の明示失敗(NFR-2)。silent fallback なし。

## C4: arm/toolchain のモデル別語彙供給(FR-4)

`plugins/formal-model-check/tools/tla-arm.ts` / `tlc-toolchain.ts`。

- **責務**: モデル固有語彙を「モデル名 → 語彙レコード」の供給機構に一般化(置き場所は decisions.md ADR-6 — **model-map.json エントリ内**に置く決定)。
  - `TLA_NAMED_INVARIANTS`(tla-arm.ts:322-330、配列本体)をモデル別 invariant 集合へ(IC Q1=A)。FormalElection は現行7件不変の値のまま model-map.json の vocabulary へ移し、コード側の既定値は残さない(map を唯一の源とする)。MirrorLifecycle は cfg 実測の3件(`TypeOK` / `NoCloseWithoutLandedSync` / `NoDuplicateCreate`)。
  - `TRACE_STATE_VARIABLES`(tlc-toolchain.ts:418)、トレースラベル regex の `of module FormalElection>` 固定(:434-436)、反例変数列検証(:439-440 / :515-516)、`hasFrozenModelOutputBinding`(:493-494 周辺、実測では関数定義 :492)をモデル別供給に一般化。語彙を持たない(= model-map に語彙のない)モデルの TRACE 解析要求は明示失敗。登録2モデル(FormalElection / MirrorLifecycle)はともに vocabulary を宣言するため(C8)、この fail-closed 規則は全モデルで一様に成り立つ。
- **カバー FR**: FR-4。
- **不変性**: FormalElection に供給される語彙値は現行定数と完全一致(FR-6 の pin 対象)。

## C5: byte-pin 一般化(FR-4)

`plugins/formal-model-check/tools/run-model-check-source.ts`(:118-123 の `sameBytes` 照合)。

- **責務**: 「要求モデルのバイトをそのモデルの verified source と照合」へ一般化。現行は単一 `canonical.value.moduleBytes/cfgBytes` との照合だが、C3 改訂後は要求モデル名で配列から該当要素を選択して照合する。未登録モデル要求は明示失敗。
- **カバー FR**: FR-4、FR-6(照合 semantics 不変)。

## C6: CI ポート/診断/スケルトンの引数化(FR-4 / FR-5)

`node-ci-model-check-port.ts`(:200-202 の `--model specs/tla/FormalElection.tla --cfg …` 固定)、`run-model-check-diagnostic.ts`(:208-209 の `FormalElection.tla/.cfg` 固定)、`run-skeleton-ci.ts`(:82-83 の frozen モデル書出し名固定)、`run-model-check-ci.ts`(`run|verify --root` パーサ :11-21)。

- **責務**: ハードコードをモデル名引数(または全登録モデル反復)へ置換。`run-model-check-ci.ts run` は既定で全登録モデルを逐次実行し、per-model の evidence ディレクトリ(`<root>/<model-name>/`)へ出力。`verify` も全モデルの terminal evidence を検査する。diagnostic / skeleton も同様にモデル名を受ける形へ。
- **カバー FR**: FR-4、FR-5(CI での全モデル駆動)。
- **留意**: skeleton は frozen モデル receipt 系(成功 iii の対象)——frozen モデル生成そのものは FormalElection 語彙のまま維持し、引数化は「どの登録モデルを走らせるか」の選択に限定する。

## C7: sensor / updateModelMap の二重検出(FR-2)

`packages/framework/core/tools/amadeus-sensor-model-completeness.ts` + canonical CLI `amadeus-formal-verif-model-map.ts` の `updateModelMap` 経路。

- **責務**: RA Q2=A の第2検出点。sensor `check` と `updateModelMap` が C2 のリゾルバで解決集合を計算し、model-map の `auxiliaries` 宣言との不一致を赤(sensor) / 更新対象として補正(updateModelMap)する。aux 追加時の identity 計算は domain 付き canonical(`amadeus.formal-verif.tla.module.v1`)で、loader の照合と同一アルゴリズム。
- **カバー FR**: FR-2(sensor 側赤化)、FR-3(Core 宣言の機械的登録)。

## C8: specs/tla 宣言・pin 更新(FR-3)

`specs/tla/model-map.json` + `MirrorLifecycle.cfg`(不変、参照のみ)。

- **責務**: MirrorLifecycle エントリに `auxiliaries: [{ path: "specs/tla/MirrorLifecycleCore.tla", identity: <canonical sha256> }]` と語彙レコード(ADR-6)を宣言。**FormalElection エントリにも vocabulary フィールドを追加する**(現行7件の invariant と TRACE_STATE_VARIABLES を値不変で移管)——ただし identity 値・entries 配列・パース結果は一切変更しない(FE Q2=A の非侵襲 optional 拡張、成功 iii)。receipt identity への非影響は decisions.md ADR-10 の入力列挙どおり。
- **カバー FR**: FR-3。AsImplemented / Vacuity は触らない(Out of scope A2)。

## C9: ci.yml ジョブ更新(FR-5)

`.github/workflows/ci.yml`(:508-564 実測、formal-model-check ジョブ)。

- **責務**: `run-model-check-ci.ts run|verify` が全登録モデルを駆動するようになった後、ジョブ定義はステップ名・サマリ表示を複数モデル対応に揃える。`workflow_dispatch` 限定(D-制約 C2)・`permissions: contents: read`(NFR-3)・timeout 30 分(:513)は不変。時間超過時のみ time-box 後続裁定(FE Q1=A)——本設計では timeout 値自体は変えず、実測結果を FR-5 AC の証跡として残す。
- **カバー FR**: FR-5。

## C10: stage doc 整合(FR-4 末尾)

`plugins/formal-model-check/stages/formal-model-check.md`(:35-36 / :42-43、requirements 補遺の精密化どおり)。

- **責務**: 単一モデル前提の記述を実装後の複数モデル semantics に一致させる(doc 先行の解消)。実装先行・doc 追随の順序を守る。
- **カバー FR**: FR-4。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T20:22:47Z
- **Iteration:** 2
- **Scope decision:** none

All four iteration-1 findings closed consistently across the five artifacts (vocabulary placement unified, ADR-6 regrounded, order fixed, diagnostic default decided); no regressions.

### Findings

- None
