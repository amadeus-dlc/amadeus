# Code Summary — U-3 docs-sensors-sync(#3028 / FR-3)

depth Minimal。詳細実測は `implementation-notes.md`(測定 ref: worktree bolt-docs-sensors、origin/main 0901182c7 断面)。

## 変更ファイル(git diff --stat origin/main..HEAD の転記)

- `docs/harness-engineering/06-sensors.md` / `.ja.md`(各 +4 行 → 14 行。model-completeness 行へプラグイン由来注記を追加)
- 新設 `tests/integration/t3028-sensors-docs-sync.integration.test.ts`(件数フリー集合契約。実 filesystem 走査のため integration tier / size: medium — unit tier size purity ゲート適合)
- record: implementation-notes / plan / 本ファイル / pr-convergence-report(PR #3092)

## 検証

- TDD Red(2 fail)→ Green(3 pass)、落ちる実証1セット(1行除去→赤→復元、残渣 `grep -c` = 14/14)
- FR-3 (1)(2)(3) 全て充足(notes の受け入れ照合節)。conductor 直接実装(builder セッション上限)
