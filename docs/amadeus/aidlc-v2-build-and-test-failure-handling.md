# AI-DLC v2 Build and Test Failure Handling

この文書は、Issue #392 の判断として、Build and Test（Stage 3.6）の失敗時処理を AI-DLC v2 に寄せるか、Amadeus DLC の現行契約を維持するかを定義する。

参照元は次である。

- リポジトリ: https://github.com/awslabs/aidlc-workflows/tree/v2
- 参照 commit: `d341522e1491db4884e9127004c3882365229218`
- 失敗時手順: `core/aidlc-common/stages/construction/build-and-test.md`（診断、修正、再実行を最大 2 回試み、解決できない場合は `test-results.md` へ記録して gate へ進む）

## 判断

Amadeus DLC は、現行契約を意図的差分として維持する。

Build and Test は実装修正を行わない。

失敗時の契約は次である。

1. build またはテストが失敗したら、autonomy mode に関わらず停止し、失敗内容を `build-test-results.md` に記録して人間へ確認する（halt-and-ask）。
2. 修正は、人間の指示の下で、対象 Unit の Code Generation の修正として実行する。
3. 修正後の再実行は、失敗原因に関係する手順だけをやり直す。
4. すべて成功した後に `amadeus` 入口の Bolt 境界処理が Bolt PR の作成を案内し、人間の merge が承認証拠になる。

## 本家との対比

| 観点 | AI-DLC v2 | Amadeus DLC |
|---|---|---|
| 失敗の診断 | Build and Test が診断する | Build and Test は失敗内容を記録し、人間へ確認する |
| 修正 | Build and Test が最大 2 回修正を試みる | Code Generation の修正として、人間の指示の下で行う |
| 再実行 | 修正した手順を再実行する | 失敗原因に関係する手順だけを再実行する |
| 解決できない場合 | `test-results.md` へ記録して gate で人間へ提示する | 最初の失敗時点で記録して人間へ確認する（halt-and-ask） |
| 人間の最終判断 | gate で行う | halt-and-ask と Bolt PR merge で行う |

いずれの契約でも最終判断は人間に残る。差分は「人間へ委ねる前に無人の修正試行を挟むかどうか」である。

## 維持する理由

1. **記録の真実性を保つため**。コード変更は Code Generation の成果物（`code-generation-plan.md`、`code-summary.md`）に記録される。Build and Test が修正すると、コード変更が Code Generation の記録を経由せずに発生し、成果物と実装の対応が崩れる。
2. **Bolt gate の承認対象を保つため**。Bolt PR の merge は、記録された設計と生成コードへの承認である。gate 前の無人修正は、承認対象を記録の外で書き換える。
3. **halt-and-ask が autonomy 契約の安全弁であるため**。autonomous mode は「失敗時に停止して人間へ確認する」ことを条件に無 gate 実行を許している。失敗時の無人修正はこの安全弁を弱める。
4. **本家の有限試行の意図は満たしているため**。本家の「最大 2 回で人間へ委ねる」は反復を有限にする仕組みであり、Amadeus は最初の失敗で即座に人間へ委ねることで同じ終着点（人間判断）へ、より早く到達する。

## `build-test-results.md` の記録契約

失敗時も成功時も、次を `build-test-results.md` に残す。

- 実行したコマンドとその結果。
- 失敗内容（失敗したテスト、エラー出力の要点）。
- 修正後の再実行結果。

要約だけを残さない。この契約は `amadeus-construction-build-and-test` の Prohibitions に従う。

## Bolt gate との関係

- Build and Test の成功は Bolt PR 作成の前提である。失敗中の Bolt は PR を作成しない。
- 失敗した Bolt は、人間の判断で retry または skip できる（lifecycle construction の halt-and-ask 契約）。
- Bolt PR の merge が、Bolt 内の各 stage の `[?]` を `[x]` へ確定する承認証拠になる（autonomous mode）。

## 対象外

- 修正の自動再試行の実装。
- Build and Test への修正責務の追加。

## 将来の再検討条件

次のいずれかが起きた場合、失敗時処理の本家寄せを別 Issue で再検討する。

- halt-and-ask による停止が、明らかに機械的で安全な修正（typo 等）に対して過剰である運用実績が積み重なった場合。
- Code Generation との往復が Bolt のリードタイムを支配する運用実績を確認した場合。

## 関連文書

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [AI-DLC v2 Reviewer Mapping](aidlc-v2-reviewer-mapping.md)
- [AI-DLC v2 Sensor and Learn Mapping](aidlc-v2-sensor-learn-mapping.md)
- [Lifecycle Construction](lifecycle/construction.md)
