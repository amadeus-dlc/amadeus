# 要件分析 — advisoryの人間選択強制

## 上流入力

- `intent-statement`: intent監査ログに記録された「Issue #2129: Formal Model Check勧告をAIが人間判断なしで破棄できる問題を対策する」を目的の起点とする。
- `scope-document`: 独立成果物は存在しないため、`amadeus-state.md`の`self-fix`、Issue #2129の受け入れ条件・非スコープ、およびIntent Mirror #2131をスコープ境界として用いる。
- `business-overview`: `amadeus/spaces/default/codekb/amadeus/business-overview.md`の「形式検査 advisory の人間判断境界」を利用者価値と影響範囲の根拠とする。
- `architecture`: `amadeus/spaces/default/codekb/amadeus/architecture.md`に記録されたdirective生成、latch、一般`HUMAN_TURN`、gate遷移の現行責務を技術境界とする。
- `code-structure`: `amadeus/spaces/default/codekb/amadeus/code-structure.md`に記録されたengine、state、plugin activation、protocol、テストの変更候補面を参照する。
- `team-practices`: `amadeus/spaces/default/memory/team.md`および`project.md`の、既決事項を再質問しない規律、監査原子性、質問回答の証拠化、生成投影を直接編集しない規律を適用する。

## Intent分析

