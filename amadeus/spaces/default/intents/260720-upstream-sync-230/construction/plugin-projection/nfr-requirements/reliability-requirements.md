# Reliability Requirements — plugin-projection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、deterministic generation、no-partial update、drift completeness、baseline compatibilityを信頼性境界とする。

## Correctness・failure containment

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U09-01 | plugin directoryなし/0件 | 既存6 harness/CLI bytes不変。 |
| REL-U09-02 | valid plugin | 6 host projection+dist/pluginsを同一source snapshotから決定生成。 |
| REL-U09-03 | malformed/duplicate/unsafe/collision | loud failure、dist/self-install bytes不変。 |
| REL-U09-04 | missing/different generated path | MISSING/DIFFERS、check非0、write 0。 |
| REL-U09-05 | generated-only path | ORPHAN、check非0、write modeはownership内sweep。 |
| REL-U09-06 | discovered source未参照 | UNREFERENCED、check非0、source非削除。 |
| REL-U09-07 | kiro系self-install要求 | closed-union failure、project-local bytes不変。 |

## Determinism・observability

- 同一source、C1 normalized manifest、HarnessManifest、packager versionから同一bytesを得る。
- driftは全件をcanonical sortして返し、path/kind/reasonを既存check outputへ示す。
- package 6面とself-install 4面を独立記録し、一方を他方のgreenへ流用しない。
- new audit event、metrics/tracing backend、retention、alert thresholdを追加しない。

## Verification gate

zero/valid/invalid/collision/drift/6x4 matrix testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。push前local lcov patch未カバー0、spawn seam、既決waiver証拠条件を満たす。

## トレーサビリティ

REL-U09-01〜07は`business-rules.md`のBR-U09-01〜21、`business-logic-model.md`のFailure/Verification、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
