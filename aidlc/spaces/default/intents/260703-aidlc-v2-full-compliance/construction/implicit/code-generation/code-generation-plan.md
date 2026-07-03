# Plan：v2 完全準拠の中核ロジック

## 変更対象

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus/references/aidlc-v2/state-template.md`、`audit-format.md` | v2 一次情報の vendored copy を新規追加（PRE001） |
| `skills/amadeus-validator/validator/aidlc-state-contract.ts`（新規） | `aidlc-state.md` のセクション見出し、checkbox 語彙、全 32 stage slug、parse / 書き込みの契約定数と helper |
| `skills/amadeus-validator/validator/lifecycle-v2.ts` | `state.json` 検証を `aidlc-state.md` 検証へ置き換え。stageCatalog の成果物名を R005 の v2 名へ改名。Initialization 3 ステージを追加 |
| `skills/amadeus-validator/validator/AmadeusValidator.ts` | workspace 検証を `aidlc/spaces/<space>/` 構造（memory / knowledge / codekb / intents / intents.json / active-intent）へ改修 |
| `skills/amadeus-validator/scripts/IndexGenerate.ts` | 新パスで `intents.md` を生成し、`intents.json` と整合させる |
| `skills/amadeus/SKILL.md`、`references/stage-catalog.md`、`templates/` | Birth を Initialization 0.1〜0.3 に置き換え。ルーティングと phase / Bolt 境界を `aidlc-state.md` + `audit/` の読み書きへ変更。state.json テンプレートを廃止 |
| `skills/amadeus-steering/` | 出力先を Space（`memory/`、`knowledge/`、`codekb/`）へ変更 |
| 22 ステージ skill の `SKILL.md` と `templates/` | R005 の改名適用、`<stage>-questions.md`、`intent-statement.md`（1.1）、stage `memory.md` の追加、状態記述を `aidlc-state.md` の checkbox 遷移 + audit イベントへ変更 |
| 内部 skill × 3、`amadeus-grilling`、`amadeus-event-storming`、`amadeus-domain-modeling`、`amadeus-domain-grilling` | 参照パスの追従 |
| `dev-scripts/examples-contract.ts` | snapshot 不変条件を新構造（`aidlc/spaces/default/`、`aidlc-state.md`、`intents.json`、v2 成果物名）へ全面更新 |
| `dev-scripts/generate-amadeus-examples.ts`、`validate-amadeus-examples.ts` | 新構造での生成と検証への追従 |
| `dev-scripts/evals/**`（templates 契約、mock e2e、fixture） | 期待値とパスの追従 |
| `dev-scripts/migrate-workspace-to-aidlc.ts`（新規、TDD） | `.amadeus/` → `aidlc/spaces/default/` の一括移行（steering → memory、knowledge/codebase → codekb、record 改名、state.json → aidlc-state.md 変換、audit 遡及記録、uuid v7 採番、intents.json 生成） |
| 自己開発 workspace | 移行スクリプトの実行結果（`aidlc/` 新設、`.amadeus/` 削除、この record を `260703-aidlc-v2-full-compliance` へ移設） |
| `.gitignore` | v2 規定のカーソル（`aidlc/active-space`、`aidlc/spaces/*/intents/active-intent`）を除外（repo root 限定。examples は対象外） |
| `docs/amadeus/lifecycle/**`、`docs/amadeus/steering.md`、`README.md`、`AMADEUS.md`、`CONTEXT.md`、`.agents/rules/**` | 新構造、新ファイル名、Initialization phase、`aidlc-state.md` を反映した全面改訂 |
| `examples/**`、`examples/skill-provenance.json` | real provider による全 snapshot 再生成 |
| `.agents/skills/**` | `promote-skill.ts --replace` による全変更 skill の昇格 |

## 変更順序

各段階の完了時に検証を green に保つ（INV001）。

1. **S1 契約定数と vendored copy**: v2 一次情報を vendored し、`aidlc-state-contract.ts` を TDD で作る（vendored template を parse できることをテストで先に固定する）。
2. **S2 validator と IndexGenerate**: stageCatalog の改名、`aidlc/spaces/` 構造検証、`aidlc-state.md` 検証、`intents.json` 検証へ書き換える。fixture ベースのテストを先に更新して RED を確認してから実装する。
3. **S3 skill 契約更新**: `amadeus` 入口（Initialization 化）、steering、22 ステージ skill、補助 skill の SKILL.md と templates を更新する。機械的な一括適用は対応表を固定した上で subagent に委譲する。
4. **S4 dev-scripts 追従**: examples-contract、generator、wrapper、eval 期待値、mock e2e fixture を新契約へ更新する。
5. **S5 移行スクリプト**: `migrate-workspace-to-aidlc.ts` を TDD で作る（一時ディレクトリの fixture で移行結果を検証する）。
6. **S6 自 workspace 移行と docs**: スクリプトを repo に適用し、`.amadeus/` を削除し、docs、CONTEXT.md、rules、`.gitignore` を改訂する。
7. **S7 examples 再生成と昇格**: 全 skill を昇格し、examples を real provider で再生成し、`skill-provenance.json` を更新する。

## 検証方法

- S1、S2、S5 は dev-scripts 規則の TDD で進める（先に失敗する検証、失敗確認、最小実装）。
- 各段階の完了時に関連する `npm run test:*` を実行し、S6 以降は `npm run test:all` を基準にする。
- 旧名の残存ゼロを grep で確認する（`state.json`、`.amadeus/`、`units.md`、`unit-dependencies.md`、`design-decisions.md` ほか R005 の旧名。git 履歴と decisions 内の経緯記述は除く）。
- `aidlc-state.md` の構造一致は、vendored `state-template.md` とのセクション / slug 照合テストで確認する。
- examples は validator（workspace と Intent 指定）と invariants 検査で確認する。
- テスト実行結果の記録は Stage 3.6 Build and Test で行う。
