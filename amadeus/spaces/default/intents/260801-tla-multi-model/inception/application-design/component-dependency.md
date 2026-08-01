# Component Dependency — 260801-tla-multi-model

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

## 依存グラフ(text 図、矢印は「依存する」)

```
run-model-check-ci.ts ──> node-ci-model-check-port.ts ──> run-model-check.ts
run-model-check-diagnostic.ts ───────────────────────────┘
run-skeleton-ci.ts ──> tlc-toolchain / fs-tlc-toolchain(既存)

run-model-check.ts ──> run-model-check-source.ts ──> tla-model-loader.ts
                                                    └─> tla-model-loader-internal.ts
                                                          ├─> tla-model-map.ts (C1 schema)
                                                          ├─> tla-module-deps.ts (C2 resolver) [新規]
                                                          ├─> canonical.ts (identity)
                                                          └─> contract.ts (Result)

tlc-toolchain.ts ──> tla-arm.ts (C4 語彙型)
amadeus-sensor-model-completeness.ts ──> tla-module-deps.ts (C2 共有)
amadeus-formal-verif-model-map.ts (canonical CLI) ──> tla-module-deps.ts (C2 共有)
                                                   └─> tla-model-map.ts と byte-identical 複製関係(C1)

.github/workflows/ci.yml ──(shell 呼出)──> run-model-check-ci.ts
stages/formal-model-check.md ──(doc 追随)──> 実装 semantics
```

依存ルール:
- C2 リゾルバは `tla-model-map.ts` に依存しない(ソース文字列と readModule シームだけを受ける純粋モジュール)。loader・sensor・canonical CLI の3消費者が上位から fs/読取を注入する。これにより C1⇔C2 の循環を構造的に排除する。
- C4 の語彙供給は model-map.json(C1)を源とし、toolchain は loader 経由で vocabulary を受け取る。toolchain が model-map を直接読む経路は作らない(既存の「loader が唯一の検証済み入口」原則を維持)。
- C6 の CI ポート層は C3/C5 の公開関数のみに依存し、tla-model-loader-internal の internal seam を直接叩かない(現行の wrapper 経由規則どおり)。

## 変更ブラスト半径

### 直接変更ファイル(実装)

| 面 | ファイル | 変更種別 |
| --- | --- | --- |
| C1 schema | `plugins/formal-model-check/tools/tla-model-map.ts` | 拡張(optional 追加) |
| C1 schema | `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` + `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` | 拡張(byte-identical 維持) |
| C2 resolver | `plugins/formal-model-check/tools/tla-module-deps.ts` | 新規 |
| C3 loader | `tla-model-loader-internal.ts` / `tla-model-loader.ts` | 改訂(全モデル化) |
| C4 語彙 | `tla-arm.ts` / `tlc-toolchain.ts` | 一般化(モデル別供給) |
| C5 byte-pin | `run-model-check-source.ts` | 一般化 |
| C6 CI | `node-ci-model-check-port.ts` / `run-model-check-ci.ts` / `run-model-check-diagnostic.ts` / `run-skeleton-ci.ts` | 引数化・反復化 |
| C7 sensor/CLI | `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` + canonical CLI の updateModelMap 経路 | 拡張 |
| C8 宣言 | `specs/tla/model-map.json` | MirrorLifecycle へ auxiliaries+vocabulary 追記。FormalElection にも vocabulary フィールド追加(identity 値・entries 配列は不変、FE Q2=A の非侵襲 optional 拡張) |
| C9 CI 定義 | `.github/workflows/ci.yml` :508-564 | ステップ整備(permissions/timeout/if 不変) |
| C10 doc | `plugins/formal-model-check/stages/formal-model-check.md` | 実装追随 |
| 配布 | `dist/`・`.kimi-code/` 等の生成ツリー | `bun scripts/package.ts` 再生成のみ(手編集禁止) |

### 27 テストファイル(FormalElection 参照)の仕分け(FR-6)

原則: **単一モデル前提の固定に由来するものだけ改訂、参照として正しいものは維持**。

- **改訂が必要(前提が変わる)**:
  - loader 無引数ピン `t-formal-verif-tla-model-loader.test.ts:10-13` — 「全モデルの VerifiedTlaSource 配列」意味へ改訂(requirements FR-4 で確定済みの裁定)。
  - model-map スキーマ表テスト `t-formal-verif-model-map-v2.test.ts` — aux 正例 + exactObject 負例の拡張(FR-1 AC)。既存ケースの期待値は不変でなければならない(不変なら FR-6 違反)。
  - `TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の固定値を直接 import して前提にしているテスト — 定数撤廃または語彙供給化に伴う追従。
  - TRACE 解析・invariant 語彙をグローバル定数前提で検査しているテスト — vocabulary 供給経由の形へ追従(期待語彙値自体は不変)。
- **維持(receipt identity・結果の不変を pin する側)**:
  - frozen model receipt / `hasFrozenModelOutputBinding` 系の pin — FormalElection 語彙の frozen モデルは不変(成功 iii)なので期待値を変えてはいけない。変わったら即座に失敗すべき検査として据え置く。
  - FormalElection の model/cfg identity 期待値を持つテスト — C8 の変更は vocabulary フィールドの追加のみで identity 値・entries は不変のため、期待値は不変。
  - impl-only updateModelMap 統合テスト(t380)系 — entries 書戻し semantics は不変。

正確な27ファイルの個別仕分け表は units-generation / functional-design で実ファイル走査して確定する(本設計では分類基準の確定まで)。

### 共有資源の識別

- `specs/tla/model-map.json` — C1/C7/C8 が読み書きする唯一の宣言源(トラストアンカー)。vocabulary はここに置く(ADR-6)。ただし vocabulary フィールド自体は drift pin の照合対象ではなく、語彙単独の編集はガードを発火させない(ADR-6 の正直な限定どおり)。
- `packages/framework/core/tools/` — implementation entries の sha256 pin 境界。本 intent はこの境界内の `amadeus-sensor-model-completeness.ts` と canonical コピーを変更するため、**model-map.json の entries sha256 も連動更新が必要**(updateModelMap --impl-only 経路、既存運用どおり)。これは成功(iii)の「FormalElection receipt identity」には含まれない(entries hash は receipt ではなく drift pin)が、CI green の前提条件。
- dist/・.kimi-code/ 生成ツリー — package.ts 再生成で追随。
