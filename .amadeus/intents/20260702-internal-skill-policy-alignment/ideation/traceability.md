# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-internal-skill-policy-alignment | [20260702-internal-skill-policy-alignment.md](../../20260702-internal-skill-policy-alignment.md) | Inception の要求分析で参照する。 |
| Issue | #284 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/284) | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| Discovery | 20260702-internal-skill-forge-readme-alignment | [Discovery Brief](../../../discoveries/20260702-internal-skill-forge-readme-alignment.md) | multi_intent の recommended 候補として扱う。 |
| 対象境界 | Internal Skills 一覧、内部 skill 判定、暗黙起動ポリシー、Codex と Claude Code の設定確認 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | README、設定、検証観点を分けて扱う入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator、設定構造確認、README 差分確認、必要なテストを PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で対象範囲の確認例にする。 |
| 学習候補 | Discovery 候補 ID | [ideation.md](ideation.md) | 後続 Issue 候補として報告する。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-internal-skill-policy-alignment | なし | Issue #284 の recommended 候補は、現在の skill ディレクトリと README の差分を整理するため、既存 Intent の完了を前提にしない。 | [intents.md](../../../intents.md) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、CI、review comment を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | 内部 skill と公開入口 skill の境界、README 掲載範囲、PR merge 可否を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| `README*.md` の Internal Skills 一覧が現在の内部 skill 構成と照合されている。 | SC-IN-001、SC-IN-002 に記録した。 | README 一覧と skill ディレクトリの差分確認に落とす。 |
| 内部 skill と公開入口 skill の判断基準が追跡できる。 | SC-IN-002 に記録した。 | Requirement と decision に落とす。 |
| `policy.allow_implicit_invocation = false` を設定する対象が整理されている。 | SC-IN-003 に記録した。 | 設定対象と配置先の確認に落とす。 |
| Codex と Claude Code の両方で設定配置先が確認されている。 | SC-IN-004 に記録した。 | Codebase Analysis と検証観点に落とす。 |
| `skill-forge` 監査と `SKILL.md` 英語化を後続候補として分離する理由が追跡できる。 | SC-OUT-001、SC-OUT-002 に記録した。 | decisions に対象外判断として落とす。 |

## 逆方向 feedback

Discovery の Intent 候補に安定した候補 ID がない問題は、この Intent の成功条件には含めない。

ただし、コマンドや短い自然文で候補を指定しにくい運用上の課題であるため、後続 Issue 候補として扱う。
