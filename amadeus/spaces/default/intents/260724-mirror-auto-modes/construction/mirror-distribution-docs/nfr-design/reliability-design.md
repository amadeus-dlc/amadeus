# Reliability Design — mirror-distribution-docs

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Transaction Design

generateはexclusive lock下でmanifest管理fileのold/new digest、backup／absent marker、固定順をjournalへ記録する。journalは`prepared → committing → committed → cleaned`の単調な状態機械とし、各遷移をtemporary fileへのwrite、file fsync、atomic rename、parent directory fsyncで永続化する。

1. `prepared`: 全対象のold/new digest、backup／absent marker、commit順、transaction IDを永続化する。まだ公開fileを変更しない。
2. `committing`: 最初の公開rename前に永続化する。各new fileを同じparentでfsyncしてatomic renameし、parent directoryをfsyncする。各rename後に`applied`集合をjournalへ永続化する。renameと`applied`更新の間で停止しても、actual digestをold/new digestと照合して適用状態を判定できる。
3. `committed`: 全公開fileがnew digestと一致することを確認して永続化する。この状態以降はrollbackせず、新snapshotの不足を補修してcleanupを完了する。
4. `cleaned`: backup削除とそのparent directory fsync後に永続化し、journalを削除してjournal directoryをfsyncする。

管理外file／surface root全体を置換しない。`prepared`または`committing`からの復旧はold snapshotへrollbackし、`committed`からの復旧はnew snapshotを完成させる。`cleaned`は残存journal／lockのcleanupだけを再開する。

## Lock Protocol

lock rootはatomic publishする`writer/`、`recovery/`、`readers/<token>.json`を持つ。owner record／reader recordは`schemaVersion`、kind、random token、monotonic fencing generation、host、PID、process start identity、createdAt、writer／recoveryではjournal IDを含む。

writer／recovery slotは、まず同一parentの一意なcandidate directory内に完全なowner recordを書いてfileとcandidate directoryをfsyncし、そのcandidateを固定slot名へatomic renameして公開する。固定slotが既にあれば取得失敗とする。candidateはlockではなく、active owner判定に使わない。reader recordも一意なtemporary fileをwrite／fsyncしてからtoken固有pathへatomic renameするため、不完全なactive recordを公開しない。停止で残ったcandidate／temporary fileはactive取得を妨げず、ageとowner identityを確認したmutating cleanupだけが除去する。

- shared取得はrecovery／writer不在を確認し、reader recordをatomic publishした後に両slot不在を再確認する。競合した場合は自分のreader recordを削除して再試行する。
- exclusive取得はrecovery不在を確認してwriter slotをatomic publishし、recovery不在を再確認して既存readerが0になるまで待つ。競合時は自分のtokenと一致するwriterだけを除去して再試行する。shared／exclusiveとも5秒でtyped `lock-timeout`を返し、lockなしで処理を続けない。
- stale判定は同一hostでPID不在、またはPID再利用をprocess start identity不一致で確認できる場合だけ成立する。foreign host、identity取得不能、active record破損は`lock-ambiguous`として自動回収しない。
- stale writer回収はmutating `recover`またはgenerate preflightだけが行う。まず完全なowner recordを持つrecovery candidateをatomic publishし、公開後にstale writer token／journal IDを再検証する。次にwriter slotをtoken固有quarantineへatomic renameし、recovery tokenを新しいfencing generationとしてjournalへ永続化する。この時点からrecovery slotがexclusive authorityであり、writer lockを再取得せずにrollback／forward completionを行う。全通常reader／writerはrecovery slotを取得前後に検査し、存在時は進まない。
- recovery途中で停止した場合、次のmutating recovery contenderはstale recovery identityを検証し、既存recovery slotをtoken固有quarantineへatomic renameしてから自分のcandidate publishを競う。source renameまたはcandidate publishに負けたcontenderは何も変更せず再試行する。新ownerはjournalのfencing generationと全quarantineを照合して復旧を続ける。
- recovery成功時だけjournal、writer quarantine、recovery quarantine、recovery slotを順にcleanupする。失敗時はrecovery slotとquarantineを保持するため通常処理はfenceされる。
- journalなしのstale writer／readerはmutating cleanupがtokenとidentityを再確認してquarantine後に除去する。read-only checkはstale lockを回収せず、journal／recovery slotを発見した時点で`recovery-required`、曖昧なownerでは`lock-ambiguous`を返す。

## Reader and Recovery

Transaction Coordinatorの`openReadSession(purpose)`だけがshared lockを取得し、opaque session token、immutable manifest snapshot／digest、registry内pathに限定した`readFile`、Registryが許可したpublic rootに限定した`listPublicRoot(rootId)`を返す。列挙APIはshared lockを保持したままcanonicalized literal relative path集合を返し、symlink escapeを拒否する。Digest Validator、Public Scanner、Docs Contract Validatorはこのread-session portだけへ依存し、generated file／directoryをfilesystemから直接読まない。completeness validatorは列挙集合とRegistry期待集合の差分からextra／missing fileを検出する。sessionは各read／listの前後とclose時にowner tokenを検証する。

checkはread session取得前にjournalをread-only確認し、未完journalならwriteせず`recovery-required`を返す。recover／次mutating generateだけがreclaim mutexとexclusive lock下でjournal状態に応じてrollbackまたはforward completionを行う。rollback／forward completion failureはjournal、backup、owner recordを保持してfail closedする。

## Determinism

同一source／manifestのpath集合とbytesをdouble generationで比較する。finding順をsurface→path→kindへ固定し、partial page／partial projectionをsuccessにしない。

## Verification

candidate作成／fsync／atomic publishの各境界、reader登録、recovery publish、writer quarantine、fencing更新、各journal遷移、backup後、renameと`applied`更新の間、fsync後のkill、disk full、PID再利用、foreign-host owner、concurrent contender／reader、extra file、管理外file不変、read-only checkをfailure injectionで検証する。公開途中の不完全active recordが存在しないこと、単一recovery tokenだけがjournalを更新できること、`prepared`／`committing`はold snapshot、`committed`はnew snapshotへ必ず収束することを確認する。
