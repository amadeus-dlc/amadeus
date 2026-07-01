# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | README、`skills/amadeus-*`、`.agents/skills/amadeus-*`、`skill-forge` の確認観点を入力証拠として扱える。 |
| 運用 | feasible | 公開入口 skill と内部 skill の境界を整理すれば、利用者が内部 skill を直接入口として扱う混乱を減らせる。 |
| セキュリティ | feasible | 確認対象は公開済みの repo 内文書、skill、metadata、eval であり、秘密情報の保存を前提にしない。 |
| 依存 | feasible | `20260702-stage-prerequisite-checks` の stage 前提確認と、steering policy の source skill と昇格先成果物の分離方針を根拠にできる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | README に載せる skill の分類、互換性維持対象の有無、stage0 採用可否を判断する。 |
| Agent | 実行者 | `skill-forge` の観点で `amadeus-*` skill と README の整合を確認し、必要な差分を作る。 |
| Reviewer | 参照者 | README、skill 契約、昇格先成果物、検証結果の対応関係を確認する。 |
| Validator | 構造検出者 | Intent 成果物、リンク、状態、必要な成果物の存在を検出する。 |
| Evaluator | 品質評価者 | trigger description や README 分類が期待する使われ方とずれていないかを確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | README と `amadeus-*` skill を `skill-forge` の観点で照合し、公開入口、内部 skill、互換性判断、検証入口を確認する流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 指定された Discovery Brief `discoveries/20260702-internal-skill-forge-readme-alignment.md` の実ファイルは未確認である。
- README に内部 skill を一覧としてどこまで載せるかは Inception で判断する。
- `skill-forge` の eval workflow まで実行するか、まず静的な skill authoring review に留めるかは Inception で判断する。
- Codex metadata の検証を必須にする対象範囲は Inception で判断する。
- 互換性維持対象を `docs/backward-compatibility.md` に追加する必要があるかは Inception で判断する。

## 学習候補

- README は公開入口の案内であり、内部 skill の存在一覧と同じ粒度で扱うとは限らない。
- `skill-forge` の確認は、skill 本文だけでなく trigger description、eval、metadata、昇格先成果物まで分けて扱う必要がある。
- 互換性維持対象が明示されていない場合は、旧入口や別名を増やすより現在の契約へ寄せる判断を先に確認する。
- source skill と昇格先成果物の差分は、README の説明ずれと別の検証観点として扱う必要がある。
