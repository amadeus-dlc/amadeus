# Memory: build-and-test

## Interpretations

- 人間指示（PR #417 リカバリ依頼）により、B006〜B009 は単一リカバリ PR で統合実行した。`npm run test:all` と Amadeus Validator は統合して 1 回実行し、結果を各 Bolt record から参照する。
- 契約 needle を持つ skill は、翻訳直後に `test:it:amadeus-templates` の FAIL（RED）を確認してから needle を英語へ更新し、GREEN を確認した。

## Deviations

- rollout plan の「Bolt ごとに個別 PR」から、人間指示により単一リカバリ PR へ変更した。判断は `construction/decisions.md` に記録した。

## Tradeoffs

- provenance は md5 を維持し staleReason で許容した。real provider 再生成は後続 PR で行う。

## Open questions

- なし。
