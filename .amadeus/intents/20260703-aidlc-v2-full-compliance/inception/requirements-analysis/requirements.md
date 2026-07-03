# Requirements：AI-DLC v2 への完全準拠

## 一覧

| ID | 要求 | 由来する成功条件 |
|---|---|---|
| R001 | workspace が `aidlc/spaces/<space>/` 構造である | 成功条件 1（構造） |
| R002 | Initialization 0.1〜0.3 が Birth 時に record scaffold と `aidlc-state.md` を作る | 成功条件 1（Initialization） |
| R003 | Intent の状態を `aidlc-state.md` が持ち、`state.json` が退役している | 成功条件 1（状態） |
| R004 | registry が `intents.json` で、record が `<YYMMDD>-<label>` 形式である | 成功条件 1（registry と命名） |
| R005 | v2 規定の成果物が v2 の実ファイル名である | 成功条件 1（成果物名） |
| R006 | 全検証が green で、既存ライフサイクルの意味論が保存されている | 成功条件 2（振る舞い保存） |
| R007 | #369 の確定判断 3・4 の上書きが記録されている | Issue #387 の受け入れ条件 |

## R001：workspace が `aidlc/spaces/<space>/` 構造である

自己開発 workspace を `aidlc/` root へ完全移行する。Space 名は `default` にする（GD002）。

受け入れ条件:

- `aidlc/spaces/default/` に `memory/`、`knowledge/`、`codekb/`、`intents/` が存在する。
- `memory/` は v2 規定の構成（`org.md`、`team.md`、`project.md`、`phases/`、`templates/`）を持ち、旧 steering layer の内容（objective、actors、external-systems、policies、knowledge、glossary、Domain Map、Context Map の各内容）が `memory/` または `knowledge/` 配下へ移設されている。
- 旧 `knowledge/codebase/<repo>/` の内容が `codekb/<repo>/` に存在する。
- `aidlc/active-space` が存在し、`aidlc/spaces/default/intents/active-intent` が Intent を指す。
- 旧 `.amadeus/` が存在しない（GD003。旧構造は git 履歴で参照する）。

## R002：Initialization 0.1〜0.3 が Birth 時に record scaffold と `aidlc-state.md` を作る

`amadeus` 入口の Birth 手順を、v2 の Initialization phase（0.1 Workspace Scaffold、0.2 Workspace Detection、0.3 State Initialization）に置き換える。

受け入れ条件:

- stage catalog（文書、`stage-catalog.md`、validator の契約定数）に Initialization 0.1〜0.3 が全 scope 実行対象として存在する。
- 新規 Intent の Birth で、record 直下に phase ディレクトリ群、`verification/`、`audit/`、`aidlc-state.md` が作られる。
- 0.2 の greenfield / brownfield 判定結果が 0.3 の `aidlc-state.md` のルーティングへ反映される。

## R003：Intent の状態を `aidlc-state.md` が持ち、`state.json` が退役している

Intent 状態の唯一の持ち主を v2 規定の `aidlc-state.md` にする。構造とラベルは v2 のまま使う（GD001）。

受け入れ条件:

- `amadeus` 入口（ルーティング、phase 境界、Bolt 実行）とステージ内部 skill が `aidlc-state.md` を読み書きする。
- validator が `aidlc-state.md` から scope、depth、ステージ状態、approval、gate を検証し、`state.json` を参照しない。
- repo 内（examples を含む）に契約上の `state.json` が存在しない。
- `aidlc-state.md` の構造とラベルが v2 規定と一致する。

## R004：registry が `intents.json` で、record が `<YYMMDD>-<label>` 形式である

Intent の正準 ID を `intents.json`（uuid v7）が持ち、record ディレクトリ名を v2 の `<YYMMDD>-<label>` 形式にする。

受け入れ条件:

- `aidlc/spaces/default/intents/intents.json` が各 Intent の uuid、slug、dirName、scope、repos、status を持つ。
- record ディレクトリ名が `<YYMMDD>-<label>` 形式である（この Intent 自身は `260703-aidlc-v2-full-compliance` へ移設する。GD003）。
- 独自の `intents.md` 索引は人間向けとして併存し、`intents.json` と矛盾しない。

## R005：v2 規定の成果物が v2 の実ファイル名である

v2 が規定する成果物のファイル名と構成を v2 のまま使う。記述系成果物の本文は日本語規範を維持する（GD001）。

受け入れ条件:

- 次の改名が、契約文書、stage catalog、validator の契約定数、ステージ skill、テンプレートで一貫している。
  - `units.md` / `unit-dependencies.md` / `unit-story-map.md` → `unit-of-work.md` / `unit-of-work-dependency.md` / `unit-of-work-story-map.md`
  - `plan.md` / `summary.md`（3.5） → `code-generation-plan.md` / `code-summary.md`
  - `summary.md` / `test-results.md`（3.6） → `build-and-test-summary.md` / `build-test-results.md`
  - `questions.md`（12 stage） → `<stage>-questions.md`
  - `assessment.md` → `user-stories-assessment.md`、`timestamp.md` → `practices-discovery-timestamp.md`
  - `design-decisions.md`（2.6） → `decisions.md`
- Stage 1.1 が `intent-statement.md` を作り、Intent のモジュールファイルは索引・依存・目標プロファイルだけを持つ。
- 各 stage が `memory.md`（v2 構造）を record の stage ディレクトリに残す。
- 旧ファイル名が契約（文書、skill、テンプレート、validator、eval）から消えている。

## R006：全検証が green で、既存ライフサイクルの意味論が保存されている

この Intent は振る舞いを保存する構造変更である。scope グリッド、ゲート、phase 境界、Bolt 実行の意味論を変えない。

受け入れ条件:

- `npm run test:all` が pass する。
- examples の全 snapshot が新契約で real provider 再生成され、validator（workspace と Intent）で pass する。
- 22 ステージの実行条件（ALWAYS / CONDITIONAL）と scope 対応が変更前と同一である（Initialization 3 ステージの追加を除く）。

## R007：#369 の確定判断 3・4 の上書きが記録されている

#369 の確定判断 3（ディレクトリ構成と成果物配置は Amadeus 流を維持）と 4（initialization phase は対象外）を明示的に上書きした事実を、後続が追跡できる形で残す。

受け入れ条件:

- 本 Intent の decision に、上書きの対象、理由、根拠（Issue #387、G001）が記録されている。
- 独自色（grillings、traceability、phase decisions、モジュールファイル、`intents.md` 索引、日本語規範）の再設計が後続検討として分離されていることが読める。
