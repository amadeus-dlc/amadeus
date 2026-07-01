# R003: source skill と昇格先成果物の整合

## 要求

source skill と昇格先成果物の差分確認、昇格手段、検証入口を追跡できる。

## 背景

Amadeus では、source skill を `skills/amadeus-*` に置き、昇格先成果物を `.agents/skills/amadeus-*` に置く。
host environment で読まれる内容とレビュー対象がずれると、README や skill 契約の確認結果が実際の利用時に反映されない。

## 受け入れ状態

- `skills/amadeus-*` と `.agents/skills/amadeus-*` の対象差分を確認できる。
- 昇格が必要な場合に `dev-scripts/promote-skill.ts` を使う方針を追跡できる。
- `test:it:promote-skill`、`contracts:check`、`validate:workspace` などの検証入口を確認できる。
- source skill と昇格先成果物のどちらを更新対象にするかを Construction で判断できる。

## 対象境界

- SC-IN-002
- SC-IN-005

## 未確認事項

- 実際に昇格処理が必要かは Construction で差分を確認して決める。
