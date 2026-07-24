# Requirements — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, business-overview.md, architecture.md, code-structure.md, team-practices.md

## 承認系譜

1. requirements-analysis-questions.md の「承認系譜」節を参照。state.md 優先・memory.md 非構造的追記の方針はユーザー承認済み(2026-07-24T11:53:04Z)。
2. **是正(reviewer iteration 1 NOT-READY を受けて)**: FR-2/FR-3 の検出方式について、scope-document.md In Scope #3 は「Claude Code の環境変数からの自動検出」(feasibility-assessment.md TC-1 で実測確認済み — `CLAUDECODE=1`、`CLAUDE_CODE_SESSION_ID` 等)を前提としていたが、初版 requirements ではこれを無申告で `deriveHarnessDir()` の dot-dir 検出へ置き換えていた。是正版では **env var を Claude Code 検出の一次手段として維持**し、dot-dir 検出(既存 `deriveHarnessDir()`)を Codex/Cursor/OpenCode/Kiro 向けの補助手段として追加する構成に修正した(scope からの逸脱ではなく、両手段の併用)。
3. **是正**: scope-document.md In Scope #5 / intent-statement.md Success Metrics が明記する `manual`(手動記入)フォールバックが初版 FR-1 の型定義から欠落していた。是正版で型定義へ復元した。
4. **選挙裁定(E-HPFR3、2026-07-24T12:12:27Z 開票、choice B 3-2 で成立)**: reviewer iteration 2 の Major 指摘「FR-3 の dot-dir 検出が scope-document.md Out of Scope #3(Cursor/OpenCode/Kiro の恒久的自動検出手段の確立)と抵触する疑い」を選挙にかけた。裁定は B(dot-dir 検出は `deriveHarnessDir()`/`KNOWN_HARNESS_DIRS` という既存機構の単純再利用であり、Out of Scope #3 が指す「未確立の自動検出手段の確立」には該当しない)を採用し、FR-3 を維持する。全5票が留保付き賛成(GoA2)であり、うち e4/e1/e3 の留保は「FR-3 の『一次手段』という文言は scope-document.md の Scope Boundary Rationale(フォールバック設計までが in-scope の上限)より踏み込んで見えるため、AC-3c(unknown フォールバック)・FR-1 AC-1d(manual 上書き)の存在を明記し『非決定的な補助シグナル、常時 manual 上書き可能』程度の慎重な表現へ調整することを推奨する」というものであり、この推奨を反映して FR-3 の文言を是正した(下記)。record: `amadeus/spaces/default/elections/260724-e-hpfr3/record.md`(leader ブランチ、開票時点で確認 — 本 intent 側は該当コミット取込前のため git 検証可能な形での引用は取込後に行う。agmsg-git-evidence-split に従い、本節は agmsg/leader 報告に基づく引用である旨を明記する)。
5. **是正(reviewer iteration 2 Major 指摘(1))**: requirements-analysis-questions.md Q2 が「dot-dir 検出のみ」の記述のまま据え置かれ、是正後の FR-2/FR-3(env var 一次+dot-dir 補助)と不整合を起こしていた。Q2 回答へ注記を追加し、FR-2/FR-3 が優先する(Q&A は初期方針、requirements.md が最終契約)ことを明記した。

## Functional Requirements

### FR-1: state.md へのハーネス種別記録

