# re-scan: 260813-election-multiq（Issue #2813）

## 実行メタデータ

- **Date**: `2026-08-13`（Asia/Tokyo）
- **Intent**: `260813-election-multiq`
- **Repository**: `amadeus`（単一 repo）
- **Scope / Depth / Project type**: `self-feature` / Standard / Brownfield
- **Issue**: [#2813](https://github.com/amadeus-dlc/amadeus/issues/2813)
- **Base**: `854692fd7a11b124236b0427fe3d59e2fe6bf785`
- **Observed**: `c0f9edf27828def6fa3dbbbc4101d753b398e025`
- **Distance**: 33 commits
- **Focus**: election model/store/record/transport/CLI/skill/migration、関連 tests、`FormalElection` / model-map、現行 norm
- **入力**: Developer Agent の完全 scan 要旨を一次入力とし、Issue 本文・2件のクロスレビューおよび observed tree の実読で再確認した。
- **副作用**: CodeKB の指定10ファイル以外は変更していない。engine/state/audit、Intent record、コード、テスト、生成面、Git、GitHubへの書き込みは行っていない。

## 検索・測定根拠

| ID | 再実行可能な述語 | observed での結果 |
|---|---|---|
| P1 | `git rev-list --count 854692fd7a11b124236b0427fe3d59e2fe6bf785..c0f9edf27828def6fa3dbbbc4101d753b398e025` | `33` |
| P2 | `rg -n '\bquestions\s*:' packages/framework/core/tools/amadeus-election*.ts packages/framework/core/skills/amadeus-election/SKILL.md amadeus/spaces/default/specs/tla/FormalElection.tla` | 0 hit、exit 1。複数形 field は未実装 |
| P3 | `rg -n 'question: string|choiceInternalNo: number|export type TallyResult|const byVoter = new Map' packages/framework/core/tools/amadeus-election-model.ts` | `question: string` は `:56` / distribution `:347`、scalar choice は `:154` / `:168` / `:213`、voter-only map は `:327`、TallyResult は `:476` |
| P4 | `wc -l packages/framework/core/tools/amadeus-election*.ts scripts/amadeus-election-migrate.ts ...` | model 550、record 294、store 719、transport 207、CLI 853、migration 580、skill 71、FormalElection 317、model-map tool 613、arbitrary 132行 |
| P5 | `rg --files tests | rg '<election test predicate>'` | 直接関連21ファイル（unit 7 / integration 13 / e2e 1） |
| P6 | `git show bd567fd1^:amadeus/spaces/default/memory/team.md | rg 'E-SRA-RAS13|election-cli-canonical|多問対応|1選挙1質問'` | 旧 bundled workaround 1行を確認 |
| P7 | `rg -n '1選挙1質問|election-cli-canonical|E-SRA-RAS13|多問対応' amadeus/spaces/default/memory/team.md` | 現行は `:40` の「1選挙1質問」のみ。旧 cid/workaround は不在 |
| P8 | `cat tests/.coverage-project-policy.json` | 絶対 9000 basis points（90.00%）、相対低下 2 basis points（0.02pp） |
| P9 | `gh issue view 2813 --repo amadeus-dlc/amadeus --json ...` | OPEN、enhancement/P3/in-progress。完了条件と独立クロスレビュー2件を確認 |

Issue のクロスレビューが過去 SHA で示した主要機序は observed でも一致した。ただし旧レビューの line pin は採用せず、P3 の observed 行へ再解決した。`git diff --name-only base..observed` は224 files、選挙 core 5面と FormalElection 自体に多問実装は入っていない。区間で `team.md` / `project.md` の大幅蒸留と model-map 周辺変更はあるが、Issue #2813 の実装ではない。

## 現状ギャップ

### Domain model

- `Election` は question 1件と全問共有 choices、ballot は choice/GoA/reservation/rationale 各1件。
- `resolveBallots` は voter key だけで最新票を選び、question の軸がない。
- `DistributionView`、early tally、late classification、GoA consensus、winner/hold が選挙全体で1組。
- `TallyResult` は established 1件または hold 1件で、mixed result を表せない。

### Store and state

- `ElectionFile = Election & { state }`、ledger ballot は scalar、pending/materialized file は voter 名単位。
- `tally.json` は `{ result, talliedAt, ballots, resolutions }`、registry/status も global state と voter voted/pending だけを持つ。
- `parseElectionFile` は `Election.parse` に委譲するため、新 schema 専用 parser へ置換すると既存単問 store を読めない。旧/new decoder から new canonical model へ正規化する必要がある。
- `readTally` は raw JSON を domain shape として返し、schema evolution を fail-closed に扱わない。

### CLI, skill, record, transport

- 9 verb と directive loop は全体 hold を前提とし、`HOLD_RESOLUTIONS` と `hold-resolved` に question ID がない。
- discussion/reopen は election 全体を collecting に戻すため、成立済み問を再投票から除外できない。
- record は ruling 1件、GoA frequency 1行、reservation に question key なし。verify も全体の JSON stringify equality と集約件数を検査する。
- transport は voter ごとの view path を配送するだけであり、view に questions を含めれば境界変更は小さい。
- skill は definition の `question` 単数、全体 hold/amend/rerun を手順として固定する。

### Formal model and tests

- `FormalElection` は `Choices` 全体、`accepted[voter]`、scalar ballot、global tally/winner/reason/holdMarkers をモデル化する。
- model-map は model/record/store/transport/CLI の5面 identity を拘束するため、いずれかの変更で再計算が必要。
- 既存 arbitrary と21テストに、multi parse、ID uniqueness、question 別 response/resolution、mixed result、複数 hold、held-only rerun、established invariant、legacy/new round-trip、question record、CLI mixed directive、形式不変量がない。

## 変更面と依存順

1. model に stable question ID、question-owned choices、question-keyed response、mixed tally を導入する。
2. store に旧/new decoder、新 canonical writer、voter file の responses、global lifecycle と question results の分離を導入する。
3. established result を保存し、unsettled question だけを再評価する state transition を CLI/directive/hold resolution に導入する。
4. record/verify を question 別 ruling/GoA/reservation/completeness へ拡張し、deterministic order を固定する。
5. transport view と skill vocabulary を複数問へ更新する。
6. migration fidelity、FormalElection、cfg、model-map identity、team norm を同期する。
7. arbitrary、unit/integration/PBT/e2e/formal tests、build/distribution/CI を通す。

旧 store の一括破壊 migration より、reader dual schema + new canonical write が append-only 監査と現行 legacy fallback に適合する。これは RE から導ける制約であり、最終 schema（直接 `questions[]` か親子 election bundle か）は後続 architecture/functional design で決定する。

## ノルムの鮮度

commit `bd567fd1b78bbde8a524b2cc767bd176dfbfe95f` により、旧 bundled `E-SRA-RAS13` / `election-cli-canonical` の長文 workaround は削除済みである。Issue 本文は起票時点の旧 norm を引用するが、observed の現行事実ではない。現在残るのは `team.md:40` `cid:requirements-analysis:always-elect` の「1選挙1質問」であり、多問実装が着地するまでは現行コードと整合する。更新は実装と同一変更面で行う必要がある。

## 未測定・未決事項

- テスト、build、lint、typecheck、coverage、TLC は未実行。現行 HEAD の pass/fail と state-space 規模は未測定。
- 既存選挙 store 全件の件数、schema 分布、legacy direct-path 件数、corrupt record 件数は本 scan で再測定していない。
- 多問 schema の最終形、question ID の具体語彙、mixed summary の JSON shape、global terminal condition は未決。
- 既存単問 `tally.json` / `record.md` の byte-for-byte 互換を要求するか、意味互換 + dual reader とするかは未決。
- 性能、最大 question 数、最大 ballot size、record size、TLC state explosion の上限は未測定。
- Issue のクロスレビューで過去に測定された束ね形実例・選挙総数は observed で再集計していないため、本成果物の現行件数としては使用していない。

## 合成結論

Issue #2813 の本質は CLI 表示ではなく、選挙 aggregate の cardinality を `election → questions → voter responses → question results` へ拡張する変更である。model、store、state machine、record、formal model の境界を同時に揃え、legacy decode と established preservation を先に不変量として置くことが、安全な実装の前提になる。
