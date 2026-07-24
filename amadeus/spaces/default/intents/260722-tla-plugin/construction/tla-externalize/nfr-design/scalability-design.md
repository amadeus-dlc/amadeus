# Scalability Design — U1 tla-externalize

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 成長モデル

- 1モデルを1組の`.tla`、`.cfg`、identityとして分離し、追加モデルも同じ独立単位で登録する。
- `model-map.json`は実装ファイルentryの線形集合とし、単一entryの検証を共有関数へ閉じ込める。巨大な共有文字列や全モデル結合identityは作らない。
- 複数呼出しはstatelessな独立processとして扱い、共有mutable cache、queue、databaseを導入しない。

## 容量境界

- 現行の単一モデルでは逐次読込・逐次hashを採用する。通常CI予算を超えた実測が得られるまでparallel hashやshardingを採用しない。
- entry増加時も計算量O(n)・O(bytes)を維持し、同じrelative pathの重複はload前に拒否する。
- horizontal scaling、load balancer、auto-scalingは常駐serviceがないため非該当である。
