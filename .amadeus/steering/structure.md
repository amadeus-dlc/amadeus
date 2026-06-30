# プロジェクト構造

この文書は、複数 Intent で共有するディレクトリ編成、命名、依存関係、コード構成の原則を扱う。

ファイルツリーの網羅ではなく、新しいファイルを置く判断に使うパターンだけを記録する。

## 編成方針

- target workspace の root `.amadeus/` は、Amadeus 本体開発用の steering layer と Intent 成果物を扱う。
- `examples/**/.amadeus` は、読者向け説明ではなく、skill の実行結果として成立する snapshot として扱う。
- `.agents/skills/amadeus-*` は、host environment で動作する skill と、target artifacts としての昇格先成果物の二重の役割を持つ。

## ディレクトリパターン

| パターン | 場所 | 役割 | 例 | 状態 |
|---|---|---|---|---|
| Steering layer | `.amadeus/` | 自己開発の共有前提を置く。 | `.amadeus/steering.md` | 採用 |
| Intent layer | `.amadeus/intents/<intent-id>-<slug>/` | 個別変更の成果物を置く。 | `.amadeus/intents/20260629-self-dev-steering-layer/` | 採用 |
| Source skill | `skills/amadeus-*` | 作業中の skill source を置く。 | `skills/amadeus-validator/` | 採用 |
| Source skill assets | `skills/amadeus-*/assets` | source skill に属する素材を置く。 | `skills/amadeus-validator/assets/` | 採用 |
| 昇格先 skill | `.agents/skills/amadeus-*` | 実行側が読む skill を置く。 | `.agents/skills/amadeus-validator/` | 採用 |
| 昇格先 skill assets | `.agents/skills/amadeus-*/assets` | 昇格先成果物に属する素材を置く。 | `.agents/skills/amadeus-validator/assets/` | 採用 |
| Example snapshot | `examples/**/.amadeus` | skill 生成結果の snapshot を置く。 | `examples/05-construction-design-ready/.amadeus` | 採用 |
| 参照元 | `CONTEXT.md`、`AMADEUS.md`、`.agents/rules/**/*.md` | 判断、語彙、作業規則の基準を置く。 | `CONTEXT.md` | 採用 |

## 命名規約

| 対象 | 規約 | 例 | 状態 |
|---|---|---|---|
| Intent | `YYYYMMDD-<slug>` | `20260629-self-dev-steering-layer` | 採用 |
| Requirement | `Rnnn-<slug>` | `R001-provenance-recording` | 採用 |
| Unit | `Unnn-<slug>` | `U001-validator-contract` | 採用 |
| Bolt | `Bnnn-<slug>` | `B001-validator-check` | 採用 |

## 依存関係の整理

- GitHub Issue を先に作り、Intent の根拠として記録する。
- PR 作成時は、対応 Issue と `.amadeus/intents/...` をリンクする。
- stage2 は、次回作業の stage0 に自動昇格しない。

## コード構成原則

- skill、validator、example、docs の変更は成果物境界を分ける。
- host environment 側の参照元や assets を target artifacts として更新する場合は、対象 Intent に理由を記録する。
- source skill の assets と昇格先 skill の assets は、所有者と更新手段を分けて扱う。
- repo の開発用スクリプトを、skill の実行時参照として書かない。
- 既存の昇格手段を経由せずに `.agents/skills/amadeus-*` を同期しない。
