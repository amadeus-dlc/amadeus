# no-silent-drop adoption evidence revision 再バインド要件

## Intent 分析

本 intent の目的は、[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156) で確認された no-silent-drop adoption evidence の revision identity 欠陥を修復し、コード変更を含む Pull Request が再び通常の必須チェックを通過できる状態へ戻すことである。

現行台帳は evidence を PR ブランチ上の commit SHA に束縛する。一方、このリポジトリはスカッシュマージを採用しているため、その SHA は着地時に `main` から到達不能になる。PR 上では到達可能なので検査は通り、着地後にだけ `t413` が赤へ反転する。同じ設計から [PR #2088](https://github.com/amadeus-dlc/amadeus/pull/2088)、[PR #2151](https://github.com/amadeus-dlc/amadeus/pull/2151)、[PR #2152](https://github.com/amadeus-dlc/amadeus/pull/2152) で再発し、[PR #2127](https://github.com/amadeus-dlc/amadeus/pull/2127) だけが偶然 mainline SHA を記録して緑だった。したがって、個別値の記入ミスではなく、着地後の main SHA へ再バインドする書込み経路の欠落を修復対象とする。

利用者が求める結果は次の2点である。

1. 現在の3層 evidence bundle を到達可能な revision へ決定的に再バインドし、`main` の最新 tip を緑へ戻す。
2. 以後のスカッシュマージでも既存 GitHub App が自動収束させ、人手による台帳編集や無期限の赤を発生させない。

Scope は `self-fix`、Depth は Minimal、Test Strategy は Comprehensive とする。

## 要求源とトレーサビリティ

Brownfield の上流 artifact として、`business-overview`、`architecture`、`code-structure` の各 CodeKB 文書を照合した。`intent-statement` と `scope-document` は本 intent の実行計画でスキップされているため、[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156)、Intent Mirror [#2160](https://github.com/amadeus-dlc/amadeus/issues/2160)、監査ログを要求源として代用する。`team-practices` は `amadeus/spaces/default/memory/org.md`、`team.md`、`project.md`、`phases/inception.md` の規則を参照した。

| 要求源 | 確定した契約 |
| --- | --- |
| Issue #2156 と4件の着地実績 | commit 到達性契約を維持し、着地後に main SHA へ再バインドする |
| Reverse Engineering の3段階実測 | revision 置換、artifact digest、receipt digest の順で3層不動点を再計算すれば問題数が 48 → 23 → 0 に閉じる |
| `E-ERR-RULING-1` | 着地コミット自身の単発失敗は許容し、main tip の自動収束を保証する |
| ruleset `main`（id `18843917`）と既存 workflow | `amadeus-dlc-bot[bot]` の GitHub App token／bypass 経路を再利用し、個人 token や `GITHUB_TOKEN` の write 権限を増やさない |
| `E-ERR-RULING-2` | bootstrap provenance の潜在欠陥は [Issue #2162](https://github.com/amadeus-dlc/amadeus/issues/2162) へ分離する |

要件ID単位の要求源と必須度は次のとおりである。

| 要件ID | 要求源 | 必須度 |
| --- | --- | --- |
| FR-1〜FR-3、FR-5、AC-1〜AC-5、AC-11〜AC-12 | Issue #2156、Reverse Engineeringの3層不動点実測、Requirements Analysis Review iteration 1 | 必須 |
| FR-4 | `team-practices` の機械判定可能・fail-closed・テスト可能な契約、およびworkflow/CLI間の安定した受渡し | 必須。field追加はschema version更新を伴う設計裁量 |
| FR-6〜FR-8、AC-6〜AC-10 | `E-ERR-RULING-1`、ruleset `main`、既存GitHub App直接書込み実績 | 必須 |
| NFR-1、NFR-2 | Issue #2156 の到達性安全境界、`team-practices` のfail-closed／secret最小権限 | 必須 |
| NFR-3 | CodeKB `architecture`／`code-structure` の既存正準関数とschema配置 | 必須。内部関数配置は設計裁量 |
| NFR-4 | `E-ERR-RULING-1` と既存main-only metrics workflowの運用境界 | main-only・有限timeout・直列化は必須。具体的な秒数とconcurrency key名は設計裁量 |
| Conventional Commits | リポジトリの `team-practices`／AGENTS.md | 必須。具体的subjectは設計裁量 |

## 機能要件

本要件では次の用語を区別する。

- **event revision**: main push workflow を起動した commit SHA。着地runでは squash landing SHA、rebind commit のrunでは rebind commit自身のSHAである。
- **workspace revision**: pure rebind 開始時の clean checkout が指す `git rev-parse HEAD`。
- **binding revision**: 処理開始時点で `adoption-evidence.json.currentRevision` に記録されている SHA。
- **pure rebind**: clean checkout の workspace revision を明示targetとして3層bundleを書き換える、PR／手動用の操作。
- **reconcile**: event revision に対して既存bundleをまず検証し、rebindが必要かを判定する main-only 操作。

### FR-1: 決定的な3層再バインド

システムは、呼出元が指定した完全な40桁 lowercase commit SHA を target revision として、次の3層を単一の再バインド操作で更新しなければならない。

1. `tests/no-silent-drop/adoption-evidence.json` の top-level `currentRevision` と全 receipt の `currentRevision`。
2. `tests/no-silent-drop/adoption-evidence-manifest.json` の全 `testedRevision` と、参照 artifact の `sha256`。
3. `tests/no-silent-drop/evidence/adoption-runs.json` の全 `testedRevision`。

操作は固定件数をハードコードせず、schema から全対象を列挙する。現行 bundle に対しては、観測済みの revision フィールド 24／24／25、manifest artifact 25件、receipt 23件を漏れなく処理できることを回帰試験で固定する。

`adoption-runs.json` の byte digest を再計算して manifest の該当 artifact 群へ反映した後、既存の正準関数 `evidenceDigestForReceipt()` と同じ契約で全 receipt の `evidenceDigest` を再計算する。別の digest 定義や第4の台帳を追加してはならない。

### FR-2: target revision の検証

pure rebind と reconcile が内部で起動する rebind は、同じ3層計算を使う一方でtrust境界を分離しなければならない。

pure rebind の書込み前に、target revision が次をすべて満たすことを検証する。

- 40桁の lowercase hexadecimal SHA である。
- ローカル Git object database で commit として解決できる。
- `git rev-parse HEAD` で得た workspace revision と完全一致する。
- index とworking treeがcleanである。rebindが生成する3ファイルの変更は、この事前検査後にだけ作られる。

したがってPRでは、evidenceが検証したコード・試験変更を先にcommitし、そのclean HEADをtargetとしてpure rebindを実行し、生成された3ファイルを後続commitへ含める。手動recoveryも同じく、復旧対象のmain commitをclean checkoutした状態で `target === HEAD` を満たす場合だけ実行できる。任意の祖先SHA、未commitの実装変更、detached objectをtargetとして受理してはならない。

reconcile がrebindを起動する場合は、checkout HEAD と event revision の完全一致を検証し、targetをevent revisionへ固定する。不正・未解決・到達不能・workspace／event不一致のtargetは型付き診断と非0終了で拒否し、bundleを変更してはならない。

reconcile は、event revision を無条件に新しい binding revision としてはならない。次の順序で判定する。

1. 現在の binding revision のまま、bundle 全体を event revision に対して検証する。
2. 到達性・digest・鮮度がすべて有効なら、`binding revision !== event revision` であっても **no-op** とする。これが rebind commit 自身の停止条件である。
3. 現在の binding revision がスカッシュ前のPR SHAで到達不能となったことだけが失敗原因で、かつ下記の2段階tree証明で内容同一性を証明できる場合だけ、event revisionをtargetとしてrebindする。
4. 内容同一性を証明できない、またはrevision identity以外の不整合がある場合は rebind せず fail-closed とする。証拠を再取得せずに異なる実装へ束縛してはならない。

内容同一性は、GitHubの「landing commitに関連付くPull Requests」APIを全ページ取得して、base branchが`main`、mergedであり、`merge_commit_sha`がevent revisionと一致する一意なPRを解決した上で、PRの永続head ref `refs/pull/<number>/head` から取得した最終PR headを用いて次の順に証明する。

1. binding revision が最終PR headの祖先であることを検証する。両revisionのrecursive repository treeからFR-1の派生出力3ファイルだけを除き、残る全entryのpath、object type、Git mode、object IDが一致しなければならない。これにより、evidence生成後から最終PR headまでの差分が3派生fileだけであることを証明する。
2. 最終PR headとlanding commitは除外なしのrepository tree全体が一致しなければならない。実装は両commitのroot tree object ID一致、または同値なrecursive全entry比較で判定する。これにより、対象PRのchanged filesに現れないbase driftも漏れなく拒否する。

PRが0件または複数、baseが`main`以外、未merge、`merge_commit_sha`不一致、関連PR APIのpagination不完了、PR head ref取得不能、binding revisionがPR headの祖先でない、3派生file以外のbinding→PR head差分、PR head→landingのtree不一致のいずれかなら「同一」と推定せずfail-closedとする。

この2段階tree証明は「スカッシュでcommit identityだけが変わり、証拠作成後のPR内容と着地内容は同じ」というidentity-only rebind専用である。Pull Request Files APIのchanged-file集合、ローカル推測path、`t413`の鮮度path specを証明の正本にしてはならない。[Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153) が扱う evidence 鮮度path specを変更せず、両契約を混同しない。

### FR-3: 原子的・fail-closed な書込み

再バインド操作は、全更新結果をメモリまたは隔離された一時領域で構築し、完全な bundle 検証が成功した場合にだけFR-1の3ファイルを原子的に適用しなければならない。pure rebindはこの3ファイルだけを変更する。reconciliationは、更新後bundleのdigestを記録するFR-6のledger 2ファイルも同じtransactionで進め、正確な5ファイルを1つのGit commitへ含める。

- parse、schema、参照、digest、revision、I/O のいずれかが失敗した場合、push 可能な部分更新を残さない。
- 検証前または検証失敗後に成功を報告しない。
- pure rebindではFR-1の3ファイル以外、reconciliationではFR-6の5ファイル以外を変更しない。
- force push、履歴改変、到達性検査の緩和を行わない。

同じ target と同じ bundle に再実行した場合は byte-identical な no-op として exit 0 を返す。途中失敗後の再実行でも同じ最終結果へ収束しなければならない。

### FR-4: 機械可読な実行結果

rebind／reconcile は UTF-8 のJSON objectを **stdoutへ1行だけ**出力し、末尾をLFで終えなければならない。進捗・診断ログはstderrへ出し、stdoutへ混在させない。共通envelopeを次のとおり固定する。

```json
{
  "schemaVersion": 1,
  "operation": "no-silent-drop-evidence-rebind",
  "status": "changed | no-op | superseded | error",
  "code": "安定した機械判定コード",
  "eventRevision": "40桁SHAまたはnull",
  "bindingRevision": "40桁SHAまたはnull",
  "targetRevision": "40桁SHAまたはnull",
  "changed": false,
  "counts": {
    "registryRevisions": 0,
    "manifestRevisions": 0,
    "runRevisions": 0,
    "artifactDigests": 0,
    "receiptDigests": 0
  },
  "paths": [],
  "validation": {
    "ok": false,
    "problems": []
  },
  "error": null
}
```

各fieldの型と存在は全statusで不変とする。`error` は成功時 `null`、失敗時は `{"code": string, "message": string}` とする。`changed` は `status === "changed"` の場合だけ `true` とする。`targetRevision` はrebind実行時だけSHA、それ以外は `null` とする。`paths` は実際に変更したrepository-relative pathの昇順配列とする。

最低限、成功コード `REBIND_OK`、`REBIND_NOOP`、`REBIND_SUPERSEDED` を固定する。`changed`、`no-op`、`superseded` はexit 0、`error` は非0とする。入力／検証／I/O／credential／push競合の失敗は互いに区別できる安定した error code を持つ。secret、token、private key、GitHub App credential を出力してはならない。

### FR-5: 現在の main を復旧する

実装 PR は、現行の到達不能 revision をFR-2のpure rebindで修復し、手編集専用の例外手順を持ち込んではならない。PR上では、コード・試験変更をcommit済みのclean branch HEADをtargetとしてbundleを生成・検証し、その3ファイルを後続commitへ含める。スカッシュ着地後はFR-6の自動収束がlanding revisionへ再バインドする。

少なくとも次が成功しなければならない。

- `validateEvidenceRegistry(...).ok === true`
- `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` が 10 pass / 0 fail
- `bun tests/no-silent-drop-gate.ts check --base-revision <trusted-base>` が `NO_SILENT_DROP_OK`

### FR-6: main push 後の自動収束

`main` への push ごとに、PR の `CI Success` とは独立した main-only reconciliation を起動しなければならない。着地コミットの `t413` が既存の PR SHA により失敗しても reconciliation 自体は開始でき、同じ main-push run の中で人手を介さず必要性判定を行うこと。FR-2 の判定が rebind を要求した場合だけ、event revision をtargetとして rebind commit の作成を試みる。

自動収束は既存の `METRICS_BOT_CLIENT_ID`／`METRICS_BOT_PRIVATE_KEY` から発行する GitHub App token と `amadeus-dlc-bot[bot]` identity を再利用する。repository ruleset が許可する Integration bypass 以外の新しい bypass 主体を追加してはならない。

自動収束が変更を必要とする場合は、次を満たす1 commit を main へ追加する。

- 変更は FR-1 の3ファイルと、reconciliation により更新後 bundle のdigestを記録する `tests/no-silent-drop/baseline.json`／`tests/no-silent-drop/exemptions.json` の2ファイルを合わせた、正確な5ファイルだけである。pure rebind と squash identity proof の除外対象は FR-1 の3ファイルだけとし、この5ファイル許可を流用してはならない。
- commit 前に focused validator と回帰試験が成功している。
- commit message は Conventional Commits に従う。
- commit は処理対象 landing SHA の子孫であり、non-fast-forward push を行わない。

### FR-7: ループと競合の防止

rebind commit 自身が main push workflow を再起動した場合、binding revision は直前のlanding SHA、event revisionはrebind commit SHAとなる。両者が異なっていても、bundleがevent revisionに対して到達可能かつ整合済みで、直前のreconciliation commitの差分がFR-6の正確な5ファイルだけならFR-2の第2項により no-op とし、rebind commit を連鎖生成してはならない。この停止条件は、pure rebind と squash identity proof が除外する派生3ファイルの境界を拡張しない。

複数の main push が近接した場合は reconciliation を直列化し、push 直前に remote main tip を再検証する。処理中に main が先へ進んだ場合、古い landing SHA を target にした commit を pushせず、superseded として終了するか最新 event の処理へ委ねる。force、無条件 retry、stale checkout からの上書きを禁止する。

### FR-8: 失敗の可視化

自動収束で validation、credential、checkout、commit、push、競合解決のいずれかが失敗した場合、workflow job を非成功で終了し、error code と target SHA を job summary に残さなければならない。失敗を `continue-on-error`、空 catch、ログのみの成功へ変換してはならない。

最新 main tip が stale の間は後続のコード変更 PR が既存検査を迂回して green にならないことを維持する。人手による recovery は自動経路の再実行、またはclean checkoutで `target === git rev-parse HEAD` を満たすpure rebindに限定し、JSON の個別編集を正規手順にしない。

## 非機能要件

### NFR-1: 完全性と信頼性

- revision 到達性、artifact digest、receipt digest の3条件を同時に満たした bundle だけを成功とする。
- `currentRevision` の到達性 assertion を削除・skip・内容一致例外で弱めない。
- main tip は着地後の自動 reconciliation により、同じ workflow execution chain 内で収束する。人間の応答待ちを挟まない。
- 同一入力に対する結果は byte-reproducible かつ冪等である。

### NFR-2: セキュリティ

- workflow の既定 `permissions: contents: read` を維持し、write は短命な既存 GitHub App token のみに限定する。
- token は checkout／push に必要な最小権限だけを要求し、ログ・artifact・JSON結果へ露出しない。
- 外部サービス、追加 secret、個人 access token を導入しない。

### NFR-3: 保守性

- digest と validator の既存正準関数を再利用し、再バインド専用の複製実装を作らない。
- schema entry の増減に追随できる列挙方式とし、現行件数を制御ロジックへ埋め込まない。
- CLI／workflow／test の責務を分離し、workflow shell に3層再計算ロジックを記述しない。

### NFR-4: 運用性

- reconciliation は main-only とし、PR の critical path を延長しない。
- workflow には有限 timeout と直列化 concurrency key を設定する。
- success、no-op、superseded、failure をログから区別できる。

## ユーザーシナリオと受け入れ条件

| ID | シナリオ | 期待結果 |
| --- | --- | --- |
| AC-1 | 到達不能な PR SHA を持つ現行 bundle を到達可能な target へ再バインドする | 3層不動点が問題0に閉じ、validator、t413、gate がすべて緑になる |
| AC-2 | 同じ target で2回実行する | 2回目は byte diff なし、`no-op`、exit 0 |
| AC-3 | revision だけを置換する | validator が残る digest 不整合を拒否し、成功扱いしない |
| AC-4 | artifact digest まで更新し receipt digest を更新しない | validator が receipt 不整合を拒否し、成功扱いしない |
| AC-5 | 不正SHA、未解決SHA、非祖先SHAを指定する | 変更なし、型付き診断、非0終了 |
| AC-6 | main に evidence 更新PRをスカッシュマージする | binding revision→最終PR headは3派生fileを除く全tree entryが一致し、最終PR head→landingはroot tree全体が一致することを証明した後だけ、bot が landing SHA へFR-6の正確な5ファイルからなるrebind commitを追加する。landing run の単発赤は許容するが、最新 main tip の `CI Success` は緑へ収束する |
| AC-7 | rebind commit の push で workflow が再起動する | binding revisionは親landing SHAのままでもevent revisionに対するbundle検証が成功するため、JSON envelopeは `status=no-op`／`code=REBIND_NOOP`／`targetRevision=null`、追加commitなし |
| AC-8 | 2つの main push が近接し古いrunのcheckoutがstaleになる | 古いrunは pushせず superseded、最新runだけが整合したfast-forward commitを作る |
| AC-9 | GitHub App secret または push が失敗する | mainへの部分変更なし、job非成功、targetとerror codeが可視化される |
| AC-10 | pure rebindで派生3ファイル以外、またはreconciliation commitでFR-6の5ファイル以外へ意図しない差分がある | commit/pushを拒否する |
| AC-11 | PR／手動文脈でpure rebindを実行する | clean checkoutかつtargetがHEADと完全一致する場合だけ変更を生成する。祖先SHA、dirty index、dirty working treeでは変更なし・非0終了 |
| AC-12 | landing commitに関連するmerged PRを解決する | 全pageからbase=`main`・merged・merge SHA一致の一意なPRを解決し、binding→PR headの非派生全tree entry一致とPR head→landingのroot tree一致時だけrebindする。0件／複数／pagination不完了／祖先不一致／base drift／1 byte不一致はfail-closed |

## テスト要件

Test Strategy は Comprehensive とし、最低限次を検証する。

1. 再バインド計算の unit test: 全 entry 列挙、digest 再計算、no-op、malformed schema、missing artifact、I/O failure。
2. integration test: 一時 Git repository で到達可能／不能 revision、3段階の不整合、部分書込み拒否、再実行収束を検証する。
3. workflow contract test: main-only trigger、GitHub App token、CI失敗から独立した起動、許可ファイル限定、concurrency、loop guard、stale tip guard を文字列だけでなく構造として検証する。
4. negative tamper test: revision、artifact bytes、manifest digest、receipt digest の単独改ざんがそれぞれ実際に赤くなることを示す。
5. JSON contract test: 4 statusすべてでfield存在・型・UTF-8・単一行LF・stdout非混在・exit code対応を固定する。
6. pure rebind trust test: target=clean HEADだけを受理し、ancestor target、dirty index、dirty working tree、未解決targetをそれぞれ変更前に拒否する。
7. identity proof test: 一意なmerged PRを全ページから解決し、binding revisionが最終PR headの祖先で、両者の差分が3派生fileだけ、かつ最終PR headとlandingのroot treeが同一ならrebindする。0件／複数PR、pagination欠落、base／merge SHA不一致、祖先不一致、binding→PR headの非派生差分、PR head→landingのbase drift、rename／mode／object type／1 byte不一致、PR ref取得不能は変更なしでfail-closedになることを示す。
8. 既存回帰: `t413` 10件、no-silent-drop repository adoption tests、no-silent-drop gate、lint、typecheck、`bun run test:ci`。

main 着地後にのみ成立する AC-6 は、PR 内では fixture／workflow contract により再現し、着地後の実 run で最新 main tip の `CI Success` と bot commit を確認して最終受け入れ証拠とする。

## 制約

- リポジトリのスカッシュマージ運用を変更しない。
- required check は ruleset `main` の `CI Success` 1件であり、その判定を緩めない。
- 現在の利用者 token は ruleset bypass 不可である。自動書込みは既存 GitHub App Integration に限定する。
- `tests/no-silent-drop/` の schema v1、既存 receipt ID、既存 gate 意味論との後方互換を保つ。
- 生成済み `dist/` や self-install 面は本修正の正本ではなく、手編集しない。
- Issue #2156 を塞いでいる依存先 [PR #2155](https://github.com/amadeus-dlc/amadeus/pull/2155) の着地を最優先で解放できる変更量に抑える。

## 仮定

- 既存 `amadeus-dlc-bot[bot]` の GitHub App installation、repository variable、secret、ruleset bypass は引き続き利用可能である。利用不能なら自動収束は fail-closed とし、暗黙の別 credential へfallbackしない。
- スカッシュ着地コミットがPRで検証した内容を含むことは仮定せず、FR-2のbinding→PR head非派生tree一致とPR head→landing全tree一致で証明する。再バインドは、この証明に成功した場合だけ実行済み evidence の revision identity と派生digestを更新し、試験結果を捏造・再生成しない。
- evidence-only rebind commit は、着地コミットの実装内容を変更しない。

## スコープ外

- `bootstrap-provenance.json` の `postRevision`、`candidate.digest`、fallback 経路の修復。別Issue [#2162](https://github.com/amadeus-dlc/amadeus/issues/2162) で扱う。
- 要求からTLA+モデルを生成・改訂する formal model authoring 工程。別Issue [#2161](https://github.com/amadeus-dlc/amadeus/issues/2161) で扱う。
- commit SHA から tree／内容digestへのschema移行。
- 到達不能 SHA を内容一致だけで許容する例外。
- no-silent-drop のAST規則、baseline、exemption、検査対象範囲の再設計。
- [Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153) の evidence 鮮度 path spec 問題。
- GitHub ruleset、マージ方式、required check 集合の変更。

## 矛盾・抜け漏れの解消

1. **PR上では緑、着地後だけ赤**: 着地 SHA が事前に確定しないため、着地コミット自身の単発赤は許容し、main tip の自動収束を契約化した。
2. **自動修復がCI失敗に依存すると起動不能**: reconciliation を `CI Success`／`t413` の成功依存から外し、main push で独立起動する。
3. **bot commit が再びbotを起動する無限ループ**: event revisionとbinding revisionの等値ではなく、既存bindingのままevent revisionに対するbundle検証が成功することを停止条件とし、追加commitを作らない。
4. **近接pushで古いSHAへ戻す競合**: 直列化と push 直前の remote tip 再検証により stale write を拒否する。
5. **派生3ファイルとledger 2ファイルの部分更新**: 全bundle検証後にFR-6の正確な5ファイルを同じreconciliation commitへまとめ、失敗時はpush可能な部分状態を残さない。pure rebindは派生3ファイルだけを原子的に更新する。
6. **同根のbootstrap欠陥が黙って残る**: 本 intent へ混在させず、受け入れ条件を持つ [Issue #2162](https://github.com/amadeus-dlc/amadeus/issues/2162) として追跡可能にした。
7. **identityだけを書き換えて未試験コードへ証拠を付け替える危険**: binding revision→最終PR headは3派生台帳以外の全tree entry一致、最終PR head→landingは除外なしのroot tree一致を要求する。PR changed filesに現れないbase driftを含め、証明不能・不一致ならfail-closedとした。
8. **機械可読出力の解釈差**: versioned JSON envelope、型、status、code、stdout/stderr境界、exit codeを固定した。
9. **PR／手動rebindのtrust境界欠落**: pure rebindはclean checkoutのHEADだけをtargetとして許可し、reconcileのevent revision trustと分離した。

## 未解決事項

要件を分岐させる未解決事項はない。CLI の具体的な mode 名、内部関数の配置、workflow file を既存CIへ統合するか独立fileにするかは、上記の責務・安全境界・受け入れ条件を満たす範囲で code-generation が決定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T03:06:57Z
- **Iteration:** 1
- **Scope decision:** none

正準比較集合がPR差分だけに限定され、binding revisionとlanding commitの証拠対象内容が同一であることを証明できない。

### Findings

- BLOCKER | FR-2／AC-6／AC-12のidentity proofはPR changed-file集合だけを比較するため、binding revision作成後にmainへ入った別変更を検出できない。例えば別PRが証拠対象の実装・試験pathを変更した後に対象PRを更新せずスカッシュ着地すると、そのbase側変更は対象PRのchanged filesに現れず、未試験内容を含むlanding SHAへ再バインドできる。binding revisionからPR headまでが3派生fileだけの差分であること、およびPR headとlandingの全treeが同一であることを証明するか、同等にbase driftを漏れなく拒否する正準比較契約とnegative testを定義する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T03:10:46Z
- **Iteration:** 2
- **Scope decision:** none

binding revisionから最終PR head、最終PR headからlandingへの2段階tree証明がbase driftを含めてfail-closedに閉じ、要件は実装・受け入れ判定可能である。

### Findings

- None
