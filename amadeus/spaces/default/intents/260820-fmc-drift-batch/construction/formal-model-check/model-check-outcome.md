# Formal Model Check — Outcome: NOT_APPLICABLE

- intent: 260820-fmc-drift-batch / 記録日: 2026-08-21
- 直前の適用性判定: `construction/tla-authoring/applicability-assessment.md` — terminal **not-applicable**(選定 subject 0 件。pin 交差ゼロ・語彙 probe 0 hit・namedInvariants 列挙の3点実測)

## 判定

ステージ本文 Step 1 のとおり、`not-applicable` outcome は **`NOT_APPLICABLE` を記録し TLC を起動しない**。`plugin-activation.ts record` も実行しない — 検査を一度も起動していないのに spec hash を lastVerdictHash として永続化すると spec-change advisory を無音抑止する検証劇場になるため(cid:formal-model-check:fmc-no-activation-record-on-not-applicable。本 intent の .tla/.cfg spec ファイルは非接触 — 4 merge commit の `git show --stat -- '*.tla' '*.cfg'` 交差ゼロは applicability-assessment の pin 交差実測に包含)。

## 検証した面(drift 不在)と未検証面の書き分け

- **model-completeness センサー**: 本 conductor checkout で発火し **passed**(`{"pass":true,"findings_count":0}`、fire は audit 記録済み)。model-map の実装ハッシュピンと実ファイル digest の一致 = 本 checkout での drift 不在
- **配送断面(origin/main)の drift 不在**: 4 Bolt PR の CI Success(blocking 集約は model-completeness を含む)で担保 — `build-and-test/build-test-results.md` の merge commit 表参照
- **未検証面**: 登録4モデルの TLC 完全探索は本ステージでは実行していない(NOT_APPLICABLE のため)。既存モデルへの「検出されなかった」主張は本記録からは導出できない(cid:application-design:finite-exploration-not-detected-proof)
