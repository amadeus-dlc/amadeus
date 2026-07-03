# アーキテクチャ：amadeus

## 全体構成

Amadeus は「契約（docs）」「実行能力（skills）」「検証（validator と dev-scripts）」「実例（examples）」の 4 層で構成される。

- **契約層**: `docs/amadeus/lifecycle/`（overview、scopes、ideation、inception、construction、state）が 3 phase 22 ステージと `state.json`（schemaVersion 2）のスキーマを定義する。`skills/amadeus/references/stage-catalog.md` がステージと skill の対応表と scope グリッドを持ち、`skills/amadeus-validator/validator/lifecycle-v2.ts` の stageCatalog 定数と一致させる契約になっている。
- **実行層**: `skills/amadeus*/` が source、`.agents/skills/amadeus*/` が昇格先、`.claude/skills/` は昇格先への symlink。単一入口 `amadeus` が Intake、Birth、ルーティング、phase 境界、Bolt 実行を所有し、22 のステージ内部 skill が成果物を作る。
- **検証層**: skill 同梱の `AmadeusValidator.ts`（配布先でも動く実行時検証）と、repo 開発用の dev-scripts（eval、e2e、examples wrapper、contracts、lint）。
- **実例層**: `examples/01〜04` の snapshot と `skill-provenance.json`。`dev-scripts/examples-contract.ts` が snapshot の段階不変条件を一元定義し、generator と wrapper が共有する。

## 主要な境界

- **workspace 構造の境界**: 成果物ルートは `.amadeus/` 固定であり、Space 階層（v2 の `aidlc/spaces/<space>/`）は存在しない。steering layer（`steering/**`、`glossary.md`、`domain-map.md`、`context-map.md`、`intents.md`）が v2 の space memory 相当を担う。`knowledge/codebase/<repo>/` は v2 の `codekb/<repo>/` 相当。
- **状態の境界**: Intent 状態は `state.json`（JSON、schemaVersion 2）が唯一の持ち主。v2 の `aidlc-state.md`（Markdown）、`audit/`、`verification/`、`intents.json` registry は存在しない。状態の読み書きは `amadeus` 入口とステージ skill が行い、検証は `lifecycle-v2.ts` が行う。
- **Birth の境界**: v2 の Initialization phase（0.1〜0.3）は存在せず、`amadeus` skill の Birth 手順（モジュールファイル、state.json、active-intent、IndexGenerate）が代替している。record scaffold（phase ディレクトリの事前作成）はなく、各ステージが必要時にディレクトリを作る。
- **成果物名の境界**: ステージ成果物は `<phase>/<stage-slug>/` 配下に置く（v2 と同一）が、ファイル名は Amadeus 流の短縮名（`units.md`、`questions.md`、`plan.md` など）であり、v2 実ファイル名（`unit-of-work.md`、`<stage>-questions.md`、`code-generation-plan.md` など）と差分がある。差分の対応は lifecycle 文書の「v2 対応」列に記録されている。
- **昇格の境界**: `skills/` → `.agents/skills/` の反映は `dev-scripts/promote-skill.ts` だけが行う。生成物（skill-contract.md、validator/generated 相当）は contracts generator が両側へ直接書く。
