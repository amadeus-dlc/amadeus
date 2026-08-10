# Phase Boundary Verification — CONSTRUCTION → (workflow 終端)

対象 Intent: `260810-plugin-manifest-resoluti` / Scope: `self-fix` / Depth: Minimal
検証方法: `stage-protocol-governance.md` + `.kimi-code/knowledge/amadeus-shared/verification.md`

## Artifact completeness

| Stage | Required artifacts | Status |
|---|---|---|
| code-generation(unit: fix-2823-plugin-manifest-resolution) | code-generation-plan / code-summary / pr-convergence-report | Approved。architecture review READY(BLOCKER 0) |
| build-and-test | build-instructions / unit-test-instructions / integration-test-instructions / performance-test-instructions / security-test-instructions / build-and-test-summary / build-test-results | 本 phase-check とともに gate へ |

## Requirements → 実装 → 検証のトレース

| Requirement | 実装 | 検証 | Status |
|---|---|---|---|
| FR-1 manifest 多面解決 | `resolvePluginManifest`(advisory-declaration.ts) | t444/t445 consumer-layout + FR-8 両腕 | ✅ |
| FR-2 argv plugin-root-relative 規約 | `resolveEvaluatorArgv` | t444 単体 + FR-8 C2/C4(破損 argv で fail-closed 発火) | ✅ |
| FR-3 既存 argv 修正 | plugin.json:61 / advisory-choice.ts:925 | t532 緑 + t445 実ファイル解決 | ✅ |
| FR-4 不在の loud 化 | injectable `warn`(stderr) | t445 pin 書き直し + FR-8 C1/C3(両面不在でのみ発火) | ✅ |
| FR-5 declarationFor 系同一規約 | stagingRoot 通し | t445 declarationFor 系 staging テスト | ✅ |
| FR-6 drift guard | t532 新規 | HEAD で赤 / fix 後緑(failing-first 実測) | ✅ |
| FR-7 consumer-layout 回帰テスト | t445/t353 追加 | failing-first 4 件とも HEAD で赤を実測 | ✅ |
| FR-8 consumer 実測 | —(実測タスク) | /tmp/xrev2823-fr8-results.md、両腕 PASS | ✅ |
| NFR-1 後方互換 | 既存テスト無修正緑(FR-4 pin のみ意図的書き直し) | t526/t528/t529/t458/t527 他 136 pass | ✅ |
| NFR-2 決定性 | compose/digest 経路非接触 | t416 系に変更なし・非接触を diff で確認 | ✅ |
| NFR-3 最小侵入 | transform 拡張子限定 非接触 | git diff で対象外ファイルの非変更を確認 | ✅ |

orphan requirement 0 件。全 FR/NFR が実装と検証にトレースされる。

## Consistency checks

- 変更ファイル: `amadeus-advisory-declaration.ts` / `amadeus-advisory-choice.ts` / `plugins/formal-model-check/plugin.json` / テスト 4 ファイル(t444/t445/t353 変更、t532 新規)+ 成果物群。計画外のソース変更なし
- センサー: build-and-test の produces 作成時の hook 火災で FAIL 詳細なし(別途 lint/type-check は build 検証で exit 0)
- 全体回帰の既存失敗 3 群は HEAD 対照で同一シグネチャ(無交差の実測根拠は build-test-results.md)

## Open issues

- `ADVISORY_CODES` validator 未追随(宣言 advisory を載せた directive が exit 1)— main 既存、起票候補
- `install <path>` basename 粒度の usability note — 起票候補
- reviewer FOLLOW-UP: `declaredFormalCheckArgv` の formalCheck argv は plugin-root join 対象外(formalCheck 宣言時に同クラスが潜伏)— 起票候補
