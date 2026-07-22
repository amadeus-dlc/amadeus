# Scalability Requirements — verification-and-ledger-closure

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、24 item、全Unit evidence、必須gate、docs検査の決定的集約を対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U12-01 | disposition | approved 24 item全数を固定集合として評価する。 |
| SCALE-U12-02 | evidence | 各itemに最低1つの自動testまたは明示docs検査を対応付ける。 |
| SCALE-U12-03 | verification | targeted + typecheck/lint/dist/promote/full CI/coverageを同一SHAへ束ねる。 |
| SCALE-U12-04 | ledger | 一回の最終transitionだけを既存atomic writerへ渡す。 |

動的item追加、partial batch closure、parallel ledger writer、第二evidence store、別coverage indexを追加しない。

## Scaling strategyと検証

24/24、23/24、evidenceなし、partial EQUIVALENT、各gate単独failure、別SHAをtable-driven fixtureで対照する。Unit数やevidence数が増えても判定集合・順序・closed unionを変えず、U12に機能実装を追加しない。

## トレーサビリティ

SCALE-U12-01〜04は`business-rules.md`のBR-U12-01〜13、`business-logic-model.md`のCoverage/Phase workflows、`requirements.md`のNFR-1/4/7、`technology-stack.md`に対応する。
