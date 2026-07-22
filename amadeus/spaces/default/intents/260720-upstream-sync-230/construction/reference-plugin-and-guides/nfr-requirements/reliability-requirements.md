# Reliability Requirements — reference-plugin-and-guides

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、lifecycle closure、declared-only mutation、cleanup、documentation fidelityを信頼性境界とする。

## Correctness scenarios

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U11-01 | canonical test-pro validation | U01 schemaで受理され、追加runtime APIを要求しない。 |
| REL-U11-02 | 6 harness projection | U09で同一authoring sourceから6面を決定的に生成する。 |
| REL-U11-03 | compose/doctor | U10で宣言成果物とplugin状態だけを生成・検出する。 |
| REL-U11-04 | record-owned drop | 宣言成果物だけを除去し、unrelated host bytesを維持する。 |
| REL-U11-05 | same-name/malformed/unknown seam | loud rejectを観測し、host/record/auditを不変にする。 |
| REL-U11-06 | success/failure cleanup | tracked source treeへ一時物を残さない。 |
| REL-U11-07 | package/self-install matrix | 6 package面とclosed list 4 self-install面を別々に全数確認する。 |

## Determinism・observability

- 同一authoring sourceから同一projection、compose result、doctor diagnostics、drop resultを得る。
- lifecycle前後のtracked treeとunrelated host bytesを比較し、宣言外差分0を証明する。
- U11はitems 21–22 evidenceだけをU12へ渡し、ledgerを遷移しない。
- 新audit event、metrics backend、retention、cleanup/failure/compatibility意味論を追加しない。

## Verification gate

単一E2Eのpositive/negative/cleanup fixtureと全repository gateを同一最終SHAで通す。`bash tests/run-tests.sh --ci`未実施/stale結果をgreenへ読み替えず、local lcov patch追加行未カバー0と既決spawn/waiver条件を満たす。

## トレーサビリティ

REL-U11-01〜07は`business-rules.md`のBR-U11-01〜12、`business-logic-model.md`のEvidence/failure scenarios、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
