# Code Summary — nsd-provenance(#3155)

branch `open-bug-batch-7/nsd-provenance`(head `fbf7fd315`、push 済み・conductor 統合済み)。方式 = D1'(退役、E-AD-8D942DE5)。実測値は builder 報告(worktree 内実行)からの転記で、conductor 統合断面の再実測は本 summary 末尾。

## 変更ファイル

- 19 files / +246 / −17,416(origin/main..HEAD)
- `tests/no-silent-drop/bootstrap.ts` 461→87 行(provenance 検証チェーン全削除、custody + lineage のみ残置)
- `tests/no-silent-drop/ledger.ts` 308→289 行(`baselineAtRevision`・`CANONICAL_PATHS.baseline`/`.bootstrap` 削除)
- `tests/integration/no-silent-drop-gate.test.ts` −395(events-only fixture へ再構成)
- fixtures 削除: `bootstrap-provenance.json`(2,152 行)+ `bootstrap/` 9 ファイル(14,303 行)
- `t413` events 台帳由来へ組替、adoption evidence 再束縛(別コミット)、allowlist −11

## TDD

- Red: `bun test tests/integration/no-silent-drop-gate.test.ts -t "a trusted base without the event ledger fails closed"` → exit 1(現行 fallback が pass するため)
- Green: 同コマンド → exit 0。新診断 `BASELINE_MISSING` +「trusted base does not contain the event ledger」

## 逸脱(申告済み・裁定 E-AD-6C190CAF で追認)

1. `scripts/no-silent-drop-migrate-events.ts` 削除(readBootstrapProvenance の唯一の残存 importer、一回性の移行スクリプト)
2. `t413` の再構成(provenance 直読 consumer のため強制、census 212 系は不変)
3. 診断文言 `bootstrap base lineage` → `trusted base lineage`
4. adoption evidence rebind(freshness pathspec が編集ファイルを覆うため。`docs/reference/11-contributing.md:313-332` の手順どおり)

## 検証(worktree、exit code は builder 実測)

typecheck 0 / lint 0 / source-only:check 0 / coverage-registry --check 0 / gate+t413+t433+t427 = 95 pass 0 fail / allowlist 検証 4 本 63 pass 0 fail / 実 gate 実行 `status: "pass"` exit 0。参照掃引 8 述語すべて 0 行・exit 1(git grep -F、`:!amadeus/ :!dist/ :!.claude/`)。フルスイートはリモート CI 正(未実行)。

## 申し送り

- `bootstrap.ts` はファイル名のみ残置(中身は custody + lineage。リネームは波及大のため見送り)
- `CANONICAL_PATHS.exemptions` は本退役以前からの死蔵(計画射程外で据え置き)
- conductor 統合断面での再実測(build 不変・gate 実走・参照掃引)は取込後に実施し、結果は §12a レビューの attested context として提示

## 台帳同期

- coverage-registry: fresh(regen 不要を --check で確認)
- coverage-patch-allowlist: `baselineAtRevision` エントリ削除(−11)
