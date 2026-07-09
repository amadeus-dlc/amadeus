# Code Summary — codekb-repo-name (#668)

## 実装

`codekbRepoName()` の 0-recorded-repos fallback を `basename(projectDir)` から origin remote(SSH/HTTPS 両対応)由来の repo slug(新規 `originRepoSlug()` ヘルパー)に変更し、remote が取れない場合のみ basename に後退。worktree/clone のディレクトリ名依存を排除し codekb 分裂の原因を解消(AC-668-1〜3、選挙 Q4=A の derivation 部分)。

## 変更ファイル

- `packages/framework/core/tools/amadeus-lib.ts`(source of truth)
- dist 4ツリー+self-install の同期(同一コミット — AC-668-6)
- `tests/unit/t182-codekb-placement.test.ts`(回帰3件+既存契約を「remote なし時のみ basename」として re-pin — AC-668-5)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| 回帰テスト(修正前) | 3 fail(`Received: "amadeus-test-r48kDY"` — 落ちる実証) |
| 回帰テスト(修正後) | exit 0(14 pass) |
| typecheck / lint / dist:check / promote:self:check | すべて 0 |
| tests/run-tests.sh --ci | 0(261 files / 3885 assertions。初回は無関係な network stub の flaky 1件、再実行で全緑) |

## PR

https://github.com/amadeus-dlc/amadeus/pull/693(Fixes #668)。AC-668-4(既存分裂ディレクトリ統合)はスコープ外で PR 本文に明記 — conductor がマージ後に実施。
