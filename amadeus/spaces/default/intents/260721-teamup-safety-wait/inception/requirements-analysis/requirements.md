# Requirements — 260721-teamup-safety-wait

## Intent analysis

利用者の目的は、`team-up.sh` が管理する current run の Codex pane が既知の `Additional safety checks` 画面で停止したとき、server-side safety checkを無効化せず、安全側へ閉じた条件の下で `Keep waiting` を選択して作業を継続できるようにすることである。価値境界は `business-overview.md`、所有・制約境界は `architecture.md`、変更候補と test seam は `code-structure.md` を正準入力とする。

recorded 人間裁定 E-TSWRA1〜3（leader 承認 2026-07-21T02:32:50Z）は、対象を current run の leader と全 engineer の Codex pane、許可操作を完全 visible fingerprint 下の Enter 1回、lifecycleを pane ごとの supervisor として確定した。

## Functional requirements

### FR-1 対象 pane の限定

- `team-up.sh` が current run で起動した leader と全 engineer の Codex paneだけを対象とする。
- role 名から current pane を毎回一意に再解決し、0件または複数件なら入力せず警告して停止する。
- pane IDを run record の永続識別子として扱わない。

### FR-2 既知 UI の fail-closed 検出

- Herdrの visible pane読取だけを用い、scrollback、recent output、履歴上の一致には反応しない。
- 既知の `Additional safety checks` 画面全文と、`Keep waiting` が現在選択中であることを完全 fingerprint で検証する。
- Herdr `pane read --source visible --format text` のmodal blockを行配列として扱う。許容する正規化は行末のCRLFからLFへの変換だけとし、ANSI除去、空白trim/collapse、soft-wrap結合、行順変更、部分一致を独自に行わない。ANSIを含む出力やfixtureと異なるwrapは不一致とする。
- 完全fingerprint fixtureは、対応Herdr/Codex version、pane列数、modal title、説明全文、全選択肢の順序、`Keep waiting` label、現在選択marker、confirm guidanceを閉じたschemaで保持する。必須fieldの欠損・追加・順序差・marker差を不一致とする。
- 通常pollは1,000ms以上の間隔で1回目のvisible読取を行う。1回目が完全fingerprint候補に一致した場合だけ、通常pollを待たず直ちにstability readを行う。単調時計で1回目の読取完了を起点、stability read完了を終点として経過時間が1,000ms以下であり、両方のsession、role、ephemeral pane identity、pane列数、完全fingerprintが同一の場合だけ操作可能とする。
- Herdr/Codexのversionまたはfingerprintが検証済み契約からdriftした場合、曖昧な正規化や部分一致へfallbackせず、入力なしで警告する。

### FR-3 許可入力の限定

- FR-1とFR-2が同時に成立した直後に限り、対象paneへEnterを1回だけ送る。
- Enter送信の直前にroleを再解決し、session、role、ephemeral pane identityが2回の読取時と同一であることを確認する。最初の読取完了から送信開始までの判定transaction TTLは1,000msとし、超過・消失・再生成・不一致なら入力を0件とする。
- 選択移動key、文字列、周期的Enter、複数Enter、approval応答、通常質問への回答を送らない。
- 送信後1秒以内にvisible paneを再読取し、既知modalが消失したことを確認する。消失を確認できなければ追加入力せず警告する。

### FR-4 one-shot latch と rearm

- pane単位のlatchにより、同一modal表示中のEnterを最大1回に制限する。
- modal不在を1秒間隔のvisible読取で連続2回確認した後だけ、そのpaneを次の独立したmodalに備えてrearmする。
- 同一fingerprintに対するrate limitは「latch取得から上記rearm成立まで追加入力0件」とし、時間経過だけでは解除しない。

### FR-5 supervisor lifecycle

- fresh開始とresume開始の双方で、対象となる各Codex paneに専用supervisorを起動する。
- `(Herdr session, current run, role)` を一意keyとする排他lockを原子的に取得し、active supervisorは高々1つにする。fresh/resumeの再実行は既存live ownerを再利用する冪等動作とし、owner不明・複数owner・lock競合では新規supervisorもpane入力も0件とする。
- 異常終了後のlock再取得は旧owner processが存在しないこととroleから再解決したephemeral pane identityを確認した後だけ許可し、旧latch状態を引き継がず、完全fingerprint二重読取から再開する。
- pane終了、member終了、session/run終了、`team-up.sh --kill`、起動失敗時のrollbackで対応supervisorをcleanupする。
- supervisorはteam-up/Herdr境界の専用helperとして所有し、agmsg message bridgeへmodal固有責務を追加しない。

