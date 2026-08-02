# Requirements — 260801-tla-multi-model

上流入力(consumes 全数): codekb `architecture.md` / `code-structure.md` / `code-quality-assessment.md` / `technology-stack.md` / `business-overview.md` / `dependencies.md`(RE 現在節)、ideation `intent-capture/intent-statement.md` / `scope-definition/scope-document.md`(frontmatter 宣言 consumes)、`../practices-discovery/team-practices.md`(frontmatter 宣言 consumes)、`../../ideation/approval-handoff/initiative-brief.md`・`decision-log.md`、本ステージ Q&A(Q1=A / Q2=A)

## Intent analysis

model-map v2 の単一モジュール世界観に起因する同根2欠陥(#1921 drift ピンの空洞化、#1920 TLC 実行の単一モデル固定)を、登録スキーマ・検証 loader・TLC 実行系・CI 配線の4層をまたいで整合的に複数モデル化する。成功3点: (i) CI で MirrorLifecycle AsIntended 完全探索 green、(ii) Core 意味論編集を drift ガードが赤検出、(iii) FormalElection 側の結果・receipt identity 不変。

## Functional requirements

### FR-1: model-map スキーマへ補助モジュール配列を追加(#1921、D5 準拠)

- `ModelMapModel` に optional の補助モジュール identity 配列(仮称 `auxiliaries`)を追加(IC Q2=C・FE Q2=A 準拠)。`exactObject`(amadeus-formal-verif-model-map.ts:204)のキー集合を拡張し、省略時は従来どおり(既存2モデルの identity 値・パース結果は不変 — 成功 (iii))。
- aux の identity は **domain 付き canonical identity**(Q1=A、model/cfg と同型。`amadeus.formal-verif.tla.module.v1` ドメイン)。
- aux パスは `specs/tla/` 境界内の検証機構(verifyAssetPath)を再利用して検証。
- スキーマ表テスト(t-formal-verif-model-map-v2.test.ts)を拡張(正例 + exactObject 負例の整合)。

### FR-2: EXTENDS/INSTANCE の静的推移解決と宣言不一致の赤化(IC Q2=C、RA Q2=A)

- `.tla` の EXTENDS / INSTANCE(… WITH 代入形を含む、MirrorLifecycle.tla:31-32 型)を行ベースで抽出し、補助モジュール集合を推移的に解決する。コメント・文字列中の構文誤検出を防ぐ抽出規則を固定。
- 解決集合 ≠ 宣言集合(宣言漏れ・過剰宣言)を **loader 検証時と sensor check/updateModelMap 時の二重で赤**にする(Q2=A)。loader は常に推移解決を実行。
- 偽赤・偽緑の落ちる実証テストを入れる。

### FR-3: MirrorLifecycle への Core 宣言(#1921)

- model-map.json の MirrorLifecycle エントリに `MirrorLifecycleCore.tla` を補助モジュールとして宣言・ピン。Core への意味論編集で drift ガードが赤(成功 (ii))になる落ちる実証付き。
- AsImplemented / Vacuity は Out of scope(一度限り実証用のまま、A2)。

### FR-4: TLC 実行系の複数モデル対応(#1920)

- `tlc-toolchain.ts`: `TRACE_STATE_VARIABLES`(:418)・トレースラベル regex(:434-436)・反例変数列検証(:439-440/:515-516)・`hasFrozenModelOutputBinding`(:493-494)をモデル別供給に一般化。
- `tla-arm.ts:322-330` の `TLA_NAMED_INVARIANTS` をモデル別 invariant 集合に一般化(IC Q1=A)。MirrorLifecycle.cfg の3不変(TypeOK/NoCloseWithoutLandedSync/NoDuplicateCreate)を供給。
- loader の実行対象モデル選択: **既定 = 全登録モデル逐次、オプション引数で単一絞り込み可**(SD Q1=A)。`TLA_EXECUTION_MODEL_NAME`/`TLA_MODEL_PATH`/`TLA_CFG_PATH` 固定導出の解消。loader 無引数ピン(t-formal-verif-tla-model-loader.test.ts:10-13)は「全モデルの VerifiedTlaSource 配列」意味へ改訂(ピン改訂裁定は本要件で確定)。
- `run-model-check-source.ts:118-123` の byte-pin 契約を一般化(要求モデルのバイトをそのモデルの verified source と照合)。
- `node-ci-model-check-port.ts:200-202` / `run-model-check-diagnostic.ts:208-209` / `run-skeleton-ci.ts:82-83` のハードコードを引数化・全登録モデル駆動に。
- `stages/formal-model-check.md`(:12,34→実際は:35-36,42-43)の単一モデル前提を実装に一致させる(doc 先行の解消)。

### FR-5: CI で MirrorLifecycle AsIntended 完全探索(成功 (i))

- ci.yml の formal-model-check ジョブ(workflow_dispatch 維持、D-制約 C2)が全登録モデルを実行し、MirrorLifecycle AsIntended を完全探索(completion marker + state 統計付き)で green。
- 時間方針: まず実測、タイムアウト超過時のみ time-box 後続裁定(FE Q1=A)。ジョブ timeout 30 分(ci.yml:513)との整合を実測で確認。
- 両モデルで注入 red 実証(落ちる実証)を実施(#1920 AC)。

### FR-6: 不変性の保証(成功 (iii))

- FormalElection 側の検証結果・frozen model receipt identity が不変であることの pin テスト。
- 既存27テストファイルの FormalElection 参照は、単一モデル前提の固定のみ改訂対象とし、参照として正しいものは維持。

## Non-functional requirements

- NFR-1 後方互換: 既存2モデルの identity 値・パース・検証結果は不変。`bun run typecheck` / `lint` / 既存テストが green(patch coverage ゲート: 変更行 0-hit 不許容)。
- NFR-2 fail-closed: 未登録モデル指定・宣言不一致・byte 不一致は全て明示失敗(silent fallback 禁止)。
- NFR-3 権限最小: CI ジョブの permissions 追加なし(contents: read 維持)。
- NFR-4 新規外部依存なし。

## Constraints

- 生成物(dist/、.kimi-code/ 等)は `bun scripts/package.ts` 再生成 + drift guard 通過。plugin tools が self-install 配布対象かは実装時に code-structure.md 現在節の配置判断で確認。
- コメント・doc は日本語、コミットは英語 conventional。
- #1920 verdict 留保「TLC 実走未実施」は FR-5 の実測で閉じる(citation-reservation-preservation 転記済み)。

## Assumptions

- CI runner の docker + tla2tools は MirrorLifecycle 探索にそのまま使用可能(A1)。
- AsIntended の基準値は u7 実測(208628 states / 89099 distinct / depth 18 / no error)を基準とする(D3)。

## Out of scope

- AsImplemented / Vacuity の恒常化、第3モデル登録、CI トリガ変更、model-map v3、TLC toolchain 自体の変更、#1906 等の別件。

## Open questions

- なし(Q1/Q2 確定。loader 無引数ピンの改訂裁定は FR-4 に確定記載)。

## 補遺(引用の精密化)

- intent-statement.md は `TLA_NAMED_INVARIANTS` を `tla-arm.ts:322-332` と記すが、RE の再実測で配列本体は `:322-330`(`:332` は型行)と確定しており、本要件は精密化後の `:322-330` を正とする。同様に stages/formal-model-check.md の doc 先行記述は `:34` ではなく `:35-36`、tlc-toolchain.ts のトレースラベル regex は `:436` ではなく `:434-436`(RE 引用再確認テーブルどおり)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T20:05:28Z
- **Iteration:** 2
- **Scope decision:** none

All iteration-1 findings closed (consumes header, stage-prefixed ruling citations, precision appendix); no regression. Findings: none.

### Findings

- None