[Issue #2129](https://github.com/amadeus-dlc/amadeus/issues/2129)の目的は、Formal Model Checkを常時自動実行することではない。engineが早期checkpointに載せたadvisoryについて、実行するかリスクを承知して延期するかを人間が決定し、その決定なしにAIエージェントがstage作業を続けられないようにすることである。

2件の独立クロスレビューは、中核欠陥を`CONFIRMED_WITH_REFINEMENTS`と判定した。現在のdirectiveはadvisoryを搬送するが、一般の`HUMAN_TURN`や`GATE_APPROVED`はadvisory固有のchoiceと相関せず、state machineは未判断のままstageを進められる。過去runにおけるAIの具体的発話と実損量は凍結証拠からは確定できないが、この証拠限界は修正契約を変更しない。

## 機能要件

### FR-1: advisory checkpointのfail-closed hold

1. engineが非空の`directive.advisories`を発行した場合、配列内の全advisoryについて、directiveが保持する`message`と同一の内容を省略・要約・改変せず人間へ提示しなければならない。
2. advisoryを提示した後、配列内の各advisoryに対応する人間choiceがすべて確定するまで、対象directiveのstage bodyを開始してはならない。一部だけを提示または解決してholdを解除してはならない。
3. `gate:false`であってもholdを省略してはならない。stage終端のapproval gateや一般の人間応答を、stage開始前のadvisory choiceとして代用してはならない。
4. choiceが欠落、不正、別advisory向け、または失効している場合はfail-closedでstage開始を拒否し、必要な人間判断を再提示しなければならない。

### FR-2: 人間が選べるchoice

1. 人間は少なくとも次のいずれかを選べなければならない。
   - **今すぐ実行する**: 指示されたFormal Model Checkを現在のcheckpointで実行する。
   - **リスクを承知して延期する**: advisoryが示す未検証リスクを受容し、現在のcheckpointを続行する。
2. AIエージェントは「任意」「低リスク」「後段で実行予定」などを理由に、choiceを代理決定してはならない。
3. standing grant、delegated approval、一般のstage approvalは、advisoryごとのfreshな実`HUMAN_TURN`を代替してはならない。
4. 「今すぐ実行する」によるhold解除は、現在の対象・spec identityに相関し、`complete=true`、`partial=false`、provenance検証済みの`NOT_DETECTED` verdictを得た場合に限る。
5. `DETECTED`は正式な反例・違反検出結果だが、安全を示すverdictではないためholdを自動解除してはならない。検出内容を人間へ提示し、修正後の再実行、または検出リスクを承知した明示的な延期を求めなければならない。
6. `HARNESS_ERROR`、partial/incomplete、provenance不成立、またはverdict未生成は正式verdictとして扱わない。自動延期・自動継続せずholdを維持し、人間が再実行またはリスク付き延期を明示するまでstageを開始してはならない。

### FR-3: advisory choice receipt

1. 人間choiceは、後から「どのadvisoryに対する、誰の、どの選択か」を検証できる永続receiptとして記録しなければならない。
2. receiptは少なくとも、advisoryのplugin/code、checkpoint stage、対象、specまたは検査対象のidentity、intent run、advisory instance、choice、対応する実`HUMAN_TURN`を一意に相関できなければならない。物理的な保存形式とevent schemaは後続設計で決定する。
3. choice receiptは、対応するpending advisory instanceが開いている間に、harnessが観測したfreshな実`HUMAN_TURN`のexact responseを一度だけ消費する保護境界からのみ生成できなければならない。LLM、一般公開writer、任意audit入力、または後付けの一般`HUMAN_TURN`参照からreceiptを自己発行してはならない。
4. advisory instanceはpending advisoryの初回生成時に一度だけ発番し、未解決のまま同一checkpoint directiveを再発行する場合、resume、compaction、session再開を行う場合も同じidentityを保持しなければならない。
5. instanceを終端choiceで解決した後に同じ発火条件が再成立した場合、または対象、spec identity、checkpoint stage、intent runが変わった場合は、新しいinstanceを発番しなければならない。
6. 同じpending instanceに正しく相関したreceiptはresume、compaction、session再開で再利用できるが、対象、spec identity、checkpoint stage、intent run、advisory instanceのいずれかが異なるreceiptを流用してはならない。
7. 一般の`HUMAN_TURN`、`GATE_APPROVED`、または現行の`(plugin, code)` latchだけではreceipt成立とみなしてはならない。

### FR-4: 適用面の対称性

1. 同じ人間選択契約を`requirements-analysis`、`functional-design`、`build-and-test`の3 checkpointへ適用しなければならない。
2. main workflowと`--single`の双方で同じ契約を強制しなければならない。
3. `functional-design`のper-unit初回・再入を含め、最初にstage bodyを実行するdirectiveでholdしなければならない。最初の`gate:false` directiveでadvisoryだけを消費し、後続の`gate:true`へ判断を持ち越す挙動は禁止する。
4. `never-run`、`changed`、`not-ready`などadvisoryを生成する全状態で同じ契約を適用し、`current`または`not-composed`でadvisory自体が生成されない既存条件は維持する。
5. リスク付き延期後に後続checkpointへ到達し、なおadvisory発火条件が成立する場合は、そのcheckpoint固有の新しいadvisory instanceとして人間choiceを要求しなければならない。stageを含まないlatchで後続判断を抑制してはならない。

### FR-5: 後段実行との非代替性

1. workflow後段に`formal-model-check` stageがEXECUTE予定であっても、早期checkpointのchoiceを自動的に延期または完了扱いしてはならない。
2. 早期checkpointで得た正式verdictが現在の対象・spec identityに対して有効な場合に限り、既存の`current`判定により後続advisoryを発火しないことができる。

### FR-6: 監査と診断

1. stage開始が拒否された場合、診断は未解決のadvisoryと必要な人間choiceを特定できなければならない。
2. choiceの記録とhold解除は、部分的な監査成功やstateだけの先行更新を残さないよう、論理的に一貫した遷移でなければならない。
3. 正常系と拒否系の双方で、監査または同等の永続証跡からadvisory → human turn → choice → stage開始可否を追跡できなければならない。
4. receipt生成境界は、pending instance、freshな実`HUMAN_TURN`、exact choiceを同一の保護された遷移で検証し、LLMや一般APIが任意の組合せを提出して成功できないようにしなければならない。

## 非機能要件

### NFR-1: 決定性と安全性

- 同じworkflow state、advisory、receipt入力は同じhold判定を返さなければならない。
- receiptの欠落・破損・相関不一致はallowではなくdenyへ倒さなければならない。
- LLMのprose遵守に安全性を依存せず、engineまたは同等の決定的な実行境界で強制しなければならない。

### NFR-2: 互換性

- advisoryが空のdirective、`current`、`not-composed`の既存stage進行を不要にholdしてはならない。
- Formal Model Checkの全workflow自動実行を導入してはならない。
- 既存のstage approval、standing grant、delegation契約は維持しつつ、advisory choiceの代替としてだけ使用を禁止する。
- 正本は`packages/framework/core/`配下で変更し、生成済み`dist/`や配布投影を直接編集してはならない。

### NFR-3: テスト可能性

- 安全契約はlive LLM発話に依存せず、engine/stateの決定的テストで再現できなければならない。
- failure-firstテストは、advisory発火後にreceiptなしでstage bodyまたはreportへ進もうとする経路が拒否されることを直接検証しなければならない。
- テストは全messageの同一内容提示、複数advisoryの全件解決、保護境界外のreceipt偽造拒否、`NOT_DETECTED` / `DETECTED` / error、instance identityのresume維持と再発番、main / `--single` / per-unit、3 checkpoint、実行 / 延期 / 実行失敗、相関不一致、後続checkpoint再提示を覆わなければならない。

### NFR-4: 保守性

- checkpointごとの個別分岐ではなく、構造化された`directive.advisories`に対する共通契約として実装しなければならない。
- choice receiptとplugin activation latchの責務を区別し、発火抑制が人間判断の証跡を暗黙に代替しない構造にしなければならない。

## 受け入れ基準

1. advisory付きcheckpointで、AIがchoiceを生成・省略してstage bodyを開始する失敗先行テストがredになり、修正後にreceiptなしの進行が決定的に拒否される。
2. directiveの各advisory `message`が同一内容で全件提示され、一件でも未提示または未解決ならholdが解除されない。
3. freshな実`HUMAN_TURN`が存在しても、pending advisory instanceとexact choiceを保護境界内で結び付けていないreceiptは拒否される。
4. LLM、一般公開writer、任意audit入力からreceiptを作る試行、および同じhuman turnを複数choiceへ再利用する試行が拒否される。
5. 人間が「今すぐ実行する」を選び、現在identityに相関したcomplete・non-partial・provenance検証済み`NOT_DETECTED`を得た場合だけholdが解除される。
6. `DETECTED`を得た場合は検出内容が提示され、修正後の再実行または明示的なリスク付き延期までholdが維持される。
7. `HARNESS_ERROR`、partial/incomplete、provenance不成立、またはverdict未生成の場合はholdが維持され、自動延期されない。
8. 人間が「リスクを承知して延期する」を選ぶと、当該checkpointのreceiptが永続化され、そのcheckpointだけを続行できる。
9. 未解決の同一checkpoint directive再発行、resume、compaction、session再開では同じadvisory instance identityが保持され、有効receiptを再利用できる。
10. 解決後の再発火、別stage、別run、別spec identity、別対象では新しいinstanceが発番され、旧receiptの流用が拒否される。
11. `requirements-analysis`、`functional-design`、`build-and-test`のmain経路で同じ契約が成立する。
12. `--single`および`functional-design` per-unitの`gate:false`初回directiveでも、choice前のstage body開始が拒否される。
13. 延期後も発火条件が残る後続checkpointでは、新しいadvisory instanceと人間choiceが要求される。
14. 一般`HUMAN_TURN`、`GATE_APPROVED`、standing grant、delegated approvalだけではadvisory holdを解除できない。
15. 永続証跡からadvisory instance、人間choice、対応human turn、hold解除結果を追跡できる。
16. advisoryなし、`current`、`not-composed`の既存回帰テストが維持される。
17. 後段の`formal-model-check`予定だけでは早期checkpointのholdが解除されない。

## 制約と前提

- 対象SHAはIssue #2129とクロスレビューが検証した`498c3034a78bd432dc426f9f807b79c8ae980762`である。
- 現行のadvisory発火、stderr/directive搬送、3 checkpoint、状態分類を利用し、人間choiceの強制・記録・検証を追加する。
- 「人間」はCodex harnessで監査可能な実`HUMAN_TURN`を意味し、AI生成入力や一般approvalの存在だけでは満たさない。
- 監査event名、receipt schema、保存API、holdを表す具体的なstate表現は、ここで規定した意味・相関・永続性を満たす範囲で後続設計に委ねる。

## 非スコープ

- [Issue #2139](https://github.com/amadeus-dlc/amadeus/issues/2139)の複数登録モデルに対するローカルrunner `SOURCE_IDENTITY`修正。
- Formal Model Checkを全workflowまたは全checkpointで自動実行する仕様変更。
- 過去PBT intentのtranscript復元、AIの具体的発話の立証、実損量の算定。
- Formal Model Check自体のTLA+ model、invariant、TLC探索処理、CI runtime receiptの変更。
- advisoryと無関係なstage approval、standing grant、delegation機構の再設計。

## Code Generationで承認された最小スコープ例外

- **承認日時**: `2026-08-03T12:18:04Z`
- **ユーザー裁定**: Code Generation Step 5で判明した証拠契約の欠落に対し、選択肢1「非スコープを最小緩和」を承認。
- **追加する実装範囲**: local Formal Model Check成果物のmanifestへ、advisory hold解除に必要なtarget、spec identity、source provenanceを追加し、engineが検証対象を一意に解決できるadvisory専用の決定的出力先を定める。
- **維持する境界**: TLA+ model、invariant、TLC探索処理、CI runtime receiptは変更しない。追加情報はlocal実行結果の真正性・相関検証だけに使用し、`NOT_DETECTED`以外を成功へ読み替えない。

## 矛盾・未解決事項

- Issue #2129本文と2件の独立クロスレビューの中核要件に矛盾はない。
- AIの具体的発話と実損量は証拠上`INCONCLUSIVE`だが、欠陥の成立と受け入れ基準には影響しない。
- Formal Model Check失敗後の自動継続禁止は、このintentで人間が実際に「別Issueへ分離・クロスレビュー・リスク付き延期」を選んだ証拠と整合する。
- 実装を分岐させる未解決の要件質問はない。

## トレーサビリティ

| 上流証拠 | 要件への反映 |
|---|---|
| Issue #2129 期待する挙動1〜4 | FR-1、FR-2、FR-3、FR-6 |
| Issue #2129 受け入れ条件候補 | FR-1、FR-3、FR-4、FR-5、受け入れ基準1〜17 |
| reviewer-1: advisory-specific choice欠落、一般`HUMAN_TURN`不足、latch範囲 | FR-3、FR-4、NFR-1、NFR-4 |
| reviewer-2: receiptなしreport成功、main / single / per-unit対称面 | FR-1、FR-4、NFR-3 |
| CodeKB business-overview / architecture / code-structure | Intent分析、FR-1〜FR-6、変更境界 |
| Requirements Analysis質問票 | Issue既決事項を再質問せず、矛盾・抜け漏れ0件として統合確認済み |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T10:39:37Z
- **Iteration:** 1
- **Scope decision:** none

主要経路と非スコープは整理されているが、人間由来choiceの偽造防止、正式verdictの意味、receipt identityの寿命、明示要件の受入証拠、および既決事項の再質問にBLOCKERが残る。

### Findings

- BLOCKER | requirements-analysis-questions.mdの「取り下げたQ1」は、Issue #2129で既決のadvisory適用範囲を実際に再質問し、回答にもユーザーの「issueに書いてあることは質問するな」が残っているため、「Issue記載済み事項を質問として再演しない」という明示契約に違反している。
- BLOCKER | FR-2.4・受け入れ基準2〜3の「有効な正式verdict」が未定義で、反例または違反を示す正式verdictがholdを解除するのか、正式verdict未生成の失敗と同様にholdを維持するのか判定できず、実装とQAが分岐契約を確定できない。
- BLOCKER | FR-2.2・FR-3・NFR-1の核心はAIによる代理決定の禁止だが、受け入れ基準はreceipt欠落と一般HUMAN_TURNの非代替しか検証せず、AIが実HUMAN_TURNへ任意choiceを結び付ける、または無保護のwriter/APIでreceiptを作る経路の拒否条件がない。choiceの人間由来を決定的に証明する境界とnegative acceptance testが必要である。
- BLOCKER | FR-3.3は同一checkpointのresume・compaction・session再開でreceipt再利用を要求し、FR-3.4はadvisory instance変更時の拒否を要求する一方、同一checkpointでdirectiveを再発行した際にinstanceを保持するのか再発番するのかを定義していないため、有効な再利用とstale拒否のpass/failをQAが決められない。
- BLOCKER | FR-1.1の「各advisoryを逐語提示」は明示要件だが、受け入れ基準とNFR-3には提示内容の同一性、および複数advisory全件のchoice完了前にholdを維持する検証がなく、一件だけ提示・解決して進む実装でも受け入れ基準を通過し得る。
- FOLLOW-UP | business-overviewは現行run-stageと将来のdispatch-subagentを同じ契約で扱う必要を記す一方、requirements.mdはmain・--single・per-unitまでしか境界を示していない。現時点で実装対象外ならdispatch-subagentを非スコープとし、後続適用条件を明示する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T10:42:42Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5件のBLOCKERはすべて解消され、人間由来choice、verdict分類、instance寿命、複数advisory、受け入れ証拠が実装・テスト可能な契約になった。

### Findings

- FOLLOW-UP | business-overviewは将来のdispatch-subagentも同契約で扱う必要を明示しているが、requirements.mdは現行run-stageのmain・--single・per-unitのみを列挙している。現在の実装対象外なら非スコープとし、将来経路が同じ共通契約を再利用する条件を明記すると上流境界が閉じる。
