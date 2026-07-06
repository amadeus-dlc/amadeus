# Requirements：v2 パリティ完成

## 一覧

| ID | 要求 | 由来する成功条件 |
|---|---|---|
| R001 | TS エンジン一式が適応コピーされ、このリポジトリで動作する | 成功条件 3（1 周完走）、成功条件 1（パリティ） |
| R002 | エンジンの質問提示が amadeus-grilling へ結線されている | 成功条件 3、C005 |
| R003 | stage skill が本家版へ置換され、対応漏れ 15 skill が追加されている | 成功条件 1 |
| R004 | 独自 skill が整理されている（5 削除、steering 畳み込み、3 維持） | 成功条件 1、C005 |
| R005 | Operation phase（4.1〜4.7）が CONDITIONAL な実行対象である | 成功条件 1、D005 |
| R006 | Intent record の成果物が v2 と双方向一致する | 成功条件 1、GD009 |
| R007 | sensor と validator が併用され、必須節定義が共有されている | 成功条件 1、D004 |
| R008 | パリティ検査が機械化され green である | 成功条件 1、GD007 |
| R009 | 規範文書が新契約へ改定されている | 成功条件 1、C004 |
| R010 | 全検証が green で、examples が新契約で再生成されている | 成功条件 2 |
| R011 | この Intent 自身が新エンジン駆動で 1 周完走している | 成功条件 3 |

## R001：TS エンジン一式が適応コピーされ、このリポジトリで動作する

本家 `dist/claude/.claude/`（基準 commit `fde1e1af`）の tools（26 個）、hooks（11 個）、sensors（4 個）、aidlc-common（conductor、stage 定義 31 個、protocols）を適応コピーする。

受け入れ条件:

- `bun` でエンジンの主要コマンド（orchestrate の next / report、utility の intent-birth を含む）が実行できる。
- hook と settings は aidlc-* 名前空間で既存 `settings.json` へマージされ、既存開発環境（kiro skill 群、既存 hooks、dev-scripts）の挙動が変わらない（C001）。
- 上流の `aidlc/` seed は取り込まず、既存 `aidlc/` 実データが保持されている。

## R002：エンジンの質問提示が amadeus-grilling へ結線されている

受け入れ条件:

- ステージがユーザー入力を要する場面で、一問ずつ推奨回答付きの対話（amadeus-grilling プロトコル）が行われる。
- 確定結果が v2 形式の `<stage>-questions.md`（A〜E+X 選択肢、`[Answer]:` タグ）へ記録される。
- 結線のための本家改変が最小点に限定され、パリティ検査の除外リストに記録されている。

## R003：stage skill が本家版へ置換され、対応漏れ 15 skill が追加されている

受け入れ条件:

- skill 一覧が本家 38 skill と名前写像（aidlc-* ↔ amadeus-*）で 1 対 1 に対応する（意図的除外は除外リストに明記）。
- 対応漏れ 15 skill（init 相当、session-cost、replay、outcomes-pack、scope 系 4 個、Operation 系 7 個）が存在する。
- すべての SKILL.md と TS スクリプトが英語である（C004）。

## R004：独自 skill が整理されている

受け入れ条件:

- amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming が削除されている（source と昇格先の両方）。
- amadeus-steering が独立入口として退役し、Space bootstrap が 0.1 に、memory 昇格が 2.2 に畳み込まれている。
- amadeus-grilling、amadeus-domain-modeling、amadeus-validator の機能が失われていない（C005）。

## R005：Operation phase が CONDITIONAL な実行対象である

受け入れ条件:

- stage catalog と state 初期化で 4.1〜4.7 が本家と同じ CONDITIONAL な実行対象である。
- 「Operation は Amadeus 対象外」の規定が契約文書（AMADEUS.md、lifecycle 文書、stage catalog）から消えている。

## R006：Intent record の成果物が v2 と双方向一致する

受け入れ条件:

- 新規 Intent で、v2 規定の成果物（0.1〜0.3 の出力、`verification/phase-check-<phase>.md`、`<stage>-questions.md` 形式、per-clone audit shard、`decision-log.md`）が生成される。
- 独自成果物（grillings、独自形式の phase decisions と traceability、Intent モジュールファイル、`intents.md` 索引）が新契約から消えている。grilling の対話内容は questions ファイルと decision-log へ着地する（GD009、D006）。
- 完了済み 2 record は変更されていない（D007）。

## R007：sensor と validator が併用され、必須節定義が共有されている

受け入れ条件:

- sensor 4 種（required-sections、upstream-coverage、linter、type-check）が stage 完了時にエンジン経由で実行される。
- amadeus-validator が新成果物契約で pass を判定でき、旧形式の完了済み record を fail にしない。
- 必須節定義が sensor と validator で単一ソースから共有されている。
- `docs/amadeus/aidlc-v2-sensor-learn-mapping.md` の不採用判断が上書きされている（D004）。

## R008：パリティ検査が機械化され green である

受け入れ条件:

- 基準 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26` の本家 `dist/claude/` との skill 一覧と成果物一覧の差分ゼロを検査するスクリプトが存在し、green である。
- 名前写像と意図的除外（結線層、amadeus-* 改名、独自 3 skill、seed 非取り込み）が除外リスト成果物として管理されている。
- 検査が npm script（短い名前）から実行できる（dev-scripts 規約に従い Bun + TypeScript、TDD で追加）。

## R009：規範文書が新契約へ改定されている

受け入れ条件:

- AMADEUS.md、`.agents/rules/amadeus-artifacts-and-examples.md`、Skill Language Policy が「SKILL.md と TS スクリプトは英語必須」へ改定されている（GD002）。
- `docs/backward-compatibility.md` に互換性維持対象（完了済み 2 record の旧形式）が対象、理由、終了条件付きで記録されている。
- 削除された skill と廃止された成果物への参照が契約文書から消えている。

## R010：全検証が green で、examples が新契約で再生成されている

受け入れ条件:

- `npm run test:all` が green である（C002。最終 PR で担保）。
- examples の 4 snapshot が新契約で real provider 再生成され、`skill-provenance.json` の staleReason が解消されている。

## R011：この Intent 自身が新エンジン駆動で 1 周完走している

受け入れ条件:

- エンジン導入後の本 Intent の残ステージ（または検証用の実行）で、orchestrate の next / report が実際に使われている。
- エンジンが記録した audit イベントが record に残っている。
