# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-phase-gate-approval-contract | [20260702-phase-gate-approval-contract.md](../../20260702-phase-gate-approval-contract.md) | Inception の要求分析で参照する。 |
| Issue | #306 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/306) | 人間ゲートと grilling 起動の Requirement、Acceptance、Use Case の根拠にする。 |
| Issue | #307 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/307) | validator の evidence 検査の Requirement、Acceptance の根拠にする。 |
| Discovery | 20260702-phase-cycle-deterministic-contract | [Discovery Brief](../../../discoveries/20260702-phase-cycle-deterministic-contract.md) | #306 と #307 を 1 Intent に統合する判断（GD002）と候補の依存順の根拠にする。 |
| 先行 Intent | 20260701-decision-review-grilling-gate | [state.json](../../20260701-decision-review-grilling-gate/state.json) | grilling 起動トリガーを追加する decision review 契約を参照する。 |
| 先行 Intent | 20260702-skill-change-review-contract | [state.json](../../20260702-skill-change-review-contract/state.json) | skill 変更 PR に適用するレビュー支援契約を参照する。 |
| 対象境界 | 人間ゲート契約、grilling 起動トリガー、承認 evidence 検査 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 迂回路ごとの契約変更箇所と validator 検査の入力構造を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | skill 本文差分、validator の eval、promote 同期、既存成果物の pass 維持の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で停止、承認、実装開始、検査の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-phase-gate-approval-contract | 20260701-decision-review-grilling-gate, 20260702-skill-change-review-contract | grilling 起動トリガーは decision review 契約への追加であり、skill 変更 PR はレビュー支援契約の適用対象であるため。 | [intents.md](../../../intents.md) |
| Issue | #306, #307 | #314 | 親 Issue #314 の子 Issue であり、同じ Task Generation Gate 契約の両面として 1 Intent に統合したため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/314) |
| アクター | ACT001 Maintainer | なし | Task Generation Gate の承認とゲート契約の強度を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 人間承認なしに実装実行へ進めない契約が、implementation-execution と bolt-preparation の両方から読める。 | scope の SC-IN-001 と SC-IN-002 に記録した。 | 迂回路ごとの契約変更箇所を要求化する。 |
| grilling 起動の決定論的トリガーが、3 つの phase skill の decision review 記述に定義されている。 | scope の SC-IN-003 に記録した。 | トリガーが読む未確定事項の対象範囲と判定形式を確定する。 |
| scaffold-only の許可条件が、確定判断の記録が存在する場合に限定されている。 | scope の SC-IN-004 に記録した。 | 確定判断の記録の種類と確認方法を確定する。 |
| 承認 evidence なしの `passed` が validator で fail になり、`ready_for_approval` は evidence なしで pass する。 | scope の SC-IN-005 に記録した。 | approval evidence の構造を実データから確定し、要求化する。 |
| 既存の examples と `.amadeus/intents/**` が pass を維持する。 | scope の検証戦略と Inception への引き継ぎに記録した。 | 既存実データの調査と移行方法を確定する。 |
| 先に失敗する eval を追加してから実装する。 | scope の SC-IN-006 に記録した。 | eval の置き場所と実行方法を確定する。 |
| skill 変更として promote 手順で同期し、レビュー支援契約に従う。 | scope の SC-IN-007 に記録した。 | Construction の PR 準備条件へ渡す。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降でゲート契約の対象範囲や approval evidence の構造がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