### FR-6 可観測性

- 自動解除成功、role解決失敗、fingerprint/version drift、二重読取不一致、事後確認失敗、lifecycle cleanupを、対象roleと原因を識別できる形で診断出力する。
- 診断へpane本文全体、credential、secret、個人データを複製しない。

## Non-functional requirements

### Reliability and safety

- 読取からEnter送信までを原子的にできないHerdr seamのTOCTOU制約を前提とし、二重読取、短TTL、one-shot latch、事後確認で誤入力面を最小化する。
- 未知状態、曖昧状態、stale状態、role解決不能、version/fingerprint driftはすべて入力なしで終了する。
- supervisorの異常終了は対象Codex processやteam-up sessionを強制終了させず、自動解除機能だけを停止して警告する。

### Performance and scalability

- 通常poll intervalは前回通常poll完了から次回通常poll開始まで1,000ms以上とし、busy loopを禁止する。完全fingerprint候補検出後のstability readだけは通常pollから分離し、FR-2の1,000ms上限内で直ちに行う。
- supervisor数はcurrent runの対象Codex pane数に比例し、別sessionや非Codex paneを探索しない。
- paneごとの読取と状態は独立させ、一つのpaneの停止が他paneの監視を止めない。

### Security and privacy

- server-side safety check、sandbox、approval policy、Codex起動引数を変更・迂回しない。
- shell prompt、Claude pane、通常質問、approval、composer、他sessionへ入力しない。
- visible pane内容は判定に必要な一時データとして扱い、永続recordやmessage storeへ保存しない。

### Maintainability and testability

- pure fingerprint判定とHerdr lifecycle/input adapterを分離し、判定をfixtureで決定的にunit testできるようにする。
- fresh、resume、kill、rollback、role 0件/複数件、二重読取不一致、latch/rearmをintegration testで検証する。
- 既存のscript/Bun test方式とrepositoryのlint/typecheck規約を再利用し、新規runtime dependencyを追加しない。

## Constraints

- 変更所有者はteam-up lifecycleとHerdr境界であり、Codex本体、Herdr本体、server-side safety serviceは変更しない。
- Herdrのreadとsend-keysは別操作であり、完全なatomicityは提供できない。
- 現行agmsg bridgeにはmodal APIがないため、bridgeの拡張で解決しない。
- canonical sourceは`script/`ではなく既存の`scripts/`配下であり、生成物はrepository規約が要求する場合だけ更新する。
- Minimal bugfix scopeを維持し、無関係なrefactorや汎用TUI automation frameworkを追加しない。

## Assumptions

- current runのrole名はteam-up内で論理的に一意であり、Herdrから0件/1件/複数件を判別できる。安全性のため一意性を実行時に再検証する。
- 検証対象のHerdr/Codex組合せでは、既知modalと現在選択状態をvisible paneから決定的に識別できる。識別できない版や描画はunsupportedとしてfail-closedにする。
- requirements-analysis時点のsupport allowlistは実測した `herdr 0.7.1` と `codex-cli 0.144.6` の組合せだけである。別versionはpositive fixtureと全回帰testが追加されるまでunsupportedとする。
- `Keep waiting` が現在選択中の既知UIではEnter 1回がその選択を確定する。選択状態を移動させる操作は仮定しない。

## Out of scope

- safety checkの無効化、設定変更、approval bypass、sandbox迂回。
- `Keep waiting` 以外の選択肢への移動または選択。
- 通常質問、approval、composer、shell、Claude、他session/他runの自動操作。
- fuzzy matching、scrollback/recent output検出、OCR、汎用modal automation。
- agmsg protocol/message bridgeの拡張、pane IDの永続化、Herdr/Codexの改修。
- 自動解除以外のteam-up lifecycle改善。

## Open questions

recorded 人間裁定 E-TSWRA1〜3によりrequirements-analysisで必要な判断は解消済みであり、未解決のユーザー判断はない。現行実測の `herdr 0.7.1` / `codex-cli 0.144.6` visible表示は `Additional safety checks` を含む一方で `Keep waiting` の現在選択を含まない状態もあるため、その表示は必ずnegative fixture（入力0件）とする。positive fixtureは同じallowlist版で`Keep waiting`現在選択markerを含む実表示をcaptureして閉じたschemaへ固定し、captureできない場合は自動入力機能を有効化しない。

