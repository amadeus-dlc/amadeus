# Integration Test Instructions — 260814-autonomy-stop-fixes

上流入力: `code-generation-plan.md` S2/S4、`code-summary.md` の TDD 実測。

## 新設テスト

`tests/integration/t2974-error-arm-boundary.integration.test.ts`(6 tests、`// size: medium`):

- error アーム正本(stage-protocol.md §11b)の1定義存在(FR-ERR-1)
- 8 ハーネス表層(claude/codex/cursor/opencode/kimi/kiro/kiro-ide/pi)の error アームが正本の4条項(逐語出力 / STOP / 回復・リトライ・取り繕い禁止 / 新規質問・新規ゲート発明禁止)を含むこと(FR-ERR-1 drift ガード)
- `docs/reference/24-intent-autonomy.md` + `.ja.md` の approval boundary 節存在(FR-BND-1)
- stage-protocol.md §11c の decide-question 梯子経由の明記(FR-BND-2)
- pr-convergence.md Guardrail の boundary 改訂 + `never merge` 保持(FR-BND-1)

実行: `bun test tests/integration/t2974-error-arm-boundary.integration.test.ts`(期待: 6 pass / 0 fail)

## 落ちる実証(実施済み・code-summary.md 記録)

cursor 表層へ旧短縮形を注入 → 1 fail 実測 → revert → 残渣ゼロ確認 → 6 pass。

## 回帰

フルスイート `bash tests/run-tests.sh --ci` を conductor ツリーで1回実行し green を確認する(テストファイル新設時の横断ゲート)。
