# Constraint Register — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`。

## Binding Constraints

| ID | 区分 | 制約 | 根拠 | 検証方法 |
|---|---|---|---|---|
| C-01 | Technical | 対象を共有 CodeKB 2ファイルの孤立 sentinel と旧ヘッダ断片に限定する | Issue #1129、commit `5e92d1516` | `git show --stat` と対象 path の diff |
| C-02 | Data integrity | 履歴ブロック本文と per-intent `re-scans` の真実源を変更しない | `intent-statement.md` | 削除行が marker / header の計4行だけであること |
| C-03 | Verification | 対象2ファイルで sentinel 0件、最新ヘッダ各1件を ref 付きで計測する | Issue 成功条件 | `awk` / `rg` の全数走査 |
| C-04 | Delivery | main 取り込みは人間の明示承認を要する | `cid:requirements-analysis:no-ai-merge` | merge 実行前の承認 provenance |
| C-05 | Closure | Issue close は main 着地状態の実測後にのみ行う | `cid:requirements-analysis:close-after-landing-verification` | main ref、件数出力、Issue state の順序 |
| C-06 | Learning | 採用済み diff3 marker 語彙を重複して規範化しない | `cid:reverse-engineering:diff3-marker-vocab` | §13候補の重複照合 |

## Non-Applicable Constraint Domains

| Domain | 判定 | 理由 |
|---|---|---|
| AWS infrastructure | 非該当 | service、account、region、IAM、IaC を変更しない |
| Runtime capacity / performance | 非該当 | 実行コードと workload を変更しない |
| Regulated data | 非該当 | PII / PHI / cardholder data を処理しない |
| External vendor / procurement | 非該当 | 新規依存・契約・費用がない |
| Deployment freeze | 非該当 | production deployment ではなく repository history の着地である |

## Current Measurements

- 修正 commit: `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0`、対象2ファイル、削除4行。
- 修正 commit を含む remote branch: `origin/fix/1027-state-set-fail-closed`。
- 観測した origin/main: `f58b8bbd33d4f5f1ae169c81278c827697730b48`。修正 commit の祖先判定は false(exit 1)だが、対象 sentinel は `0 / 0`。
- intent-capture 時の現 HEAD 測定: sentinel `0 / 0`、最新ヘッダ `1 / 1`。
- Issue state: OPEN。main 着地後検証までは close しない。

## Constraint Ownership

- C-01〜C-03、C-06: conductor / reviewer が証拠を作り、leader が gate で確認する。
- C-04: ユーザーが不可逆操作を承認し、leader が執行する。
- C-05: leader が main 着地と再計測を確認した後に Issue state を更新する。
