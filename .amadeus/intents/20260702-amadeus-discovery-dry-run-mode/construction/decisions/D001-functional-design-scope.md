# D001: Functional Design の範囲

## 背景

この Intent は、`amadeus-discovery dry-run` を読み取り専用 mode として定義する。

対象は skill 契約と検証証拠であり、UI 構成や新しい Bounded Context の採用は含まれない。

## 判断

Functional Design は、U001 と U002 の core 3 文書だけを作る。

`frontend-components.md` は作らない。
Domain Map と Context Map は更新しない。

## 理由

U001 は Discovery の候補表示契約を扱う。
U002 は source skill、昇格先成果物、text contract、validator の同期検証を扱う。

どちらも既存の `BC001 自己開発運用` に収まるため、新しい境界の採用は不要である。

## 影響

Construction の実装対象は、`skills/amadeus-discovery/SKILL.md`、`.agents/skills/amadeus-discovery/SKILL.md`、`dev-scripts/evals/amadeus-templates/check.ts` に限定する。
