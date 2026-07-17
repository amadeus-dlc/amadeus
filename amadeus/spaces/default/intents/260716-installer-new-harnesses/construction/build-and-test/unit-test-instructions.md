# Unit Test Instructions — Issue #1048

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-generation-plan.md`(変更目録)、`../installer-enum-extension/code-generation/code-summary.md`(検証実測)。

## 対象と手順

- 契約テスト2本: `bun test tests/unit/setup-harness.test.ts tests/unit/setup-harness-parse.test.ts` — HarnessName 6値 literal 契約(BR-1)
- 全 unit 層: `bash tests/run-tests.sh --ci` に包含

## 落ちる実証(FR-2 — 実測往復)

`HarnessName.all` から1値を一時削除 → 契約テスト exit 1(Received 5≠6)→ 復元 → exit 0。builder(cursor 削除)と reviewer(opencode 削除)が独立に再現。

## 実測

10 tests / 0 fail(契約2本+t230、conductor 裏取り 17:01Z・再接地後 17:29Z の2回)。
