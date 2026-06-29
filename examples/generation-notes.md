# Example generation notes

## 目的

root `.amadeus/` は Amadeus 本体開発用の steering layer として扱います。
そのため例示成果物は、自己開発用 steering layer と混ざらないように `examples/<snapshot>/.amadeus/` に置きます。

## 生成方針

repo root で `npm run examples:generate:real` を実行し、1つの workspace を `.tmp/amadeus-example-generation/workspace/` に作ります。
その workspace で Amadeus skill の順に進めました。
各段階で `.amadeus/` を snapshot として `examples/` にコピーしました。
各 snapshot は、生成に使った source skill の `skills/**/SKILL.md` と md5 を `skill-provenance.json` に記録します。
後続段階の snapshot には、上流段階で使った skill も累積して記録します。

## 使用した skill

| 段階 | skill | 主な出力 |
|---|---|---|
| Steering | amadeus-steering | `.amadeus/` の共有土台 |
| Discovery | amadeus-discovery | `discoveries.md`, `discoveries/20260629-ec-site-construction.md`, `state.json` |
| Intent 初期化 | amadeus-intent-init | `intents.md`, `intents/20260629-minimum-purchase-flow.md`, `state.json` |
| Ideation | amadeus-ideation と内部 skill | `scope.md`, `ideation.md`, `mocks/initial-confirmation.puml`, `traceability.md`, `decisions.md` |
| Inception | amadeus-inception と内部 skill | Requirement、Story、Use Case、Unit、Bolt、追跡、判断 |
| Construction Preparation | amadeus-construction-bolt-preparation | `design.md`, `tasks.md`, `notes.md`, Design Gate ready、Tasks generated、Construction Design 追跡 |

注: Task 生成は Construction Design 後の Construction phase に移行済みです。
`04-inception-completed` は Inception 完了状態として Task を含みません。
`05-construction-design-ready` は Construction の Bolt preparation 完了状態として Task を含みます。

## 生成ログ

詳細ログは Git 管理対象外の `.tmp/amadeus-example-generation/logs/` にあります。
ログには、各 skill の入力、生成された主なファイル、手戻り理由を短く残しています。

## Snapshot の意図

| Snapshot | 意図 |
|---|---|
| `01-discovery-completed` | ECサイト構築テーマを multi_intent と判定し、販売管理の最小購入フローを recommended 候補にした状態を示す |
| `02-intent-initialized` | Discovery の recommended 候補から、販売管理の最小購入フロー Intent の入れ物ができた状態を示す |
| `03-ideation-completed` | Inception に進める最小の Ideation 成果物を示す |
| `04-inception-completed` | 商品選択、販売可能在庫の確認、購入者情報の記録、注文作成を Requirement、Story、Use Case、Unit、Bolt に分ける粒度を示す |
| `05-construction-design-ready` | 注文作成 Bolt の Construction Design が ready、Tasks が generated になり、実装前の追跡ができた状態を示す |

## 例示成果物を root .amadeus に置かない理由

root `.amadeus/` は、このリポジトリ自身の自己開発用 steering layer として読まれる場所です。
例示を root に置くと、読者は自己開発用 steering layer なのか、配布用の例示なのかを区別できません。
そのため、例示成果物は `examples/` に隔離します。
