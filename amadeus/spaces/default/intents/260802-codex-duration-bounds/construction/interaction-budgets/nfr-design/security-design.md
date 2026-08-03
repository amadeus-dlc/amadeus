# Security Design — interaction-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Answer Fingerprint

`AnswerFingerprintPort`はHMAC-SHA-256を用い、domain、intent UUID、interaction ID、UTF-8 bytesを入力にする。文字列はUnicode NFC、CRLF/CRをLFへ統一し、末尾改行1個を除去する。tagは同一interaction内だけで比較しtelemetryへ出さない。

## Key Availability

`InteractionKeyVault`はcanonical repository rootのgitignored `amadeus/.amadeus-sessions/interaction-hmac/<intentUuid>.key`に32-byte keyを保存する。canonical repository rootは`git rev-parse --path-format=absolute --git-common-dir`の実体パスから導出する。通常repo／linked worktreeのいずれもcommon dirの親をrootとし、bare repoまたはrootを一意に解決できない環境は`key-root-unavailable`で停止する。したがって、全worktree processは同じkey pathを得る。

初期生成は同じdirectoryの`<intentUuid>.lock`をmkdir lockとして取得し、`O_CREAT|O_EXCL`、32-byte CSPRNG、fsync、mode `0600`の順で行う。競合したprocessは勝者の作成完了後にkeyを再読込する。既存keyはregular file、owner-only mode、長さ32 bytesを検証し、違反時は上書きせず`key-invalid`へ閉じる。key読取後にlockを解放し、HMAC計算時にpathやkey materialをlogへ渡さない。

retention ownerは`InteractionKeyVault`だけとする。通常のsession cleanupは`interaction-hmac/`を除外し、active／parked／failed intentのkeyを削除しない。intent terminalかつfingerprint replayが不要と確認された後の明示的`deleteIntentKey(intentUuid)`だけが削除できる。machine移行／clone移行／key lossは非対応capabilityとして既存interactionを`unavailable`へ閉じ、人間再確認と新stage revisionを要求する。暗黙再生成は禁止する。

blocking testは、2 process同時初期化、2 linked worktreeからの同一tag、mode／length破損、通常cleanup後resume、key loss、NFCとNFD、CRLF／CR／LF、末尾改行有無を含む。
