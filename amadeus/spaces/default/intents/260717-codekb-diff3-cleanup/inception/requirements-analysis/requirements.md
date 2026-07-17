# Requirements — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`。

## Intent Analysis

本intentの目的は、共有CodeKB 2ファイルへ孤立したdiff3 base fragmentを再流入させず、branch上のcontent clean、修正commitの系統、recordのlifecycle完了、main着地後のclose条件を別々に検証可能な形で残すことである。新しい機能やruntime挙動を作るのではなく、[Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129)の `P3` / `S4-MINOR` な文書hygieneを、証拠順序を崩さずhandoffする。

後続のユーザー明示指示によりAmadeus lifecycleはdoneまで進める。ただし、本conductorはmain merge、Issue close、PR作成・更新・mergeを実行せず、外部着地を未実施のまま明示する。

## Functional Requirements

### FR-1: 対象とmarker clean条件

対象は `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md` と `amadeus/spaces/default/codekb/amadeus/code-structure.md` の2ファイルに限定する。

- AC-1a: 測定対象refとcommit SHAを記録してから、行頭が `<<<<<<<`、`|||||||`、`=======`、`>>>>>>>` のいずれかである行を各ファイルで全数走査し、4語彙すべて0件でなければならない。
- AC-1b: 各ファイルの「最新」を示すH2は1件でなければならない。`reverse-engineering-timestamp.md` では `## 実行メタデータ(最新: ...)`、`code-structure.md` ではタイトルに `最新:` を含むH2を対象とする。
- AC-1c: `260715-opencode-cursor-harness` の履歴H2は各ファイルで1件保持し、孤立fragmentの除去を理由に履歴本文を削除しない。
- AC-1d: いずれかの件数が不一致ならcleanと報告せず、main mergeおよびIssue closeのhandoffを停止する。

### FR-2: contentと系統の分離

- AC-2a: 修正commit `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` が測定refの祖先かどうかを `git merge-base --is-ancestor` で記録する。
- AC-2b: AC-2aが非祖先でも、FR-1のcontent条件がgreenなら修正を盲目的に再適用しない。逆に、祖先であることだけでcontent cleanを主張しない。
- AC-2c: Reverse Engineeringのfreshness pointer追記のような意図されたCodeKB差分と、Issue #1129の孤立marker行を区別し、ファイル全体のdiff有無をmarker cleanの代用にしない。

### FR-3: lifecycle recordの完了

- AC-3a: engineがEXECUTEとしたInception / Construction stageを、各stageの成果物、questions証跡、reviewer、宣言sensor、§13、gate、commit / pushを満たしてdoneまで進める。
- AC-3b: Issue #1129の解消のためにapplication code、API、schema、AWS infrastructure、追加dependencyを変更しない。workflow中に発見したframework blockerの修正はIssue #1129の機能要件と混同せず、独立したcommit / review面で追跡する。
- AC-3c: 最終handoffは、実施済み検証と未実施の外部操作を分離し、main着地やIssue closeを実行前に完了と表現しない。

### FR-4: main着地handoff

- AC-4a: 将来の着地は起票者以外2名の独立review、CI / sensor green、人間の明示承認を前提とし、AIが自発的にmergeしない。
- AC-4b: 本conductorはmain merge、Issue close、PR作成・更新・mergeを行わない。外部操作が必要な状態はleader / userへhandoffする。
- AC-4c: fix commitの祖先性、record commitの着地、対象contentのcleanを別フィールド・別検査として記録し、1つのSHAだけで3事実を代表させない。

### FR-5: post-landing verificationとclose順序

- AC-5a: 人間承認によるmain着地後、landed mainの明示refでFR-1のmarker 0件、最新H2各1件、履歴H2各1件を再計測する。
- AC-5b: AC-5aの実測がすべてgreenである証拠より後にのみIssue #1129をcloseする。main未着地、測定ref不明、件数不一致のいずれかならIssueをOPENのまま保つ。
- AC-5c: Issue closeはleaderの外部操作であり、本intentのengine doneと同一視しない。

## Non-Functional Requirements

### NFR-1: 決定性と再現性

marker / H2件数は同一ref・同一commandで再実行可能な全数走査から導出し、手作業の目視件数やexit codeだけのgreenを使わない。検査出力にはref、対象path、pattern、件数を含める。

### NFR-2: 監査性とtraceability

各要件は上流成果物、Issue #1129、git ref、stage auditへtraceできなければならない。質問0件判定、review verdict、sensor verdict、§13選定、gate provenance、push SHAをintent recordへ保持する。

### NFR-3: 変更の局所性

