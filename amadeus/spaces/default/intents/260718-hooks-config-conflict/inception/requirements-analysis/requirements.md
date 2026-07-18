# Requirements — hooks-config-conflict（Issue #770）

上流入力（consumes全数）: `amadeus/spaces/default/codekb/amadeus/business-overview.md`（multi-harness配布と利用者価値）、`amadeus/spaces/default/codekb/amadeus/architecture.md`（Codex hooksの二重所有境界と恒久案）、`amadeus/spaces/default/codekb/amadeus/code-structure.md`（reader / writer / packaging / activation / restart経路台帳）

測定ref: `65ee3247e34a898e1864ec5b9b0d8a33d9a17760`。選択事項はE-770-RA（agmsg一次記録、2026-07-18T00:52:33Z開票）で確定した。Q1=A（active `.codex/hooks.json` をuntrack / ignore）、Q2=A（self-repositoryとCodex配布契約を同時修復）。開票時の留保必須票はQ1のe4 GoA 2が1件であり、AC-1a / AC-1c / AC-1f / AC-4aへ1件中1件を転記した。Q2はe3 / e4ともGoA 1で留保なし。文書影響面は`origin/main@082eecf7b`を基準に対象語彙をrepository全域で検索し、AC-2cへ列挙した。

## Intent分析

利用者がagmsg monitorを有効にしても、AmadeusのCodex hooksとbridge deliveryを維持したまま、マシン・clone固有のruntime状態がGit管理対象を汚さない状態へ戻す。`business-overview.md`が示すone-core-many-harnessの利用者価値を保ち、self-hosting repositoryだけの局所回避ではなく、同じCodex配布物を導入するconsumerにも同じ所有境界を出荷する。

欠陥の型は、Amadeusがtracked canonical activationとして扱う`.codex/hooks.json`と、agmsgがmutable per-clone runtime stateとして扱う同一パスの二重所有である。`architecture.md`の代替案比較とE-770-RAに従い、tracked canonicalを`.codex/hooks.json.example`へ一本化し、active fileをローカルruntime所有へ移す。外部agmsgのdispatcher設計変更は要求しない。

成功は次の観測で判定する。

- fresh self checkoutとfresh packaged consumer fixtureの双方で、active hooksの活性化後・agmsg互換writer適用後・再適用後も`git status --short`がcleanである。
- writer適用済みでtracked activeがdirtyなself repositoryをfast-forward更新しても、activeのSHA-256を保ったままuntrackedかつignoredへ移行し、未解決index・暗黙stash・tracked差分を残さない。
- packaged consumerはsetupにGit indexを操作させず、利用者が所有するcommitでtracked activeをuntrack / ignoreへ移行し、activeのSHA-256を保つ。
- tracked canonical bytesはwriter適用前後で不変、tracked fileにマシン / clone固有絶対pathが存在しない。
- active hooksはAmadeusの9 commandを保持し、Codex再起動後のagmsg monitor deliveryが成立する。
- `dist:check`、`promote:self:check`、関連test、typecheck、lintがgreenである。

## FR-1: tracked canonicalとlocal activeの所有分離

