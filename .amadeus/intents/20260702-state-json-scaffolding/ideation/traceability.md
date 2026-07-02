# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-state-json-scaffolding | [20260702-state-json-scaffolding.md](../../20260702-state-json-scaffolding.md) | Inception の要求分析で参照する。 |
| Issue | #311 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/311) | 雛形生成の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-phase-cycle-deterministic-contract | [Discovery Brief](../../../discoveries/20260702-phase-cycle-deterministic-contract.md) | 候補の依存順（ゲート契約の確定後に扱う）の根拠にする。 |
| 先行 Intent | 20260702-phase-gate-approval-contract | [state.json](../../20260702-phase-gate-approval-contract/state.json) | 雛形に含める Task Generation Gate の evidence 形式の定義元として参照する。 |
| 対象境界 | phase 遷移ごとの state.json 雛形生成と同梱スクリプト | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 対象遷移ごとの入出力契約と配置先を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | スクリプトの eval、遷移直後の validator pass、promote 同期の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で雛形生成と検証の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-state-json-scaffolding | 20260702-phase-gate-approval-contract | 雛形に含める approval evidence の形式は、ゲート契約の Intent で確定した Task Generation Gate の契約を前提にするため。 | [intents.md](../../../intents.md) |
| Issue | #311 | #314 | 親 Issue #314 の子 Issue であり、Discovery の候補判断で依存順が確定しているため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/314) |
| アクター | ACT001 Maintainer | なし | スクリプトの配置先、更新規則の強度、Task Generation Gate の承認を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 各 phase 遷移の直後に、validator が `state.json` の構造 fail を出さない。 | scope の SC-IN-001 に記録した。 | 対象遷移ごとの雛形の入出力契約を要求化する。 |
| スクリプトが配布先ユーザー環境で動作する。 | scope の SC-IN-002 に記録した。 | 配置先 skill と実行環境の前提を要求化する。 |
| skill 本文の該当手順からスクリプトの利用を参照する。 | scope の SC-IN-003 に記録した。 | 参照を追加する skill 手順の範囲を確定する。 |
| 先に失敗する eval または検証を追加してから実装する。 | scope の SC-IN-004 に記録した。 | eval の置き場所と実行方法を確定する。 |
| skill 変更として promote 手順で同期し、レビュー支援契約に従う。 | scope の SC-IN-005 に記録した。 | Construction の PR 準備条件へ渡す。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で雛形の入出力契約や配置先がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
