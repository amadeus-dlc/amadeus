# Integration Test Instructions — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## 実行

- `bun test tests/integration/t232-amadeus-mirror.integration.test.ts` — handler を fake GhRunner+一時 FS fixture で駆動、spawnGh は gh スタブ実行ファイルで実プロセス境界を検証
- フルスイート: `bash tests/run-tests.sh --ci` — Bolt 1 実測 exit 0(RESULT: PASS)

## falling proof(実測済み)

重複 create / AND 検査3態様 / gh 未認証 / フィールド不在 / R-3 部分失敗 — すべて exit 1 経路をテストが実測(code-summary.md の FR→テスト対応表)。
