# Component Methods — 260820-fmc-drift-batch

上流入力: `requirements.md` の FR 群と `components.md` の C1〜C4。シグネチャは現行コード(codekb `architecture.md` 260820 節の file:line、CLI 面の全数は codekb `component-inventory.md`)からの delta。詳細な業務規則は functional-design が確定する。`stories` / `team-practices` は不在(設計どおり)。

## C1: ApplicabilityJudge

| メソッド/段 | 変化 | 入出力 | エラー処理 |
|---|---|---|---|
| 判定 pipeline(既存) | terminal route 確定直前に armCheck 段を挿入 | 入力: 既存判定入力 + model-map vocabulary + `<record>/ideation/intent-capture/issue-evidence.md`(存在時) | 腕の判定不能は fail-closed(NFR-2: 明示 halt、素通り禁止) |
| armCheck: vocabularyDrift(新) | 新設 | 入力: 交差モデルの vocabulary + 検査プロパティクラス + 対象実装現行形 → 出力: drift 検出結果(検出時は revise-model 強制評価) | 検出と receipt(FR-ARM-3)を分離しない — Result 判別ユニオンで返す |
| armCheck: defectRecurrence(新) | 新設 | 入力: issue-evidence の bug 実装パス × governed implPath 交差 + 閾値(OQ-4 で確定)→ 出力: 強制起動有無 | issue-evidence 不在は「非発火」(issue-first でない intent の正常系)、parse 不能は fail-closed。**record パスの解決シーム**(CLI 引数で受けるか core の issueEvidencePath を import するか — plugin→core の import 方向新設の可否を含む)は functional-design で確定(OQ-AD-2) |
| coverageCheck(新、FR-ARM-5) | 新設 | 入力: subject 実装面 × governed entries → 出力: 不足面の明記 + entries 拡張の裁定提示(non-target への再分類は行わない — RA §12a MINOR-1、J2d 反証確定) | 不足は halt ではなく判定成果物への明記 + 裁定提示 |
| AUTHORING_ROUTES | 定義削除 → leaf モジュール `authoring-routes.ts` から import(ADR-1 改訂 — C2 直接 import は循環のため不可、実測済み) | — | — |
| stage 契約 `stages/tla-authoring.md`(新規変更面) | 発火述語(腕2本 + 被覆確認)の明文追加 + FR-ARM-6 の two-layer 整合明記 | — | doc 変更 — 対訳 docs(22-formal-model-supply)と同一変更で同期 |

## C2: RegistrationCommitter

| メソッド | 変化 | 入出力 | エラー処理 |
|---|---|---|---|
| `AUTHORING_ROUTES` | 定義削除 → leaf モジュール `authoring-routes.ts`(本 unit 新設)から import(ADR-1 改訂) | — | — |
| `composeRegisteredMap(models, draft, route)` | route 引数追加(FR-REG-1) | revise-model: 同名エントリ置換(provenance は draft 値 — FR-REG-3)/ author-new: append | 置換対象不在の revise-model は Result エラー(明示 kind、FR-REG-2)。author-new 同名は従来どおり validator-rejected |
| `commit(...)` | route を compose へ伝搬 + 名前整合 cross-check(FR-REG-2) | — | fail-open 閉鎖: revise-model + 不在名 = loud 拒否(既存挙動の置換、互換分岐なし) |

## C3: ModelBoundary

| メソッド | 変化 | 入出力 | エラー処理 |
|---|---|---|---|
| `IMPLEMENTATION_PATHS` | 一般形タプル追加(FR-BND-1)+ export(AD Q2=A) | — | — |
| containment 判定(export 名は FD で確定) | validator/loader 共用の1定義(FR-BND-2/6) | path → in/out | 既存拒否メッセージ契約は不変 |
| loader `verifyImplementationEntries` | `implementationRoot` ハードコード撤去 → import 導出 | — | SOURCE_DRIFT 契約は不変(境界集合のみ拡大) |
| sensor `matches` glob | entries 全被覆へ更新(FR-BND-3) | — | glob×境界×entries の drift テスト新設(fail-closed) |

## C4: AdvisoryRetirement(撤去のみ — 新メソッドなし)

撤去対象メソッド/verb: `advisoryHold` / `defaultSubjectsPath` / `subjectsDeclare` / `publishSubjects` / `GovernedSubjects` 型 / failure kind `governed-subjects-unreadable` / USAGE の `advisory hold`・`subjects declare`。dispatch(`:900-901`)から両 verb を除去。
