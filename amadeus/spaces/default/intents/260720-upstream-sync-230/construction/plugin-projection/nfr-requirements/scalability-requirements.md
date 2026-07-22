# Scalability Requirements — plugin-projection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、plugin/artifact数に対する決定的batchと6/4配布matrixを対象とする。

## Capacity境界

| ID | Dimension | Target | Evidence |
|---|---|---|---|
| SCALE-U09-01 | package harness | claude/codex/cursor/kiro/kiro-ide/opencodeの6面を同一snapshotから生成。 | 6面全数matrix。 |
| SCALE-U09-02 | self-install harness | claude/codex/cursor/opencodeのclosed 4面だけ。 | 4面positive+kiro系negative。 |
| SCALE-U09-03 | plugin count | 0件はbaseline不変、1件以上はplugin-owned pathだけ追加。 | 0/1/multiple fixture。 |
| SCALE-U09-04 | drift | 全pathをharness/kind/path順にsortし、先頭failureで残余を隠さない。 | multi-drift fixture全件。 |

6/4は既存closed inventoryである。新harnessやself-install対象は正本承認なしに追加しない。

## Scaling strategy

- source plugin/artifactをcanonical sortして一度validateし、全harnessへmanifest-driven projectionする。
- pluginへharness別分岐を埋めず、既存HarnessManifestのpath/token/rules/frontmatter変換を再利用する。
- temp buildのexpected path/read setからdriftを集合比較し、directory全体の曖昧な成功判定をしない。
- worker service、database index、network registry、marketplaceを追加しない。

## Validation

plugin順・artifact順・filesystem順を反転し、projection bytesとdrift orderの一致を検証する。6 package成功を4 self-install成功の代替証拠にせず、両matrixを独立checkする。

## トレーサビリティ

SCALE-U09-01〜04は`business-rules.md`のBR-U09-03、07〜20、`business-logic-model.md`のOrdering/Compatibility、`requirements.md`のNFR-1/4、`technology-stack.md`に対応する。
