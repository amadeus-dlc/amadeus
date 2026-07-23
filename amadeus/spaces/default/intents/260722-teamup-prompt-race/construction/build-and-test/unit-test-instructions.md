# Unit Test Instructions — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

## 対象と実行

本 fix の検証ロジック(bash 関数)は実 FS(センチネルファイル)を使うため、テスト本体は integration 層に置いた(cid:fs-tests-integration-first — code-generation-plan のテスト設計どおり)。unit 層の新規追加はなし。既存 unit 層の関連テストは以下で回帰確認する:

```
bun test tests/unit/t-team-up-codex-safety-wait.test.ts
```

## 判定

- exit 0 かつ fail 0。実行後、runner の `Ran N tests across M files` と指定ファイル数の一致を確認する(cid:test-path-set-completeness)
