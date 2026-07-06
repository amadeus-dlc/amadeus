# Code Generation Plan — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（B001 8 手順 / B002 7 手順）、[business-rules.md](../functional-design/business-rules.md)（BR-1〜10）、[eval-case-design.md](eval-case-design.md)（window 待機中の先行設計）、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 進行状況

| # | 手順 | Bolt | 状態 |
|---|---|---|---|
| 1 | eval (a)(e) 系 26 assertion の先行追加 + RED 確認（15+ fail） | B001 | 完了 |
| 2 | manifest 基盤（型 / read / write / sha256 / INSTALL_MANIFEST_NAME） | B001 | 完了 |
| 3 | copyEngine / copySkills のファイル単位化（enumerateDistFiles = statSync 再帰、removeAbsentFiles = 削除パス + 空 dir 除去、amadeus* filter 両側） | B001 | 完了 |
| 4 | placeAmadeusMd / mergeSettings を InstallRecorder（trackedWrite）経由へ | B001 | 完了 |
| 5 | resolveSourceCommit（REL(#543)-3 try/catch） | B001 | 完了 |
| 6 | parseArgs + --version-info（printVersionInfo。不在 = exit 1 + fix:） | B001 | 完了 |
| 7 | main 結線（previous install / bootstrap / unknown 告知、smoke 成功後のみ manifest 書き出し = REL(#543)-1） | B001 | 完了 |
| 8 | eval GREEN（新規 26 + 既存 274 = 300 全件）+ tsc + test:all exit 0 | B001 | 完了 |
| 9 | §12a review（B001） | B001 | 実施中 |
| 10 | ThreeWayJudge 有効化 + BackupWriter + scanObsolete 判定 + 告知集計 + settings 特則 | B002 | pending |
| 11 | README 英日 + 既知の限界注記 + 自己導入除外確認 | B002 | pending |

## 検証方法

- TDD（RED → GREEN）を全手順に適用（記録は code-summary.md）。
- B001 gate 条件 = 既存 assertion 全 GREEN（従来互換の証明）は 274/274 で充足。
