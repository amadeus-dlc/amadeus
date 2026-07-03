# アーキテクチャ：amadeus

## 全体構成

Amadeus は「契約」「実行能力」「検証」「実例」「自己開発成果物」の 5 層で構成される。

| 層 | 主な場所 | 責務 |
|---|---|---|
| 契約 | `docs/amadeus/lifecycle/`、`CONTEXT.md`、`AMADEUS.md` | Amadeus DLC の phase、stage、scope、成果物、語彙を定義する。 |
| 実行能力 | `skills/amadeus*/`、`.agents/skills/amadeus*/` | 単一入口、内部 stage skill、補助 skill を提供する。 |
| 検証 | `.agents/skills/amadeus-validator/`、`skills/amadeus-validator/`、`dev-scripts/` | 配布先での構造検証と、リポジトリ開発用 eval、e2e、examples 検証を担う。 |
| 実例 | `examples/`、`examples/skill-provenance.json` | Amadeus DLC の段階別 snapshot と provenance を保持する。 |
| 自己開発成果物 | `aidlc/spaces/default/` | Amadeus 本体開発の Space、Intent、memory、knowledge、codekb を保持する。 |

## 主要な境界

### Space 境界

`aidlc/spaces/<space>/` が Amadeus DLC 成果物の管理単位である。

`default` Space は Amadeus 本体の自己開発に使う。

### Intent 境界

Intent は `aidlc/spaces/<space>/intents/<dirName>.md` と `<dirName>/` の record で構成される。

`intents.json` が registry、`intents.md` が人間向け索引、`active-intent` が現在対象を示す。

### 状態境界

Intent 状態は `aidlc-state.md` が保持する。

`audit/audit.md` はイベントを追記で保持し、既存イベントは書き換えない。

### skill 昇格境界

`skills/amadeus*/` が source skill、`.agents/skills/amadeus*/` が昇格先 skill である。

昇格は `dev-scripts/promote-skill.ts` を通じて行う。

### validator 境界

`amadeus-validator` は配布先ユーザー環境でも実行できる構造検証を担う。

開発用の scripts や eval に依存しない検査は、skill 配下の validator に置く。
