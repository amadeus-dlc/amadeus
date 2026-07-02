# R005 昇格同期とレビュー支援契約の適用

## 要求

R001 から R004 までの skill と validator の変更が、source skill と昇格先成果物の間で promote 手順により同期され、変更 PR がレビュー支援契約に従う。

## 背景

skill と validator の実行時参照は昇格先成果物（`.agents/skills/amadeus-*`）である。
source skill（`skills/amadeus-*`）だけを変更すると、実行時の契約が古いまま残る。
skill 変更 PR には、Intent `20260702-skill-change-review-contract` で確定したレビュー支援契約（挙動差分要約、固定見出し「skill-forge 確認」、粒度制約）が適用される。

## 受け入れ条件

- 変更対象の source skill と昇格先成果物が `dev-scripts/promote-skill.ts` で同期され、内容が一致している。
- `npm run test:it:promote-skill` が pass する。
- 変更 PR の説明が、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- R001
- R002
- R003
- R004

## 対応する対象境界

- SC-IN-007

## 未確認事項

- なし。
