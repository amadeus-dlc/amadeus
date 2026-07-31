# Domain Entities — u1-runner-relocation

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u1 が扱う実体は「ファイル集合と参照グラフ」である(新規ドメイン型の導入なし)。実体と所在を固定する。

## E1: 実行器ファイル集合(移設対象)

| 分類 | 件数 | 定義 |
|---|---|---|
| A(runner 推移閉包) | 16 | run-model-check.ts からの相対 import 到達集合(canonical.ts, contract.ts, fs-tlc-toolchain.ts, run-model-check-*.ts×7, tla-arm.ts, tla-model-loader*.ts×2, tla-model-map.ts, tlc-spawn-planner.ts, tlc-toolchain.ts) |
| B(CI ラッパ) | 7 | run-model-check-ci.ts, run-skeleton-ci.ts, ci-model-check-{runner,domain,artifacts}.ts, ci-docker-trace.ts, node-ci-model-check-port.ts |
| C(診断) | 1 | run-model-check-diagnostic.ts |
| 計 | **24** | 移設対象(component-inventory の 260731 節、機械算出済み) |

分類 D(30 ファイル)は u1 の対象外(u2)。

## E2: 複製モジュール

`amadeus-formal-verif-model-map.ts` — core 正本(packages/framework/core/tools/)と plugin 複製(plugins/formal-model-check/tools/)の2実体。正本→複製の一方向同期、drift 検査が等価性を強制(BR-U1-2)。

## E3: 参照グラフ(書き換え対象の消費点)

| 消費点 | 現参照 | 新参照 |
|---|---|---|
| ci.yml:584/:600 | scripts/formal-verif/run-model-check-ci.ts | plugins/formal-model-check/tools/run-model-check-ci.ts |
| stage 本文 :12/:41(正本+3複製面+dist 8 変種) | scripts/formal-verif/run-model-check.ts | プラグイン相対の tools/run-model-check.ts |
| 既存テスト(A/B/C 消費分 — 実装時に grep で全数棚卸し: inventory-from-grep-each-time) | scripts/formal-verif/* | plugins/formal-model-check/tools/* |
| 台帳2面(allowlist / complexity-baseline)— 対象は実装時 grep で機械算出(T7 の列挙規則。起草時実測: allowlist 7 ファイル 14 件+baseline contract.ts 2 件) | scripts/formal-verif/* パスピン | 新パスへ機械 remap |

## E4: ライフサイクル

移設は1方向・非可逆の1ステップ(旧パスへのフォールバック・シンボリックリンク・互換シムは置かない — org.md Forbidden の互換レイヤー禁止)。失敗時は PR ごと revert で回復する。
