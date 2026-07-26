# Unit Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

## 対象テスト

各修正の regression テスト(赤→緑で固定済み、code-summary 参照):

| Unit | テスト | 内容 |
|---|---|---|
| fix-1457 | `tests/unit/t238-election-record.test.ts` | verifySelf 新シグネチャ(BallotCounts)+独立ソース比較 |
| fix-1459 | `tests/unit/t234-election-model.test.ts` | parse fail-closed 3面(空 choices / internalNo 重複 / voter 重複)+汚染機序 |
| fix-1489 | `tests/unit/t229-coverage-patch-gate.test.ts` | allowlist 行ピン整合 |

## 実行と配置規律

実行: `bun test <path>`。unit 層は純関数層のみ(実 FS は integration 層 — cid:code-generation:fs-tests-integration-first 準拠)。