- **AC-1a**: `.codex/hooks.json`をGit indexから除外し、root `.gitignore`でlocal runtime fileとしてignoreする。`git ls-files --error-unmatch .codex/hooks.json`は不成立となり、`.codex/hooks.json.example`はtrackedのまま残る。
- **AC-1b**: canonical generatorは変更後もAmadeusの9 commandを整形済みexampleへ生成する。確約級引用: `packages/framework/harness/codex/emit.ts:294`の`emissions.push({ path: join(DCODEX, "hooks.json.example"), content: emitHooksJson });`を唯一の生成正本とし、root exampleと`dist/codex/.codex/hooks.json.example`のbyte一致を維持する。
- **AC-1c（E-770-RA留保転記）**: fresh self checkoutでrepo提供のCodex起動経路を使う場合、agmsg writerまたはCodex起動より前に、active file不在時だけexampleから`.codex/hooks.json`を活性化する。既存active fileは上書きしない。特に、現状active生成を行わずshimへ直行する`scripts/run-codex.sh:10`の`exec mise exec -- ... codex-shim.sh`と、先にwriterを呼ぶ`scripts/team-up.sh:747`の`bash "$DELIVERY" set monitor codex "$wt"`の順序を、fresh cloneでAmadeusの9 commandが欠落しない契約へ揃える。
- **AC-1d**: active contractのdoctorはcanonical exampleとactiveをJSON parseし、Amadeus Codex adapterを呼ぶ各commandを`event + matcher（省略時はnull）+ type + command`のmultisetへ正規化して比較する。canonical example不在 / parse不能、active不在 / parse不能、またはactive側のAmadeus multisetがcanonicalと一致しない場合はFAILとし、欠落、event / matcherの誤配置、重複、obsolete commandを検出する。agmsg entryなど非Amadeus組の追加、key順、配列順、空白、minify差は許容する。FAIL時は不足 / 余剰tupleだけを列挙し、active JSON全文、秘密情報、local絶対pathは出さず、activeを外部へ退避して不足組をmanual mergeした後に再実行する非破壊案内を出す。doctor自身はactiveを上書き・削除しない。
- **AC-1e**: writerでdirtyになったtracked activeを持つ**self repository**は、次の専用手順で修正refへ更新する。(1) Codex sessionとagmsg writer / monitorを停止して対象refをfetchする。(2) current HEADがactiveをtrackし、対象refがactiveをuntrack、exampleをtrack、activeをignoreすること、対象refがfast-forward可能であること、staged / unmerged / unrelated tracked・untracked変更がないことを確認し、一つでも不成立ならactiveへ触る前に停止する。(3) activeをrepository外へmoveし、更新前SHA-256と退避先SHA-256の一致を確認する。(4) `git merge --ff-only <target-ref>`で更新する。(5) 退避物をactiveへbyte copyして戻し、退避物自体はlive acceptance完了まで保持する。(6) active SHA-256不変、activeがuntrackedかつignored、canonical exampleがtracked、unmerged path 0、stash増分 0、`git status --short` clean、doctor PASSをartifactから確認する。予期せずmergeが失敗した場合は退避物をactiveへ復元して停止する。この経路では`git pull`、`git stash`、更新前の`git rm --cached`、広域`checkout` / `reset` / `clean`を使わない。隔離Git実測では、通常pullはexit 0でもautostash競合と`DU .codex/hooks.json`を残し、更新前の`git rm --cached`は`untracked working tree file would be overwritten`で更新不能となった一方、repository外move → fast-forward merge → byte復元はSHA不変・untracked・ignored・cleanを満たした。
- **AC-1f**: promote-selfはlocal activeを引き続きpreserveする。確約級引用: `scripts/promote-self.ts:90`の`".codex/hooks.json",`を保持し、checkはignored activeを`DIFFERS` / `ORPHAN`として扱わず、applyも削除・上書きしない。

## FR-2: selfとCodex配布契約の同期

