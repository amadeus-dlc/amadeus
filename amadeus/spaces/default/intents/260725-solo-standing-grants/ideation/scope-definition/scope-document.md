# Scope Document: Solo Standing Grant

## Scope Objective

solo modeの人間がactive intentに対して発行したtime-boxed standing grantを、通常stage gateの正当な認可根拠として利用できるようにする。追加の個別`HUMAN_TURN`を不要にしつつ、gateそのもの、human-presence保証、重要境界、audit provenance、team modeの既存挙動を維持する。

最小の利用可能単位は、grantの発行・取消から、対象gateでのroute選択、同一Grant Idのcommit時再検証、成功audit、失効時human fallbackまでを一続きに成立させるvertical sliceである。

## In Scope

### Grant lifecycle

- solo modeでのstanding grant発行と取消
- 発行時active intentへのbinding
- 現行4時間default TTL
- `GRANT_ISSUED`・`GRANT_REVOKED`監査eventの継続利用
- issuer `HUMAN_TURN` provenanceとmalformed・expiry・revocation検証

### Gate authorization

- gateの有無と認可根拠の概念分離
- 通常stage gateに対するintent-bound grant候補のroute時選択
- 選択したGrant Idのdirective carrier
- commit時の同一Grant Id再検証
- grant-backed approval時の正確な`GATE_APPROVED.Grant Id`
- reject／Request Changesをgrant対象外とすること

### Safe fallback

- route後、commit前のexpiry・revocation・target mismatch・gate mismatch検出
- state・completion audit・error auditを変更しないhuman gate fallback
- stage body、reviewer、learningsを再実行せず、既に生成済み成果物を保持すること

### Existing policy preservation

- team modeのleader／delegation経路の後方互換性
- phase-boundary gateの現行default除外
- walking-skeleton gateの現行適用規則
- per-unit Constructionのall-units-covered最終gateだけを認可候補とすること
- halt-and-ask、不可逆external action、unresolved human judgmentの人間統制

### Contract and distribution

- directive schemaとvalidation
- state transitionとaudit event順序
- route／commit race契約
- 全ハーネスのconductor手順
- coreからharness・distへの生成物同期
- help、doctor、stage protocol、state-machine referenceの必要更新

### Verification

- unit test
- integration test
- team／solo回帰test
- phase-boundary／walking-skeleton／per-unit test
- audit exact-count・absence test
- 型check、関連test、全test、生成物drift check

## Out of Scope

- standing grantを保存する新しい設定file、state field、database
- standing grant専用の擬似gate値
- stderr文字列に依存する制御フロー
- team modeのleader／delegation設計の変更
- solo modeでの`DELEGATED_APPROVAL`生成
- standing grantによるreject、Request Changes、halt-and-askの自動判断
- Issue #1466に不要な新grant scope、無期限grant、runtime TTL設定
- AWS、外部認可service、network service、data migration
- PR #1468のmerge、cherry-pick、またはその実装形状を前提とする変更
- Issue外の一般的なgate framework再設計

## Success Boundary

scope完了は、次の観測可能な状態で判断する。

| Scenario | Required outcome |
|---|---|
| solo・有効・対象内 | 個別`HUMAN_TURN`なしでapproval commit |
| grant-backed success | `GATE_APPROVED`にcommit時検証済みGrant Id |
| route後expiry／revocation | 未完了stageのhuman gateを提示 |
| fallback audit | `STAGE_COMPLETED` 0件、`ERROR_LOGGED` 0件 |
| cross-intent grant | 自動承認せずhuman gate |
| phase boundary | 現行opt-in規則どおり。defaultではhuman gate |
| walking skeleton | 実効onならhuman gate |
| per-unit | all-units-covered最終gateのみ候補 |
| team mode | 現行leader／delegation testが不変 |
| distribution | 全harnessが同じ意味論、drift 0件 |

## Value Stream

| Step | Human / system action | Delivered value | Control retained |
|---|---|---|---|
| 1 | 人間がsolo intentでgrant発行 | 承認頻度を意図的に調整 | fresh `HUMAN_TURN` |
| 2 | engineが通常gateと認可候補をroute | conductorが停止要否を判断可能 | gate policyは不変 |
| 3 | full quality pathを完了 | artifact・review・learnings品質を保持 | stage ritualは不変 |
| 4 | commitが同じGrant Idを再検証 | TOCTOUを閉じる | lock内fail-closed |
| 5a | grant有効ならapproval commit | 追加human replyを省略 | exact Grant Id audit |
| 5b | grant無効ならhuman gate | 意図しない自動承認を防止 | state／audit無変更 |
| 6 | revokeまたはTTL expiry | 委任権限を終了 | 通常gateへ復帰 |

## Delivery Principles

1. **Risk first**: cross-intent、grant差替え、誤auditのtest契約を先に固定する。
2. **Small core seam**: gate policy、authorization selection、commit validation、fallbackを分離し、既存team pathを触らない。
3. **Audit event continuity**: 新しい設定modelを作らず、event provenanceを正本とする。
4. **One semantic source**: framework coreを正本とし、全harnessへ投影する。
5. **Evidence before completion**: acceptance criteriaからtest・type・drift evidenceまで追跡する。

## Upstream Traceability

- `../intent-capture/intent-statement.md`: 問題、利用者、9つのSuccess Metrics、非交渉境界
- `../feasibility/feasibility-assessment.md`: 現行team flow、solo gap、条件付き実現可能性
- `../feasibility/constraint-register.md`: mandatory、existing-system、audit constraints

このscopeは3成果物すべてを境界へ反映し、optional market-research成果物は存在しないため仮定していない。
