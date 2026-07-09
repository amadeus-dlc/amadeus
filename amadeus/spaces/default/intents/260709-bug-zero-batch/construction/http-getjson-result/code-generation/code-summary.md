# Code Summary — http-getjson-result (#677)

## 実装

`packages/setup/src/ports/http.ts` の `getJson()` で `checked.value.json()` を try/catch し、parse 失敗を `FetchError.payloadInvalid(...)` として `Result.err` に分類(AC-677-1〜2)。fetchChecked のネットワーク/HTTP 分類・downloadArchive は不変(surgical)。

## 変更ファイル

- `packages/setup/src/ports/http.ts`(本体)
- `tests/unit/setup-http.test.ts`(新規3ケース: 非JSON→err/payload-invalid、valid JSON→ok、404→status — AC-677-3)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| setup-http.test.ts(修正前) | exit 1(SyntaxError throw — 落ちる実証) |
| setup-http.test.ts(修正後) | exit 0 |
| typecheck / lint / dist:check / promote:self:check | すべて 0(core 未変更) |
| tests/run-tests.sh --ci | t92 1件の既存赤(packages/setup 外)。bun test tests/unit/ 直実行時の state 系37赤は run-tests.sh が設定する suite env 不在によるもので、--ci プロファイルでは発生しない |

## PR

https://github.com/amadeus-dlc/amadeus/pull/694(Fixes #677)。AC-677-1〜3 充足。
