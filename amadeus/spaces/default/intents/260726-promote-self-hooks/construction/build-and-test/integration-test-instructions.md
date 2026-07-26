# Integration Test Instructions — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

テスト戦略: Comprehensive。本変更の中核検証層。

## 対象と実行

- `tests/integration/t299-promote-self-kimi-hooks-merge.test.ts` (新規、FR-3a): promote-self --apply の managed block マージ4経路 — (i) config 不在→追加、(ii) 同一→noop かつ --check hermetic、(iii) 旧版→replace+バックアップ、(iv) dist/kimi 不在→非発火。実行: `bun test tests/integration/t299-promote-self-kimi-hooks-merge.test.ts`
- `tests/integration/t-kimi-doctor-arm.test.ts` (更新、FR-3b): doctor 文言分岐 — 自己開発 fixture→promote-self 誘導、配布 fixture→bunx 誘導、workspaceDir 省略→bunx。実行: `bun test tests/integration/t-kimi-doctor-arm.test.ts`
- `tests/integration/t227-project-skill-projection.test.ts` (追随更新): async 化追随 + KIMI_CODE_HOME 隔離。実行: `bun test tests/integration/t227-project-skill-projection.test.ts`
- `tests/integration/t-kimi-hooks-merge.test.ts` (変更なし・回帰確認): setup module のマージ機構全経路

## 環境

いずれも `KIMI_CODE_HOME` を mkdtemp に save/restore する自己完結型。実ユーザーの `~/.kimi-code/config.toml` には触れない。

## E2E (参考)

`tests/e2e/t-print-kimi-doctor.serial.test.ts` は LIVE GATE (`AMADEUS_KIMI_PRINT_LIVE=1`) つき。期待値は両文言に共通の部分文字列のみで変更不要と確認済 (code-summary.md)。ライブ実行は任意。