## Traceability

| Source / ruling | Requirement coverage |
| --- | --- |
| `business-overview.md` | Intent、FR-1、FR-3、Security、Out of scope |
| `architecture.md` | FR-2〜FR-5、Reliability、Constraints、Assumptions |
| `code-structure.md` | FR-5、Maintainability/Testability、Constraints |
| E-TSWRA1 choiceInternalNo=1 | FR-1、FR-5 |
| E-TSWRA2 choiceInternalNo=1 | FR-2〜FR-4 |
| E-TSWRA3 choiceInternalNo=1 | FR-1、FR-4、FR-5 |

## Acceptance criteria

1. Given current runのleaderまたはengineer Codex paneがallowlist版のpositive fixtureと一致する`Keep waiting`選択中modalを表示し、When 1回目の通常poll読取完了から直後のstability read完了までが単調時計で1,000ms以下、かつ同一session/role/ephemeral pane identity/列数/完全fingerprintが送信直前再解決まで安定し、Then Enterはそのpaneへ1回だけ送られ、1秒以内にmodal消失が事後確認される。
2. Given role解決が0件または複数件、未知version/fingerprint、部分一致、scrollbackだけの一致、二重読取不一致のいずれかで、When supervisorが評価し、Then pane入力は0件で原因が診断される。
3. Given同一modalが表示されたまま、When supervisorが複数回pollし、Then one-shot latchによりEnterは最大1回である。
4. Given事後読取でmodal消失が確認され、その後に新たな既知modalが表示され、When完全fingerprint条件が再成立し、Thenそのpaneはrearm後の新しい1回だけEnterを送れる。
5. Given freshまたはresumeでleaderと複数engineer paneが起動し、When team-up lifecycleを実行し、Then各対象paneにsupervisorが対応し、非Codex/別session paneには対応しない。
6. Given pane/member/session/run終了、`--kill`、またはrollback、When cleanup経路が完了し、Then対応supervisorは残存せず、その後のpane入力は0件である。
7. Given既存team-up/run-codex/team-msg regression suiteと新規bug regression tests、Whenrepository標準のlint/typecheck/test gateを実行し、Then全件passし、server-side safety/approval/agmsg bridgeの契約差分はない。
8. Given同一session/run/roleへfreshまたはresumeが並行実行され、When supervisor起動が競合し、Then active ownerは高々1つで、重複ownerまたはlock不整合時のpane入力は0件である。
9. Given二重読取後にroleのpaneが消失または再生成され、When送信直前の再解決でephemeral pane identityが変化し、Then旧fingerprintを根拠とするpane入力は0件である。
10. Given `herdr 0.7.1` / `codex-cli 0.144.6`以外、ANSIを含む表示、wrap/空白/行順差、`Keep waiting`現在選択marker欠損、または現行実測の待機文だけのnegative fixture、When fingerprintを評価し、Then pane入力は0件である。

## Review

**最終状態: APPROVED（E-TSWRAG1 recorded）**

独立review iteration 1は、supervisorの一意性・排他、read→send間のephemeral pane identity維持、safety timingとfingerprint oracleの定量化を指摘した。これらはFR-2〜FR-5、NFR、AC-1、AC-8〜10へ、原子排他、送信直前再解決、閉じたfixture schema、version allowlist、fail-closed条件として反映済みである。

iteration 2は、通常poll間隔と候補検出後のstability read TTLの時間条件が衝突していた一点を指摘した。最終修正では、通常pollを「前回通常poll完了から次回通常poll開始まで1,000ms以上」、stability readを「候補検出後に通常pollを待たず直ちに開始し、最初のread完了からstability read完了まで1,000ms以下」、送信transactionを「最初のread完了から送信開始まで1,000ms以下」と分離し、FR-2、FR-3、NFR、AC-1のclock起点・終点を整合させた。レビュー上限2回の後に行ったこの最終修正は、stage approval election E-TSWRAG1で独立実測され、choiceInternalNo=1が2票、GoA 1が2票、留保なしでrecorded承認された。

未解決findingはない。E-TSWRA1〜3、3 consumes、FR/NFR/Constraints/Assumptions/Out of scope/Open questions/Traceability/Acceptance criteriaとの矛盾もない。

### Sensor verification

- PASS — `required-sections`（本Review是正後に再実行）
- PASS — `upstream-coverage`（本Review是正後に再実行）
- PASS — `answer-evidence`（本Review是正後に再実行）
