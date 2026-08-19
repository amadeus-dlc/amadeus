# Application Design — Component Methods

Intent: 260818-priority-bug-batch-4(depth Minimal — 変更する公開面のメソッド契約のみ。詳細な business rule は code-generation の実装契約(decisions.md の ADR 契約項)が既に固定)

上流: `../requirements-analysis/requirements.md`、codekb `component-inventory.md`(現行シグネチャの census)。

## Unit 1(#2837)

| メソッド / 面 | 現行 | 変更後の契約 | エラー処理 |
|---|---|---|---|
| `InvokeSwarmDirective`(amadeus-directive.ts:312-331) | `{kind, units, cap, repo?, prepared_batch?, retry_unit?}` | batch/pool identity フィールドを追加(具体名・型は ADR-1 契約2〜4 の制約下で code-generation が確定: prepare が受理できる値、retry arm と排他/含意明示) | validator が未知フィールド・二重表現を fail-closed 拒否 |
| `emitConfiguredSwarm(projectDir, units)`(orchestrate.ts:4074) | units のみ受領、batchNumber 破棄 | batch identity を受領し directive へ搬送(`selection.value.pick` から伝搬) | 既存の emit ガード踏襲 |
| `handlePrepare` の `--batch` validator(swarm.ts:554) | `/^[1-9][0-9]*$/` | 搬送 identity の形と同一変更で整合(数値維持なら不変) | 不一致は現行どおり即 fail(loud) |
| conductor 面 7 面の手順 | `--batch <n>` 手動指定 ×5〜6 箇所/面 | directive 搬送値の転記へ書き換え + check_cmd/test_file の正規取得元1節 | — |

## Unit 2(#3106)

| メソッド / 面 | 現行 | 変更後の契約 | エラー処理 |
|---|---|---|---|
| `settlePerUnitOutcomes(projectDir, …)`(orchestrate.ts:4686) | covered ∧ 非 cancelled のみ `Outcome: succeeded` で emit | 追加 arm: canonical projection が terminal と観測した cancelled(/到達実証時 failed)unit へ当該 outcome の行を emit。coverage ゲート(:4707)は succeeded arm 専用のまま | batches null 時の全面 return(:4695-4696)は不変(SR2 は棚卸しのみ) |
| `SETTLED_UNIT_OUTCOME`(:2475) | `"succeeded"` 単一値 | 閉集合 `{succeeded, cancelled, failed}`(ちょうど3値の union 型) | — |
| `readSettledUnitOutcomes`(:2499) | succeeded 以外 throw | 3値を受理、語彙外・鍵欠落は INVALID_SETTLED_ROW throw を維持 | fail-closed 不変 |
| `readPerUnitConsumePopulation`(:2513) | pool event set + settle 行(succeeded のみ) | settle 行の 3値化に追従。数値 batch join(:2527/:2549)・pool 優先 de-dup(:2546-2551)は逐語保存。supersession: 同一 (stage, unit, batch) の複数行は決定的順序(shard 順非依存)で最新 terminal を採る — 具体規則は ADR-2 契約4 | 競合 2 行の非決定は許容しない(テスト固定) |
| fanout `KNOWN_OUTCOMES`(fanout.ts:199) | {succeeded, failed, cancelled, pending, ambiguous} | **変更なし** | pending 述語(:224-228)不変 |

## 入出力型の変更なし面

- audit イベント名(`UNIT_OUTCOME_SETTLED`)、pool coordinator API、`execute-failure-election` / `prepared_batch` arm の既存契約 — いずれも不変(ADR の Alternatives Rejected が根拠)。