- **AC-2a**: root `.gitignore`とCodex正本`packages/framework/harness/codex/dot-gitignore`の双方へactive hooksのlocal-runtime境界を明記する。後者は`packages/framework/harness/codex/manifest.ts:43-50`のprojectRoot mappingから`dist/codex/.gitignore`へ生成し、distを手編集しない。
- **AC-2b**: `bun scripts/package.ts`と`bun run promote:self`で、正本、`dist/codex/`、self-install面を同一変更内に同期する。`dist:check`と`promote:self:check`は変更後の所有境界を決定的に検査する。
- **AC-2c**: repository全域の対象語彙検索で抽出したREADME、`docs/guide/harnesses/codex-cli.md` / `.ja.md`、`docs/amadeus-files.md` / `.ja.md`、`docs/reference/14-claude-features.md` / `.ja.md`を同一変更で同期する。READMEとCodex guideは、(1) exampleはcommit可能なcanonical、(2) activeはignoreされるlocal runtime、(3) fresh installのactive不在時活性化、(4) self repositoryはAC-1e、packaged consumerはAC-2eという別々のmigration、(5) doctorの意味検査 / trust確認、を説明する。英日ガイドの意味差を残さず、self経路で通常pullや更新前`git rm --cached`を案内しない。file tree英日版とharness比較表英日版はactive / canonicalの所有者差を明記する。
- **AC-2d**: `packages/setup`の汎用dist copyで配布が成立する限り、setup domainへCodex専用分岐を追加しない。fixtureが配布不足を実証した場合は実装前に逸脱として停止し、leaderへ報告する。
- **AC-2e**: **packaged consumer**の既存repositoryは、activeをrepository外へbackupしてSHA-256を記録し、package更新がexampleとignore契約を導入して既存active bytesを上書きしないことを確認した後、consumer自身が`git rm --cached -- .codex/hooks.json`を実行する。consumerはactiveのindex deletion、canonical example、ignore契約を自身のcommitへ含め、commit後にactive SHA-256不変、untrackedかつignored、canonical tracked、unmerged path 0、`git status --short` clean、doctor PASSを確認する。setup / launcher / doctorはconsumerのGit indexやcommitを代理操作しない。

## FR-3: agmsg互換と再起動delivery

- **AC-3a**: external agmsg 1.1.7の書込先は変更しない。確約級引用: `scripts/drivers/types/codex/type.conf:18`の`hooks_file=.codex/hooks.json`を外部境界として受け入れ、writerがlocal activeをminifyしagmsg entry /絶対pathを追加してもtracked diffへ波及させない。
- **AC-3b**: agmsg互換writer適用後も、active JSONはparse可能でAmadeusの9 commandを全て保持する。現行writerのstrip / add対象であるSessionStart、SessionEnd、Stop以外のevent / matcherも欠落させない。
- **AC-3c**: Codex manifestが公開する`monitor` / `turn` / `off`の遷移と、同一modeの反復適用でagmsg-owned entryを重複させない。mode追加をAmadeus側で発明しない。
- **AC-3d**: restart相当の再適用でも契約を維持する。確約級引用: external `codex-monitor.sh:194`の`"$SCRIPT_DIR/../../../delivery.sh" set monitor codex "$PROJECT" >/dev/null`を二回目のwriter適用としてfixtureで再現し、実agmsg / Codexのlive acceptanceでは人間が起動した再起動後セッションで受信を確認する。
- **AC-3e**: マシン / clone固有絶対pathはignored active内にのみ存在し得る。example、dot-gitignore、dist、docs、test goldenを含むtracked変更面へ絶対pathを固定しない。

## FR-4: 回帰検証と落ちる実証

