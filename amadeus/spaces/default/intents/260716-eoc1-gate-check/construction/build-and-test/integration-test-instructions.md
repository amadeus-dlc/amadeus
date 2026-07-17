# Integration Test Instructions — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/code-generation/code-summary.md`(spawn 4系)、`../eoc1-gate-guard/code-generation/code-generation-plan.md`、requirements AC-4d。

## 実行手順

- spawn 4テスト(fail-closed 契約: exit 1・非遷移・M-1/M-2 文言・通過時無音)— 上記ファイル内
- `bash tests/run-tests.sh --smoke`

## dogfooding(AC-4d)

本 intent の CG gate-start(16:35:18Z)と本 B&T gate-start が新ガード(ミラー済み .claude tools)を通過 — 0問様式の無条件通過分岐の実運用実測。
