# R006 昇格同期とレビュー支援契約の適用

## 要求

R003 と R004 の skill 変更が、source skill と昇格先成果物の間で promote 手順により同期され、変更 PR がレビュー支援契約に従う。

## 受け入れ条件

- 変更対象の source skill（amadeus-validator と参照を追加する phase skill）と昇格先成果物が `dev-scripts/promote-skill.ts` で同期され、内容が一致している。
- `npm run test:it:promote-skill` が pass する。
- 変更 PR の説明が、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従っている。

## 依存

- R003
- R004

## 対応する対象境界

- SC-IN-005

## 未確認事項

- なし。
