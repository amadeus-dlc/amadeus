# Code Summary — dag-integrity(U1、Bolt 1)

上流入力(consumes 全数): code-generation-plan.md、business-rules.md、domain-entities.md、requirements.md

- 着地: conductor ブランチへ --no-ff マージ(merge commit `185f66f8e`、parent 2 = `2467f3b5e`)。finalize verdict: converged 1 / failed 0 / merge_failures 0(HEAD 非前進のため conductor 明示マージで回収 — cid:code-generation:c2 準拠、ls-files -u 0・マーカー grep 0 確認済み)。

## 実装(FR-3 / FR-5)

- **C5 `computeBoltDagOutcome`**(`packages/framework/core/tools/amadeus-runtime.ts`): `BoltDag | undefined` を3値 union(`dag` / `absent` / `invalid`+detail)へ置換。compile 分岐: `dag` → `graph.bolt_dag`(バイト不変)、正当欠落(scope-skips-units / degrade×absent)→ `graph.bolt_dag_absence`、units-generation 実行スコープ×(absent OR malformed)→ throw・非ゼロ exit(hook `recordHookDrop` :210-216 が stderr を捕捉)。スコープ判定は compile が既保持の stateContent への `parseCheckboxes` — 新規 I/O ゼロ(NFR-3)。
- **BR-U1-2**: file-present×malformed は全スコープで invalid(x/S/空白の3状態でテスト固定 — FD iteration 1 advisory をここで閉包)。
- **C6 `bolt_dag_absence`**: `BoltDagAbsence` 型を amadeus-lib.ts から export。消費者 (i) `readBoltDagAbsence`(amadeus-orchestrate.ts、+23行)実装・assert 済み。消費者 (ii)(degrade 経路文言)は U2 所掌。
- **FR-5**: `260712-metrics-observation/.../unit-of-work-dependency.md` — `- id:`→`- name:`(3箇所)、`edges:` 節削除、行内コメント削除、H2 floor 用の散文節追加。parseBoltDag ok、batches `[["U1","U2"],["U3"]]` = 散文 W1/W2 と一致。audit 無改変(ruling B)。
- **docs**: 13-runtime-graph / 17-skill-system / 08-construction-and-swarm の en+ja 対を同一変更で更新。
- **NFR-2**: recoverBoltDag / readBoltDagBatches / parseUnitsBlock 無改変(parser は strict のまま)。

## テスト

- 新規 `tests/integration/t399-bolt-dag-outcome.test.ts`(12 tests): 6行判定表の in-process 駆動+compile exit code 契約+invalid arm の in-process throw+graph 不在時の readBoltDagAbsence。
- t133 契約改訂(宣言済み revision): 観測点移動+6a/6b 分割(4键→5键 envelope は意図的 retire)。fixture 現実化 6ファイル(`seedUnitDependency` ヘルパ新設)。
- AC 全通過: AC-3a / AC-3a2 / AC-3b / AC-3c / AC-5a(39/39 — corpus が本 intent 分+1)/ AC-5b(required-sections 相当の機械検査 pass)。Red verbatim は builder 報告(scratch cpg-bolt1-report.md)に固定。

## 検証(最終ツリー、全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci(725 files、0 fail)/ patch gate 71/71 covered(allowlist 追加 0 — catch/throw は refactor+in-process 駆動で閉鎖)/ project gate 89.41% / complexity gate。t92 flake 1回(sensor 経路、並列負荷起因、再走 green×3 — 本変更はセンサー非接触)。

## 逸脱申告

1. スライス1の TDD 粒度(seam 不在 Red → 一括 Green、挙動 Red は事後の pre-fix 面切替で verbatim 捕捉)— builder 申告どおり受理。
2. `d34ed59ae` は ambient record churn(patch gate の dirty-tree 拒否対応)— マージ時に conductor シャード(prefix 上位集合)を採用して解消。
