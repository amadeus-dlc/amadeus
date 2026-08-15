# Election Record
Election ID: E-260815-3062-LANDED-FINALIZATION
Run ID: run-2
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-3062-method: Issue #3062: merge queue の auto-merge が report(converged)より先に着地すると、self record の pr-convergence ステージ完了が構造的に不可能になる(CLI 3層 :823/:1260/:1364 の self×landed 全 verb 拒否 × センサーの landed 拒否)。この行き止まりは stage 文書に明記された意図的設計だが、Merge Queue 必須ノルム(project.md CI/CD)・landed 第一級 verdict(pr-convergence-predicate.ts :262/:281)と契約衝突している(クロスレビュー2名一致、xrev-260815-3062)。是正方式を選定せよ。制約: 要求されない後方互換レイヤー禁止(org.md Forbidden)、非 self record の landed 扱い(exit 0)との対称性回復が受け入れ条件(requirements FR-1 (3))、検証劇場禁止。
Established: A: landed 記録方式 — self record でも landed を第一級の最終記録として許可する。CLI 3層の self×landed 拒否を landed 事実の report 書込(kind: landed、merge commit SHA 束縛)へ置換し、センサーは pr-convergence ステージで landed+merge commit 検証付き report を最終収束として合格にする。stage 文書の「landed は収束証拠でない」契約を「landed は record すべき事実」へ改訂 (choice 1)
Choice counts:
- Choice 1 A: landed 記録方式 — self record でも landed を第一級の最終記録として許可する。CLI 3層の self×landed 拒否を landed 事実の report 書込(kind: landed、merge commit SHA 束縛)へ置換し、センサーは pr-convergence ステージで landed+merge commit 検証付き report を最終収束として合格にする。stage 文書の「landed は収束証拠でない」契約を「landed は record すべき事実」へ改訂: 2
- Choice 2 B: override 許可方式 — self×landed の拒否は維持しつつ override verb のみ landed 到達を許し、override 報告(根拠必須)で最終化する。センサーは override を従来どおり合格にする。landed の第一級性は predicate 層に留める: 0
- Choice 3 C: 順序契約方式 — ツールは無変更とし、stage 文書へ「auto-merge 有効化前に report(converged)を実行する」順序契約を明記して運用で回避する。デッドエンド到達時は AMADEUS_SKIP_BLOCKING_SENSOR_GUARD の手動逃がしを正規化: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x0 3x2 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [amend:2026-08-15T00:25:30Z] GoA 3: landed report の合格条件に checkRollupState を硬い必須条件として課さないこと — マージ後の rollup は merge commit の check-runs を読むため無関係な post-merge workflow の失敗で偽 FAILURE 化する既知事象がある(project.md Learnings Inbox cid:code-generation:c1-landed-rollup-attribution)。合格は merge commit SHA と mergedAt の事実束縛を核とし、rollup は記録項目に留めるべき。
- Reservation subagent-2 [amend:2026-08-15T00:25:47Z] GoA 3: A の実装は landed report を実測 merge fact(mergeCommitOid / mergedAt / checkRollupState — 非 self 経路 pr-convergence-cli.ts:1365-1374 が既に書いている値)へ束縛し、converged:false を維持すること(pr-convergence-predicate.ts:281 の『no consumer of converged gains a new way to advance』を壊さない)。マージ後は merge 時点の未解決レビュースレッドを事後再導出できないため、stage 文書には『landed はスレッド閉包の証明ではなく、既に起きたマージの記録である』と明記し、収束証拠と記録事実の区別を残す。旧 self×landed 拒否は削除して置換し、二重経路を残さない(org.md Forbidden)。
Late responses:
- None
Run lineage: run-1 -> run-2

## Timeline
- tallied at=2026-08-15T00:24:29Z run=run-1
- tallied at=2026-08-15T00:29:27Z run=run-2