- **AC-4a（E-770-RA留保転記）**: `tests/integration/`に、実Git temp repositoryとdeterministicなagmsg互換writer stubを使う回帰testを置く。fresh self / packaged consumerの各fixtureで、活性化前後、writer初回、restart相当の再適用後を観測し、(1) Git clean、(2) tracked canonical byte不変、(3) Amadeus 9 command保持、(4) agmsg entry重複なし、(5) tracked絶対pathなし、(6) active不在のまま無音起動しない、をassertする。doctorは意味的に完全なminified activeと非Amadeus追加組をPASSし、active / exampleの不在・invalid JSON、canonical組の欠落・誤配置・重複・obsolete commandを不足 / 余剰tuple付きFAILにする。
- **AC-4b**: test配置と計測を別軸で扱う。実FS / Gitを使うためintegration層へ置き、productionロジックを追加する場合はin-process seamでも駆動してlocal lcovのdiff追加行未カバーを0にする。「in-processだからunit」へ移さない。
- **AC-4c**: fix適用前の面では、tracked activeへのwriter適用により`git status --short`がdirtyとなることを実際に赤で観測し、fix適用後に同じfixtureがgreenになることを実証する。一時注入は対象ファイル限定で行い、赤の観測から復元までを不可分にする。
- **AC-4d**: 通常CIは外部agmsgを必須依存にせず、AC-4a / AC-4f / AC-4gのhermetic testをblocking gateとする。real agmsg / Codex bridgeはopt-in live acceptanceとするが、本Issueの完了判定では実行を必須とする。手動inbox pollerを停止した状態で、`./scripts/run-codex.sh`から新規Codexセッションを起動し、最初のturn後にmonitor bridgeがaliveであることを確認する。次に人間がセッションを再起動して1 turn送り、leaderからの一意なpingが手動`inbox.sh`なしで当該セッションへpushされ、その返信がleaderへ届くことを確認する。agmsg / Codex version、delivery mode、bridge status、ping識別子、送受信時刻をevidenceへ記録し、失敗時はworkflowを完了しない。live proofのtrigger名はCode Generationで既存E2E慣例から決め、新しい数値timeoutをrequirementsから発明しない。
- **AC-4e**: Issue起票時の再現手順をレビューで再適用し、`.codex/hooks.json`の`1 insertion / 93 deletions`という表示形ではなく、根本契約であるGit clean・canonical不変・delivery成立の三面で閉包を判定する。
- **AC-4f**: self repository upgrade fixtureはlocal bare originと修正前baseを作り、tracked activeへwriter stubを適用してdirtyにしてから、対象refでactive削除・example保持・ignore追加をcommitする。AC-1eのrepository外move → fast-forward merge → byte復元を実行し、active SHA-256不変、activeがuntracked + ignored、canonical exampleがtracked、unmerged path 0、stash増分 0、`git status --short` cleanをassertする。直接merge、通常pull、更新前`git rm --cached`が安全な代替として成立しないREDも保持する。unrelated dirty / staged / unmerged、対象refの契約不足、non-fast-forwardの各negative caseではactiveへ触る前に非0で停止し、全bytesとHEADを変えない。
- **AC-4g**: packaged consumer upgrade fixtureは、consumerがtracked activeへwriter stubを適用した状態からpackage更新を実行し、active SHA-256を変えずにexampleとignore契約を導入する。その後consumer-owned `git rm --cached`とconsumer commitを行い、activeがuntracked + ignored、canonical exampleがtracked、unmerged path 0、`git status --short` clean、doctor PASSをassertする。setupがGit indexを変更しないこともassertする。

## 非機能要件

- **NFR-1 Reliability / idempotence**: active不在時の活性化は一回で成立し、既存activeと反復writer適用を破壊しない。失敗時はloudに非0または警告を返し、「Amadeus hooksが無いが起動成功」と扱わない。
- **NFR-2 Security / privacy**: tracked面・PR diff・生成distへユーザー名、home、clone / worktree絶対pathを残さない。local activeに含まれる既存秘密情報をlog / fixtureへ転記しない。
- **NFR-3 Portability**: ignore / activation契約はpath separatorや特定homeに依存しない。macOSだけの実測をWindows / Linuxで成立する一般契約として偽装せず、既存Codex `commandWindows`は外部agmsgに委ねる。
- **NFR-4 Maintainability**: tracked canonicalはexample一箇所、runtime mutable stateはactive一箇所という所有者分離を保つ。pretty-print post-processing、dispatcher shim、二重実装、新runtime dependencyを追加しない。
- **NFR-5 Performance**: 新しい常駐process、network call、必須external installを追加しない。活性化はlocal file existence / copyの範囲に留め、根拠のない時間閾値を設けない。
- **NFR-6 Observability / testability**: doctor、launcher、migration、test failureはactive / example欠落、JSON parse不能、copy / SHA検証失敗、canonical組の欠落・誤配置・重複・obsolete command、unrelated dirty path、契約不足ref、non-fast-forward、unmerged pathを区別できる文言を出す。検証結果は実行したcommandのexit codeとartifactから導出し、更新commandのexit 0だけを成功根拠にしない。

## 制約

