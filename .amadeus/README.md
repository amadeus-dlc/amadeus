# Amadeus 自己開発 Steering Layer

## 基本方針

この `.amadeus/` は、Amadeus 本体リポジトリを target workspace とする自己開発用 steering layer である。

この steering layer は、Amadeus DLC を使って Amadeus 自体を開発するときの目的、方針、用語、成果物境界、Intent 一覧を扱う。

個別の skill 変更、validator 変更、example 更新、docs 更新は、Intent ごとの成果物で扱う。

## テンプレート一覧

| 成果物 | 役割 |
|---|---|
| `steering.md` | steering layer の責務境界を扱う。 |
| `steering/objective.md` | 自己開発の目的を扱う。 |
| `steering/product.md` | Amadeus の能力、利用場面、価値仮説を扱う。 |
| `steering/tech.md` | 技術判断、開発標準、実行環境を扱う。 |
| `steering/structure.md` | ディレクトリ編成、命名、依存関係、コード構成の原則を扱う。 |
| `steering/actors.md` | 自己開発に関わる人と agent の役割を扱う。 |
| `steering/external-systems.md` | GitHub などの外部システムを扱う。 |
| `glossary.md` | 確定済み用語と避ける語を扱う。 |
| `steering/knowledge.md` | 背景、前提、未確認事項を扱う。 |
| `steering/policies.md` | 方針、禁止事項、判断基準を扱う。 |
| `development.md` | Amadeus 本体を開発するときの手順を扱う。 |
| `domain-map.md` | 採用済みまたは廃止済みの Subdomain と Bounded Context を扱う。 |
| `context-map.md` | 採用済みまたは廃止済みのコンテキスト間依存を扱う。 |
| `intents.md` | Intent 一覧と依存関係を扱う。 |

## 初回導入

初回導入は [Issue #108](https://github.com/j5ik2o/amadeus/issues/108) を根拠にする。

初回導入の完了条件は、自己開発用 steering layer の導入 Intent を Ideation gate passed にすることである。

## 再初期化

この workspace は [Issue #369](https://github.com/amadeus-dlc/amadeus/issues/369) を根拠に、v2 互換ライフサイクル（単一入口 `amadeus`、schemaVersion 2）の新契約で再初期化した。

- 旧契約の Intent 25 件と Discovery 成果物は削除し、git 履歴に残した。
- 再初期化時点で全 Intent が completed であり、新 Intake で再評価する未完了 Intent はなかった。
- Domain Map は、旧 Intent の判断を根拠にしていた行を旧契約とともに退役し、空の索引へ戻した。
- 共有境界の採用は、Construction の Functional Design 承認後の判断から積み直す。
- 新しい Intent は `amadeus` skill の Intake（合流既定、Birth 提案）から作る。
