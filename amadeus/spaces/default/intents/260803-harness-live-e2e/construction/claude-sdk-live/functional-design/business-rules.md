# Business Rules — claude-sdk-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Capability

- BR-G01: opt-inは`AMADEUS_CLAUDE_SDK_LIVE`の`"1"`だけ。
- BR-G02: GHA denyはSDK import後のnetwork/auth probeより前に終端する。
- BR-G03: SDK version、structured result、AbortSignal、project settings、authの実測なしにsupportedを主張しない。
- BR-G04: supported/unsupportedを同一runで曖昧に混在させない。

## SDK Isolation

- BR-I01: explicit cwd、project-only settings、allow-listed envだけをSDK optionsへ渡す。
- BR-I02: user/local settings、hooks、ambient env spread、source auth/config pathを禁止する。
- BR-I03: credential bindingはshort-livedで、partial result/exception/debug保持でも破棄する。
- BR-I04: SDK eventのraw secret-bearing fieldをreceipt/evidenceへserializeしない。

## Result and Abort

- BR-R01: tool/state/audit/final resultの構造化eventだけをanchorにする。
- BR-R02: proseやpartial result単独をsuccessにしない。
- BR-R03: timeoutはabort要求、driver終端、cleanup後に返す。
- BR-R04: cleanup/leak/ledger failureはsuccess/timeout/assertionより優先する。
- BR-R05: retry既定0、load transient実証時だけ最大1。
- BR-R06: SDKはchild workerだけが所有し、90秒deadline→abort→10秒grace→SIGTERM 5秒→SIGKILL 5秒→reapの有界手順に従う。
- BR-R07: abort generation close後のeventをresultへ採用せず、child reap前にcredential/scratch cleanupを開始しない。
- BR-R08: `echo ok` journeyはexactly-one terminal success、positive turns、permission denial 0、nonempty output evidenceを要し、duplicate/late terminalを拒否する。

## Closure

- BR-C01: supportedはfake contractとminimal live green receiptの両方を要する。
- BR-C02: unsupportedは実測結果、阻害要因、推奨seam、独立AC、Issue linkをすべて要する。
- BR-C03: silent skip、dormant adapter、TBD matrixは完了ではない。
- BR-C04: Claude family seamはsettings/env/result共通部だけを持ち、SDK event/abortモデルをprint/TUIへ漏らさない。
