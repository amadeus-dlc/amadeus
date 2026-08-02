# Scope Document — 260801-tla-multi-model

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`、本ステージ Q&A(後記)

## In Scope

### S1: model-map の補助モジュール identity ピン(#1921)

- model-map スキーマ(v2)へ補助モジュール identity の optional 配列を追加(FE Q2=A — 既存4資産の identity 算法・値は不変)
- `.tla` の EXTENDS / INSTANCE(MirrorLifecycle.tla:31-32 の `INSTANCE MirrorLifecycleCore WITH ...` 形を含む、C3)を行ベースで静的解決し、宣言と実際の補助モジュール集合の不一致(宣言漏れ・過剰宣言)を赤で検出(Q2=C の併用)
- MirrorLifecycle モデルエントリへ `MirrorLifecycleCore.tla` を補助モジュールとして宣言し identity ピンを張る
- 落ちる実証: Core への意味論編集で drift ガードが赤になること(成功3点 (ii))

### S2: TLC run/verify の複数モデル対応(#1920)

- `tlc-toolchain.ts` の単一モデル固定を解消: `TRACE_STATE_VARIABLES`(:418)のモデル別供給、トレースラベルの module 名 unpin(:436)、反例トレース検証(:439-440/:515-516)、`hasFrozenModelOutputBinding`(:493-494)
- `tla-arm.ts:322-332` の `TLA_NAMED_INVARIANTS` unpin(Q1=A) — モデル別 invariant 集合の供給
- loader の実行対象モデル選択方式の確定(現行 canonical 定数 `TLA_EXECUTION_MODEL_NAME = "FormalElection"` 暫定形の解消)と、loader 無引数ピン(t-formal-verif-tla-model-loader.test.ts:10-13)の改訂
- CI port(`node-ci-model-check-port.ts:200-202`)、`run-model-check-diagnostic.ts:208-209`、`run-skeleton-ci.ts:82-83` の `--model`/`--cfg` 引数化(全登録モデル走行)
- `plugins/formal-model-check/stages/formal-model-check.md`(:12,34,42-43)の単一モデル前提の改訂
- CI の formal-model-check ジョブで MirrorLifecycle AsIntended を完全探索(成功3点 (i)、FE Q1=A — まず実測、超過時のみ time-box 後続裁定)
- 落ちる実証: 両モデルで注入による赤を実測(#1920 AC)

### S3: 不変性の保証(成功3点 (iii))

- FormalElection 側の検証結果・frozen model receipt identity が不変であることの pin テスト
- 既存27テストファイルの FormalElection 参照は、単一モデル前提の固定ではなく参照として存続可能なものは維持

## Out of Scope

- AsImplemented / Vacuity 変種の恒常ジョブ化(A2 — 一度限り実証用のまま)
- 第3モデルの新規登録(A3 — スキーマは複数対応、登録はしない)
- CI 起動トリガの変更(C2 — workflow_dispatch のまま。pull_request 恒常化は別裁定)
- model-map v3 へのバージョンアップ(FE Q2=B 却下)
- TLC toolchain 自体の変更(docker/tla2tools の導入・更新)
- #1906(state lock)、amadeus-bolt.ts 無ロック RMW 等の別件

## 変更面の見積もり

plugins/formal-model-check/(tools・stages)、scripts/formal-verif/、.github/workflows/ci.yml、tests/(該当ピン改訂)。配布面の新設なし。
