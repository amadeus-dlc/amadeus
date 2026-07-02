# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-construction-finalization-resume | [20260702-construction-finalization-resume.md](../../20260702-construction-finalization-resume.md) | Inception の要求分析で参照する。 |
| Issue | #309 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/309) | Requirement、Acceptance、Use Case の根拠にする。 |
| 先行 Intent | 20260702-skill-change-review-contract | [state.json](../../20260702-skill-change-review-contract/state.json) | skill 変更 PR に適用するレビュー支援契約を参照する。 |
| 対象境界 | finalization の再開規則と未 finalize 検出 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 再開規則の判定証拠、検出スクリプトの入出力契約を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | skill 本文差分、同梱スクリプトの eval、promote 同期、validator の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で merge 後再実行の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-construction-finalization-resume | 20260702-skill-change-review-contract | skill 変更 PR は、同 Intent で確定したレビュー支援契約の適用対象であるため。 | [intents.md](../../../intents.md) |
| Issue | #309 | #298 | skill 変更 PR の必須条件（挙動差分要約、skill-forge 確認、粒度制約）を前提にするため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/309) |
| 外部システム | EXT001 GitHub | なし | 実装 PR の merge 状態が再開規則の判定証拠候補であるため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | 再開規則の強度と stage0 採用判断を承認するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| merge 後に `amadeus-construction` を再実行するだけで、判断なしに finalization へ入れる。 | scope の SC-IN-001 と SC-IN-003 に記録した。 | 再開規則の判定証拠を要求化する。 |
| 同梱スクリプトで未 finalize の Intent を機械的に列挙でき、配布先ユーザー環境でも動作する。 | scope の SC-IN-002 に記録した。 | 入出力契約と実行環境の前提を要求化する。 |
| 先に失敗する eval または検証を追加してから実装する。 | scope の SC-IN-004 に記録した。 | 検証の置き場所を Inception で確定する。 |
| skill 変更として promote 手順で同期し、レビュー支援契約に従う。 | scope の SC-IN-005 に記録した。 | Construction の PR 準備条件へ渡す。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で再開規則の判定証拠や検出契約がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
