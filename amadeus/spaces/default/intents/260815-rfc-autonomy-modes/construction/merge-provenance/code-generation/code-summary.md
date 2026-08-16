# Code Summary — unit merge-provenance(C11/FR-9)

## Commits(worktree `bolt-merge-provenance`、base `main@2eb94f1e3`)

| sha | subject |
|---|---|
| `3646bf5a9` | feat(merge-provenance): add recordDelegatedMerge (C11/FR-9) |
| `1b1dc7aff` | test(merge-provenance): pin recordDelegatedMerge behavior (C11/FR-9) |
| `6b3b98174` | chore(audit): bump canonical event-count pins to 94 |
| `77507c9f3` | chore(tests): regen coverage registry for DELEGATED_MERGE_RECORDED |

## 実装 summary

- `amadeus-audit.ts`(+74行): `recordDelegatedMerge(evidence, projectDir, intent?, space?)`。委任マージ(必須CI green ∧ pr-convergence `converged:true`)が行われた事後にのみ、その事実をrecord-onlyで記録。git/GitHubへの書込は一切なし(R-3)。`evidence`の各フィールドをtrim()して空なら拒否(R-7、missing/whitespace-onlyの両方をカバー)。`appended:false`(post-complete seal/fatal latch)のケースはdomain-entities.mdの閉じたrefusalユニオン(evidence-incomplete/event-unregistered)に含めず、同ファイルの`handleAuditFork`/`handleAuditMerge`と同型でthrowする(FDが沈黙している判断であり矛盾ではない、と判定)。
- `amadeus-merge-provenance.ts`(新規、67行): `record --standing-ruling-ref --ci-conclusion --converged-digest`の専用CLI。`amadeus-bolt.ts`への配線なし(unit-of-work-dependency.md:18のゼロ共有ファイル制約に従う設計判断)。
- `event-registry.ts`(+15行): 新規category `"merge-provenance"`(1イベント)、`"merge-dispatch"`とは非conflation(Q3裁定)。
- `audit-format.md`: "Delegated Merge Provenance (1 event)"セクションをMerge Dispatchセクション後に追加。
- `AuditReceipt.eventId`/`committedAt`は`emitCanonicalAuditEvent`自身の`AppendAuditResult`からそのまま取得 — 新規IDスキームは発明していない。
- `tests/unit/t-merge-provenance-record.test.ts`(新規、147行)。

## 検証(実測)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0、468 warnings(改修前後で`git stash`によるA/B比較で同一件数。`amadeus-audit.ts:64 VALID_EVENT_TYPES unused`警告はpre-existingと確認済み) |
| `bun test tests/unit/t28-audit-event-sync.test.ts tests/unit/t81.test.ts tests/integration/event-registry-drift.test.ts tests/unit/t-merge-provenance-record.test.ts` | 40/40 pass、exit 0 |
| `bun tests/gen-coverage-registry.ts --check` | exit 0("OK (fresh, guards green, ratchet held)")、regen後。新規監査ユニット`DELEGATED_MERGE_RECORDED`はテストファイルの`covers: audit:DELEGATED_MERGE_RECORDED`ヘッダー宣言により`status: covered` |

## Red 逐語

Pre-change tree(`git stash -u`、re-grep、`git stash pop`):
```
$ grep -rn "recordDelegatedMerge\|DELEGATED_MERGE" packages/framework/core
(no output)
$ echo $?
1
```
0 hits、exit 1 — 実装前APIが存在しないことを確認(business-rules.mdのRed期待どおり)。

## Green

`bun test tests/unit/t-merge-provenance-record.test.ts` — 7/7 pass: 成功パス(AuditReceipt + append-only行1件、フィールド往復)、2回呼出2行append、fail-closed(evidence3フィールドそれぞれ空欄)×3、fail-closed(空白のみ)、GATE_APPROVEDへの無退行。

## 申し送り

- 逸脱: none。
