# ルール配置監査

## 判定基準

| 配置 | 所有する内容 | 配置しない内容 |
|---|---|---|
| `memory/org.md` | フレームワークの全利用者に適用するデフォルト | 特定チーム、リポジトリ、intent の事情 |
| `memory/team.md` | 複数プロジェクトで共有する判断、レビュー、エスカレーション、協働規律 | ランタイム、パス、CI、配布方式、固定メンバー構成 |
| `memory/project.md` | このリポジトリの技術、構造、CI、配布、恒久的な固有契約 | 一時スコープ、担当者、失効規則 |
| `memory/phases/*.md` | 特定フェーズだけで適用する規則 | 全ステージ共通規則 |
| intent record / state | 今回だけのスコープ、担当、期限付き判断 | 恒久的プラクティス |
| `knowledge/` / audit | 失効規則、事例、判断の履歴 | 現在の強制ルール |

## 今回の判定

| 対象 | 判定 | 処置 |
|---|---|---|
| strict-additive 継承の説明 | org/team/project 共通 | 「上書き」表現を廃止し、加算と admission check を明記 |
| `core/`、`harness/`、`dist/` の同期 | project | team の第一原理を一般化し、具体規則を project に集約 |
| Bun、Biome、TypeScript、テストコマンド | project | Testing Posture、Code Style、Tech Stack に集約 |
| release.yml、npm、タグ、CHANGELOG | project | Deployment、Forbidden、Mandated に集約 |
| 選挙、独立レビュー、エスカレーション | team | team に維持 |
| bugs-only の期限付きスコープ | intent record / history | 常時適用ルールから除外 |
| 特定 intent の sibling dependency | intent record / history | project の常時適用ルールから除外 |
| 失効したハーネス固有の役割規則 | knowledge / audit | resolver が読む rule body から分離 |
| ソロ／チームの実行形態 | team | `AMADEUS_OPERATING_MODE` を唯一の判定元とし、両モードと縮退規則を明記 |

## 継続時の配置テスト

新しい規則は、次の順で所属を決める。

1. 別プロジェクトでも文面を変えず適用するか。適用するなら team 候補。
2. 固有パス、ツール、パッケージ、CI、外部サービス名を含むか。含むなら project 候補。
3. 特定フェーズ以外では意味がないか。該当するなら phase。
4. 期限、担当者、Issue 集合、「この intent」を含むか。含むなら memory rule に置かない。
5. 失効済みか。失効済みなら knowledge または audit に置き、rule body に残さない。
6. 複数メンバーを前提とするか。前提とするならチームモード限定と明記し、ソロ時に存在しない投票・レビュー・ack を要求しない。
