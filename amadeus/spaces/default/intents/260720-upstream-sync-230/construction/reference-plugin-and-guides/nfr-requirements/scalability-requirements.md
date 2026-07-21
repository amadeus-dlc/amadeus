# Scalability Requirements — reference-plugin-and-guides

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、一つのauthoring sourceを6 package面と4 self-install面へ決定的に検証するmatrixを対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U11-01 | authoring source | canonical `plugins/test-pro/`一件。 |
| SCALE-U11-02 | package projection | claude/codex/cursor/kiro/kiro-ide/opencodeの6面全数。 |
| SCALE-U11-03 | self-install | claude/codex/cursor/opencodeのclosed list 4面だけ。 |
| SCALE-U11-04 | lifecycle | 一つのtemp hostで宣言成果物のcompose/doctor/drop closureを証明する。 |

fixture fleet、marketplace catalog、kiro/kiro-ide self-install、agents/scopes/memory/knowledge、`when`評価へ拡張しない。

## Scaling strategyと検証

単一sourceを正本として6/4の期待集合をtable-driven matrixで検査する。harness数が増えても面ごとのhardcoded再実装を作らず、U09のcanonical projectionとU10のcompose/dropを再利用する。具体slug、文言、filesystem pathを互換性軸にしない。

## トレーサビリティ

SCALE-U11-01〜04は`business-rules.md`のBR-U11-01〜12、`business-logic-model.md`のSingle E2E lifecycle、`requirements.md`のNFR-1/4/7、`technology-stack.md`に対応する。