intent birth 時、`amadeus-state.md` の `## Project Information` ブロック(`amadeus-utility.ts:4094-4103` の `stateContent` テンプレート)へ `- **Harness**: <type>` フィールドを追加する。`<type>` は `claude-code`|`codex`|`cursor`|`opencode`|`kiro`|`unknown`|`manual` のいずれか(scope-document.md In Scope #5、intent-statement.md Success Metrics に対応)。

**AC-1a**: 新規 intent を birth したとき、生成された `amadeus-state.md` の Project Information ブロックに `- **Harness**: <type>` 行が存在すること(grep で検証可能)。
**AC-1b**: `validateStateFields()`(`amadeus-migrate.ts:934-942`)の `STATE_V7_FIELDS` allowlist に `Harness` を追加しても、既存 V7 state ファイル(`Harness` フィールドなし)の検証が壊れないこと(exactly-once チェックは STATE_V7_FIELDS に列挙されたフィールドのみが対象 — フィールドを allowlist へ追加する場合は同時に State Version を検討する。本 intent では V7 のまま `Harness` を optional 追加とし、`STATE_V7_FIELDS` には追加しない — allowlist 変更は別のマイグレーション判断を要するため out of scope)。
**AC-1c**: `- **Field**: value` の既存書式に従い、`getField`/`setField` で読み書き可能であること(既存ヘルパーの再利用、`amadeus-lib.ts:4808-4854`)。
**AC-1d**: 自動検出(FR-2/FR-3)が `unknown` を返した場合に、`manual` を明示的に指定できる経路(CLI フラグまたは env var override)を design 段階で確定すること — 本 requirements では経路自体は未確定とし、design への持ち越し事項として明記する。

### FR-2: Claude Code の環境変数検出(一次手段)

feasibility-assessment.md TC-1 の実測(`CLAUDECODE=1`、`CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_ENTRYPOINT` 等)に基づき、`process.env.CLAUDECODE === "1"` を Claude Code 検出の一次手段とする(scope-document.md In Scope #3 に対応、逸脱なし)。

**AC-2a**: `CLAUDECODE=1` が設定された環境で intent を birth したとき、`Harness` フィールドが `claude-code` になること。
**AC-2b**: `CLAUDECODE` 未設定の場合は FR-3(dot-dir 検出)へフォールバックすること。

### FR-3: dot-dir 検出(Codex/Cursor/OpenCode/Kiro 向けの非決定的な補助シグナル)

`deriveHarnessDir()`(`amadeus-lib.ts:168-183`)が解決する dot-dir(`KNOWN_HARNESS_DIRS = [".claude", ".kiro", ".codex", ".opencode", ".cursor"]`、`amadeus-lib.ts:158`)を対応する harness type へマッピングする。E-HPFR3 裁定(選挙、choice B、留保反映)のとおり、これは新規の自動検出手段の確立ではなく既存機構の再利用であるため scope-document.md Out of Scope #3 に抵触しない。ただし feasibility-assessment.md TC-2/TC-3 のとおり Codex/Cursor/OpenCode/Kiro には確実性の裏付けがなく、**非決定的な補助シグナル**として位置づけ、常に `manual` での上書きが可能な設計とする(「一次手段」と断定しない)。

**AC-3a**: `CLAUDECODE` 未設定かつ `.codex`/`.cursor`/`.opencode`/`.kiro` の各 dot-dir が解決されたとき、対応する harness type(`codex`/`cursor`/`opencode`/`kiro`)が **補助シグナルとして** 記録されること(確定値としての保証はしない)。
**AC-3b**: `AMADEUS_HARNESS_DIR` env override が設定されている場合、それを優先して解決すること(既存 `deriveHarnessDir()` の解決順序をそのまま踏襲)。
**AC-3c**: フォールバック(`.claude` デフォルト、`isHarnessDirName()` 不一致)の場合は `unknown` を記録すること。ユーザーが `unknown`(または AC-3a の補助シグナル結果)を `manual` へ常時上書きできる経路は FR-1 AC-1d を参照。
**AC-3d(design 段階への申し送り、e3 留保)**: `deriveHarnessDir()` の CWD プローブ段(script-path 解決が効かない場合のフォールバック)は複数 harness dir が同居する dev repo で誤検出しうる。design 段階で、本機能の呼び出し文脈では script-path 解決が常に先に成立し CWD プローブへ到達しないことを確認すること。

### FR-4: memory.md への非構造的記録

承認済み方針(Q3)に従い、stage `memory.md` へは新規見出し・YAML フロントマターを追加しない。ハーネス種別は、conductor がステージ実行中に記録するエントリ本文(例: Interpretations 見出し下の通常のログ行)に含める運用とする。`ensureStageDiary()`(`amadeus-lib.ts:1252-1266`)のテンプレートコピー処理自体、および `memory-template.md` の4見出し構造は変更しない。

**AC-4a**: `tests/unit/t100-memory-template-lifecycle.test.ts` が変更後も green であること(見出し数不変、`total=0` 不変)。
**AC-4b**: 本 FR は state.md(FR-1)の補助であり、memory.md 単体からのハーネス種別の機械的抽出(構造化パース)は要求しない — 人間可読の記録に留める。

### FR-5: 監査シャード付記(Out of Scope)

scope-document.md のとおり Out of Scope。比較検討のみ requirements 段階で記録し、実装しない。

## Non-Functional Requirements

- **NFR-1(後方互換性)**: 既存の `amadeus-state.md`(`Harness` フィールドなし)の読み込み・検証(`validateStateFields`)を壊さない。`Harness` は optional フィールドとして扱う。
- **NFR-2(センサー非干渉)**: feasibility-assessment.md TC-1〜TC-3 および Developer scan §5 の実測どおり、state.md への1行追加は required-sections/upstream-coverage センサーの H2 カウント・consumes 参照検査に影響しない。

## Traceability

- FR-1〜FR-3 は intent-statement.md の Success Metrics(「新規 intent のステージ実行から、実行ハーネス種別が機械的に参照可能な構造化フィールドとして読み取れる」)に対応
- FR-4 は scope-document.md In Scope #2 の技術的具体化(承認系譜参照)
- FR-5 は scope-document.md In Scope #6 の Out of Scope 化

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T11:56:39Z
- **Iteration:** 1
- **Scope decision:** none

FR-4のmemory.md非構造化に関する承認系譜の引用は模範的だが、FR-1〜FR-3で scope-document.md の技術的方針から無申告で逸脱している箇所が2件あり差し戻す。

### Findings

- [Major] FR-2/FR-3 が scope-document.md In Scope #3 の検出方式(環境変数)を無申告で dot-dir 検出へ置き換えている。承認系譜の引用も申告もない。cid:implementation-deviation-election に照らし差し戻す。
- [Major] scope-document.md In Scope #5 / intent-statement.md Success Metrics が明記する manual(手動記入)フォールバックが FR-1 の型定義から欠落している。
- [Minor] AC-1b の STATE_V7_FIELDS 非追加判断は Q&A で明示的に問われていない — 無申告逸脱ではないが次段で再確認望ましい。
- [参考] Traceability・file:line引用・team-practices.mdとの整合は問題なし。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T11:59:52Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の2件のMajorは是正されたが、是正作業自体がQ&Aとの不整合とscope境界の疑義という新たな2件のMajorを生んだため、引き続きNOT-READYとする。

### Findings

- [Major] FR-2/FR-3の是正内容がrequirements-analysis-questions.md Q2(既承認)のdot-dir単独記述と矛盾。Q&A未更新のまま承認系譜にも言及がない。
- [Major] FR-3がCodex/Cursor/OpenCode/Kiro向けdot-dir検出を一次手段と位置づけているが、scope-document.md Out of Scope #3(これら3ハーネスの恒久的自動検出手段の確立)と抵触する疑いがある。
- [参考] FR-1のmanual型復元・AC-1dは妥当な是正。