Issue #1129に対するproduct変更はMarkdown branch hygieneに限定する。performance、scalability、availability、accessibility、data retentionの新規数値targetはruntime利用者・service・data lifecycleが変わらないため非該当とし、架空のSLOを設けない。

### NFR-4: security / compliance非回帰

公開repositoryの技術文書とgit metadataだけを扱い、PII / PHI / cardholder data、IAM、network、secret、AWS resourceを新規に処理しない。既存のno-AI-merge、human-presence、audit provenanceを緩和しない。

## Constraints

- 既決 `cid:reverse-engineering:diff3-marker-vocab` を適用し、同内容のrule / sensorを重複persistしない。
- application / framework sourceの変更をIssue #1129の解決条件へ追加しない。
- main履歴rewrite、force push、branch protection緩和を行わない。
- main merge、Issue close、PR操作は本conductorの権限外である。
- `team-practices.md` のTesting Postureに従い、検証結果をgreenに見せるために既存failed checkを無視しない。

## Assumptions

- [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129)はpost-landing verificationまでOPENを維持する。2026-07-17T19:50Z時点のread-only実測ではOPENである。
- origin/mainは後続で前進しうるため、「main」の文字列だけでなく測定時のcommit SHAを記録する。
- Practices Discovery中に生じた安全修正とDraft PR #1183はworkflow blockerの修正面であり、Issue #1129のproduct scopeやclose証拠へ流用しない。

## Out of Scope

- CodeKB 2ファイルへの追加的なfeature記述、過去履歴blockの再構成、既決marker vocabularyの再設計。
- application code、API、schema、dependency、CI policy、AWS / deploymentの変更。
- bug用の重複Issue作成、Issue本文のshadow specification化。
- 本conductorによるPR操作、main merge、Issue close。

## Error and Edge Scenarios

| Scenario | Required behavior |
|---|---|
| fix commitが測定refの祖先でないがFR-1はgreen | content cleanと系統未着地を別々に記録し、4行削除を再適用しない |
| 4 marker語彙のいずれかが1件以上 | clean判定を拒否し、該当file:lineとrefを報告して着地・closeを停止 |
| 最新H2または履歴H2が1件でない | 構造不一致として停止し、目視で件数を補正しない |
| origin/mainとbranchに意図されたfreshness差分がある | 全体diffを失敗根拠にせず、marker / H2 / 履歴条件を個別検証 |
| engine doneだがmain未着地 | intent lifecycle完了と報告しつつ、IssueはOPEN・external landing pendingと明記 |

## Traceability

| Requirement | Source |
|---|---|
| FR-1 | `intent-statement.md` Success Metrics 1-2、`scope-document.md` Acceptance Boundary、`code-structure.md` / Reverse Engineering実測 |
| FR-2 | `intent-statement.md` Problem Statement、Reverse Engineering questionsのcontent clean / ancestry分離 |
| FR-3 | ユーザー明示の「Intent完遂」、engine EXECUTE plan、現行conductor境界 |
| FR-4 | `scope-document.md` Current Conductor Boundary、`team-practices.md` Way of Working、no-AI-merge |
| FR-5 | `scope-document.md` V4-V6、`intent-statement.md` Success Metric 3、close-after-landing-verification |
| NFR-1/2 | `architecture.md` / `business-overview.md` のaudit・tool-owned state機構、team practice |
| NFR-3/4 | `scope-document.md` Out of Scope、`business-overview.md`、feasibilityのAWS / Compliance非該当 |

## Open Questions

なし。未実施のmain着地とIssue closeは不確実性ではなく、所有者と順序が確定したhandoff項目である。

## Review

**Verdict: READY**

- 上流参照: `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md` の全入力が明示され、Traceability表で主要要件へ対応付けられている。
- Testability: marker 4語彙の0件、最新H2と履歴H2の各1件、commit祖先性、測定ref、停止条件が個別のacceptance criteriaとして定義されており、QAは目視補完なしで再現可能な検査を作成できる。
- Scope: CodeKB 2ファイルのcontent hygiene、Intent lifecycle、将来のmain着地後検証が分離され、application code、AWS、PR操作、main merge、Issue closeの境界と所有者が明確である。
- Customer value: 孤立diff3 fragmentの再流入防止と、未着地状態を誤って完了扱いしない監査証拠に直接結び付いており、追加機能や架空のSLOは含まれない。
- 欠落・矛盾: blocking findingなし。旧scopeのInception / Construction対象外条件は後続の明示指示で更新されたことがQ&Aと本文の両方に記録され、外部操作禁止との矛盾もない。
