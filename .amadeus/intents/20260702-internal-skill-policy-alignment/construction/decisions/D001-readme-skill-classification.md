# D001: README skill classification

## 状態

active

## 文脈

Issue #284 は `amadeus-validator` を内部 skill 候補として列挙している。
既存 README では `amadeus-grilling` と `amadeus-domain-modeling` が Internal Skills に置かれていた。
PR 作成後のユーザー判断で、`amadeus-grilling` と `amadeus-domain-modeling` は内部 skill と確認された。

## 判断

README では `amadeus-grilling` と `amadeus-domain-modeling` を Internal Skills に置く。
`amadeus-validator` は workspace と Intent 成果物構造を検証する横断的補助 skill として残す。

## 根拠

- ユーザー判断: `amadeus-grilling` と `amadeus-domain-modeling` は内部 skill である。
- [business-rules.md](../U001-internal-skill-policy-alignment/functional-design/business-rules.md)
- [B001 tasks](../bolts/B001-readme-internal-skill-catalog/tasks.md)

## 影響

- README の Internal Skills は `amadeus-grilling` と `amadeus-domain-modeling` を含む。
- `amadeus-grilling` と `amadeus-domain-modeling` には内部 skill 用の `policy.allow_implicit_invocation: false` を付ける。
- `amadeus-validator` には内部 skill 用の `policy.allow_implicit_invocation: false` を付けない。
