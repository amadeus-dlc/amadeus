# Unit Test Instructions — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md。

## 対象と実行

- `bun test tests/unit/t-test-size-drift.test.ts` — 宣言の妥当性検査(invalid 値ガード・on-disk drift guard・layer×size purity の16 tests)。修正後 exit 0 実測済み
- 新規テスト追加なし(既存 guard が宣言行を恒久検査するため、リグレッションピンは既存機構で充足 — bugfix 姿勢の「対象バグへのリグレッション」は drift guard の落ちる実証で確認)

## 前提条件

追加の手動セットアップ不要 — `bun install --frozen-lockfile` 済みの repo ルートで実行可能。