- 外部agmsg skillは本repositoryの変更対象外であり、static dispatcher + ignored sidecarの上流協調改修を#770へ持ち込まない。
- [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783)で解決済みの`.codex/agmsg-delivery-mode` ignore / preserveを再実装しない。
- user-owned dirty `.codex/hooks.json`と旧intent `260717-mirror-issue-tool`のstate / auditを変更・stash・resetしない。実装はBolt worktreeで隔離する。
- AC-1eはself repository、AC-2eはpackaged consumer向けmigration契約であり、この作業中に現在のユーザー所有cloneへ自動適用しない。
- `dist/`は正本から生成し、手編集しない。変更は1 Bolt / 1 PRとし、push前にdeslopとlocal lcovを含む全検証を再実行する。
- PRのmergeはユーザーの明示承認後にleaderが執行する。本intentのstanding grantはstage gateに限り、phase boundaryやPR mergeへ流用しない。

## 仮定

- Codex CLIはproject rootの`.codex/hooks.json`をactive hook設定として発見し、`.example`を直接は読まない。
- agmsg 1.1.7は既存非agmsg hook groupを意味的に保持し、SessionStart / SessionEnd / Stopのagmsg-owned groupだけをstrip / addする。外部契約が変わった場合はlive acceptanceを再実測する。
- `packages/setup`は`dist/codex/`のproject-root fileを汎用copyするため、Codex専用setup分岐なしでdot-gitignoreを配布できる。
- opt-in live acceptanceに必要なセッション再起動はP4に従い人間が実行する。エージェントは他セッションの起動・再起動を操作しない。

## スコープ外

- external agmsgへのstatic dispatcher / sidecar protocol追加、agmsg release、legacy fallbackの実装。
- JSON pretty-printだけでtracked diffを隠す対症療法。
- Codex退役、monitor無効化、bridge機能削除。
- `.codex/agmsg-delivery-mode`の再修正。
- 一般化されたhook configuration framework、他harnessのactive config所有変更、`packages/setup`の専用migration engine。
- 既存active fileへのcanonical更新の自動merge / overwrite。doctorはcanonical組の意味的欠落をFAILとして列挙し、利用者による退避済みmanual mergeを案内する。

## Open questions

要件上の未決事項は0件。共有activation helperの配置、live testのtrigger名、fixture seamの最小形は、上記ACを変更しないCode Generation上の実装詳細とする。実コードがこの境界で既存契約との矛盾を示した場合は、実装前に停止して選挙へ戻す。

## トレーサビリティ

| 要件 | 由来 |
| --- | --- |
| FR-1 | Issue #770再発コメントのtracked clean / hooks保持 / restart条件、E-770-RA Q1=A、e4 GoA 2留保、`architecture.md`所有境界 |
| FR-2 | E-770-RA Q2=A、project正本・dist・self同期規範、`business-overview.md`multi-harness価値 |
| FR-3 | `code-structure.md`のagmsg reader / writer / restart台帳、Issue #770実測、E-770-RA Q1根拠 |
| FR-4 | org bugfix regression契約、project user-visible配布test契約、team落ちる実証 / external seam実測規範、E-OC1承認済みtest戦略 |
| NFR / 制約 | project Bun-only / generated-dist規範、team P2 / P4 / P5、[PR #783](https://github.com/amadeus-dlc/amadeus/pull/783)の解決境界 |

## Review

**Verdict:** READY
**Reviewer:** amadeus-product-lead-agent
**Date:** 2026-07-18T01:22:08Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 0 | — | 全体 | ブロッキングfinding、新規findingともに0件。 | — |

### Summary

Iteration 1の3件は、self repository向けの退避・fast-forward・復元契約とfixture（AC-1e / AC-4f）、canonical adapter tupleのmultiset一致によるstale active検出（AC-1d / AC-4a）、留保転記先の正確な列挙により全て解消した。packaged consumer向けmigrationはAC-2e / AC-4gへ分離され、repository全域検索由来の文書面、実monitor起動・人間による再起動・一意pingのpush配送と返信が未成立なら完了不可というlive acceptanceまで測定可能に固定されているため、追加判断なしでengineeringを開始できる。
