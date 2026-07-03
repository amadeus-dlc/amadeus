# コード構造：amadeus

## ディレクトリ構成

| ディレクトリ | 役割 |
|---|---|
| `.amadeus/` | 自己開発用 workspace（steering layer、intents、knowledge）。この Intent の移行対象。 |
| `skills/amadeus*/` | skill の source。単一入口 `amadeus`、22 ステージ skill、補助入口 6、内部 3。 |
| `.agents/skills/` | 昇格先。`promote-skill.ts` でのみ同期する。 |
| `.claude/skills/`、`.claude/rules/` | `.agents/` への symlink（claude-wiring:check が対を検査）。 |
| `docs/amadeus/lifecycle/` | v2 互換ライフサイクルの契約文書 6 本。 |
| `docs/amadeus/steering.md` | steering layer の契約文書。 |
| `dev-scripts/` | 開発用スクリプト（promote、contracts、examples generator / wrapper / contract、evals）。 |
| `dev-scripts/evals/` | eval 群（amadeus-templates、amadeus-validator、amadeus-validator-domain、amadeus-contracts、promote-skill、claude-host-wiring、index-generate、llm-templates、llm-support）。 |
| `amadeus-contracts/` | skill contract の catalog と生成物（skills.json、references.md）。 |
| `examples/` | v2 契約の snapshot 4 本と skill-provenance.json。 |
| `lints/` | ts-complexity（複雑度 20 上限）と public-type-file（公開型 1 ファイル 1 個）の lint。 |

## 主要モジュール

この Intent（v2 完全準拠）が触る主要モジュールと役割は次である。

- `skills/amadeus/SKILL.md`: Intake、Birth 手順（モジュールファイル、state.json、active-intent、IndexGenerate 呼び出し）、ルーティング、phase 境界、Bolt 実行。Birth 手順が Initialization 0.1〜0.3 への置き換え対象。
- `skills/amadeus/references/stage-catalog.md`: ステージ、skill、scope グリッドの対応表。Initialization stage の追加対象。
- `skills/amadeus/templates/intents/`: Intent モジュールファイルと state.json のテンプレート。aidlc-state.md への置き換え対象。
- `skills/amadeus-validator/validator/AmadeusValidator.ts`（約 1,800 行）: workspace 検査（steering、intents.md、Domain Map、Context Map、Event Storming、grillings）と Intent 検査の入口。workspace 構造の移行と aidlc-state.md 読み取りへの改修対象。
- `skills/amadeus-validator/validator/lifecycle-v2.ts`（約 285 行）: schemaVersion 2 の state 契約検証。stageCatalog 定数（22 ステージの scope 対応と必須成果物名）を持つ。状態形式と成果物名の変更対象。
- `skills/amadeus-validator/scripts/IndexGenerate.ts`: `intents.md` の生成。intents.json registry 追加時の関連対象。
- 22 ステージ skill の `SKILL.md` と `templates/`: 成果物ファイル名（`questions.md`、`units.md`、`plan.md` ほか）の改名対象。テンプレートのファイル名とテンプレート内の相互参照の両方を持つ。
- `dev-scripts/examples-contract.ts`: snapshot の段階不変条件（成果物名を含む）。改名の追従対象。
- `dev-scripts/generate-amadeus-examples.ts` / `validate-amadeus-examples.ts`: examples の生成と検証。プロンプト内のパス指定と期待成果物名の追従対象。
- `dev-scripts/evals/amadeus-templates/check.ts`: skill テンプレートの構造契約（ファイル名と見出し）。改名の追従対象。
- `docs/amadeus/lifecycle/*.md`: 成果物名、state スキーマ、Birth / Initialization の契約記述の更新対象。
- `CONTEXT.md`、`.agents/rules/amadeus-artifacts-and-examples.md`、`AMADEUS.md`、`README.md` / `README.ja.md`: 語彙とパス表記の更新対象。
