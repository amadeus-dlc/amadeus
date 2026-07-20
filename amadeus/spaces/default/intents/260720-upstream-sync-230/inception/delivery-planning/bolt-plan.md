# Bolt Plan — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。`stories.md` / `mockups.md` は本 scope で SKIP 済み。

E-USSDP1R/2Rの裁定に従うrisk-first 12 one-Unit Bolt計画。Bolt 1–5はU01→U02→U09→U10→U11のprogressive skeleton限定列、Bolt 6–11はDAG内で最大4並行、Bolt 12は全証拠closureである。各Boltはshort-lived branch、独立PR、独立review/rollback/verification境界を持つ。

## Bolt 1–5: Progressive Skeleton（限定例外・直列gated sequence）

`team-practices.md`の「最初のConstruction Boltでend-to-end」を、E-USSUG1 e3留保のplugin 4独立Boltと両立させるため、**最初の5-Bolt列**へ限定して解釈する。単一Boltへbundleしない。各Boltの通常gateに加え、Bolt 5完了時にprogressive skeleton closureを確認する。

| Bolt | Unit | Definition of Done | Confidence hypothesis / expected demo | 独立境界 |
|---|---|---|---|---|
| 1 | U01 `stage-contract` | Unit kind+plugin schemaを単一定義でvalidateし、unknown型をfail-closed、default fixture byte-identical | schema/graph/directive/sensorが同じcontractを解釈するcompile/test demo | 独立PR/review/rollback/targeted tests |
| 2 | U02 `runtime-recovery` | Bolt DAGとgate revisionをidempotentに自己修復し、回復不能をloud failure | 欠落DAG→再計算→再実行no-op、audit二重0のdemo | 同上。U10の必須前提だがplugin codeを含めない |
| 3 | U09 `plugin-projection` | plugin sourceを6 harnessへ投影し、4 self-install境界、plugin 0件byte-identical、drift/orphan guardを証明 | `test-pro`未使用のprojection fixtureと6/4 matrix demo | plugin projection単独PR/review/rollback/verification |
| 4 | U10 `plugin-composition` | no-clobber compose/doctor/dropをtemp treeでatomicに実行し、失敗時host/record/audit不変 | projected bundleをhostへcompose→doctor→dropし、conflictで0 mutationのdemo | plugin composition単独PR/review/rollback/verification |
| 5 | U11 `reference-plugin-and-guides` | `test-pro` sourceとbuild→compose→doctor→drop e2e、reference/authoring guideを完成 | authoring sourceから6面projectionとhost lifecycleを閉じる**e2e closure demo** | plugin reference単独PR/review/rollback/verification + skeleton closure gate |

e2 GoA2留保の必須条件: U01/U09/U10/U11を同一PRへまとめず、4 Unitそれぞれのreview、rollback、verification evidenceを保存する。U11のe2e closureが成立するまでprogressive skeleton完了とみなさない。

## Bolt 6–11: Risk-first parallel waves

| Wave | Bolt | Unit | Definition of Done | Confidence hypothesis / expected demo |
|---|---:|---|---|---|
| 2（最大4並行） | 6 | U07 `harness-hook-correctness` | execPath/Kiro context/project-dir quoteを6面fixtureで固定 | PATHなし・空白path・payloadなしでも全hookが正しく起動 |
| 2 | 7 | U03 `swarm-and-next-stage` | batch advanceとnext stage namingのcharacterization/不足修正 | merge failure非converged、SKIP名非表示、既存同等なら差分0 |
| 2 | 8 | U04 `routing-and-autonomy-guards` | help/24h marker/recompose guardをmutation前に強制 | stale markerとautonomous recomposeがstate不変で拒否される |
| 2 | 9 | U05 `unit-iteration-and-scope-preview` | opt-in unit-majorとcompiled-grid summaryを追加、default不変 | iteration/countが決定的で全scope gridと一致 |
| 3（最大2並行） | 10 | U06 `workspace-inspection` | nested/submodule scanをread-onlyで全入口へ共有 | single/multiple nestedと未初期化submoduleを誤選択なく表示 |
| 3 | 11 | U08 `reviewer-protocol` | runtime UTC date/persona/read allow-listを全投影で固定 | scope外read拒否、固定日付/全record再帰read 0 |

Wave内の番号は追跡IDであり、同wave内の開始優先を表さない。builderは同時最大4。file overlapが実diffで判明した場合は同wave内を直列化するが、Unit/Bolt境界はbundleしない。

## Bolt 12: Verification and Ledger Closure

- Unit: U12 `verification-and-ledger-closure`。
- Dependency: Bolt 1–11全て。
- Definition of Done: 24 item disposition、targeted/ported tests、docs pair、`bun run typecheck`、`lint:check`、`dist:check`、`promote:self:check`、`tests/run-tests.sh --ci`、patch coverage、最終SHAが全てgreen。条件成立後だけledgerをidempotentに`APPLIED`へ遷移する。
- Confidence hypothesis: 実装差分の有無にかかわらず24/24が反証可能なevidenceを持ち、非active plugin/default経路の互換性と6/4配布整合が一つのclosure reportで再現できる。
- Expected demo: item→test/docs/evidence matrix、full command出力、ledger transition/no-op replay。

## 少数案・無効選挙の温存

- E-USSDP1R e3少数案X/GoA2: Bolt 1にU01+U02+U09+U10+U11の最小e2e sliceを束ね、その後各Unitを完全化する案。採用案ではないが、progressive sequence前提が反証された場合の再裁定材料としてrecordに温存する。
- E-USSDP2R e3少数案X/GoA2: record記載の非採用経済案を温存する。
- 旧E-USSDP1/2: 誤前提で無効、開票禁止。計画根拠に使用しない。
