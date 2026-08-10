# Unit Test Instructions

## Upstream coverage

各Unitの`code-generation-plan.md`と`code-summary.md`が定義するpure seamを対象にする。U-01はdomain constructor/closed vocabulary、U-02は9 family/Event Set/lifecycle、U-03はinterval/accounting PBT、U-04はselection/statistics/report/façade compatibilityを所有する。

## 実行コマンド

```bash
bun test \
  tests/unit/t486-stage-attribution-domain.test.ts \
  tests/unit/t486-stage-attribution-candidates.test.ts \
  tests/unit/t486-stage-attribution-intervals.test.ts \
  tests/unit/t486-stage-stats.test.ts
```

framework setupはBun組込みtest runnerと既存`fast-check` dependencyを使う。追加config、service、seedは不要で、synthetic readonly fixtureを各test内で生成する。

## 合格基準

- 4 filesすべてpass、fail 0。
- 25 FRのpure contract、17 reason precedence、half-open interval、population bijection、nullable summary、legacy SHA characterizationをcoverする。
- shuffle/PBTは順序不変と入力非破壊を検証し、常時passする自己参照assertを許さない。
