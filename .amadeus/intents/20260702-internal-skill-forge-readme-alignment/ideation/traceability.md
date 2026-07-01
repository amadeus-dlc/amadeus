# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-internal-skill-forge-readme-alignment | [20260702-internal-skill-forge-readme-alignment.md](../../20260702-internal-skill-forge-readme-alignment.md) | Inception の要求分析で参照する。 |
| 入力テーマ | `amadeus-* skill を skill-forge で確認する` | ユーザー入力 | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| 指定 Discovery Brief | `discoveries/20260702-internal-skill-forge-readme-alignment.md` | ユーザー入力 | 実ファイルが存在しないため、Inception で根拠の扱いを再確認する。 |
| 先行 Intent | 20260702-stage-prerequisite-checks | [state.json](../../20260702-stage-prerequisite-checks/state.json) | skill 供給元、昇格先成果物、host environment の区別を参照する。 |
| 対象境界 | README と `amadeus-*` skill の skill-forge 確認 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | README、skill 契約、eval、metadata、昇格先成果物の確認粒度を決める入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | skill-forge review、README 差分、validator、必要な text contract の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-internal-skill-forge-readme-alignment | 20260702-stage-prerequisite-checks | `amadeus-*` skill の供給元、昇格先成果物、README の公開入口説明を区別して確認する必要があるため。 | [intents.md](../../../intents.md) |
| 参照元 | README | なし | 公開入口 skill、補助 skill、内部 skill の現行説明を確認するため。 | [README.md](../../../../README.md) |
| 参照元 | skill-forge | なし | skill の trigger description、本文、eval、Codex metadata を確認する作業手順の基準にするため。 | [skill-forge](../../../../.agents/skills/skill-forge/SKILL.md) |
| 参照元 | backward-compatibility rule | なし | 互換性維持対象が明示されていない場合の判断基準にするため。 | [backward-compatibility.md](../../../../.agents/rules/backward-compatibility.md) |
| 外部システム | EXT001 GitHub | なし | 後続 Issue、PR、review comment、CI 状態を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | README 分類、互換性維持対象、stage0 採用判断を承認するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| README に載せる公開入口 skill と内部 skill の境界を説明できる。 | scope の SC-IN-001 と SC-IN-004 に記録した。 | README 分類基準として要求化する。 |
| `skill-forge` で確認すべき観点を分けて整理する。 | scope の SC-IN-003 に記録した。 | trigger description、本文、eval、Codex metadata、昇格先成果物の確認項目に分解する。 |
| source skill と昇格先成果物の差分確認、昇格手段、検証入口を渡す。 | scope の SC-IN-002 と SC-IN-005 に記録した。 | 具体的な既存コード分析と Unit に分解する。 |
| 互換性維持対象がない場合に、旧入口や別名を暗黙に残さない。 | scope の SC-IN-006 に記録した。 | `docs/backward-compatibility.md` の有無と例外判断を acceptance に落とす。 |
| README だけを直して skill 契約、validator、example とのずれを残さない。 | scope と ideation の検証戦略に記録した。 | Construction の検証条件へ渡す。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で README 分類と skill 契約のずれが大きいと分かった場合は、後段成果物だけを補修せず、Ideation の対象境界へ戻す。
