# Security Design: solo-gate-transaction

## Inputs and Authorization Separation

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を入力とする。gate requirement、authorization source、transaction targetを別のtyped valueとして扱う。

## Input Classification

lock取得前に次のexclusive unionへ分類する。

- normal human/team: user input、grant pairなし、targetなし。
- grant-backed solo: user inputなし、valid Grant Id＋Route Id pair。
- targeted human continuation: user input、grant pairなし、valid target intent UUID＋minted reservation。
- invalid: partial pair、human＋pair、target＋pair、targetだけ、unknown mode/field。

invalidはstate spawnまたはmutation前にprotocol errorとする。normal human/teamへ新しいfieldやworkspace lockを適用しない。

## Target and Presence Validation

target UUIDv7をcurrent-space `intents.json`のexactly-one `in-flight` rowへ解決し、path inputを受けない。reservationはversion、Reservation Id、session digest、space、target UUID、stage、Route Id、state、timestampをexact parseする。

trusted UserPromptSubmitだけがmachine-injection分類後にarmed reservationを扱う。owner auditでPresence Reservation Idをexact lookupし、0件なら`HUMAN_TURN`をappend、1件なら既存座標を再利用、複数ならfail-closedにする。targeted approvalはminted座標の実在、freshness、stage/open gateを検証し、target/reservation自体を認可証拠にしない。

trusted hookはhost envelopeのsession IDから、そのsessionで唯一のarmed markerを選んでmintする。次turnのdirective/reportはopaque `presence_reservation_id`を明示的に運び、stateはReservation Id＋target UUID＋stage＋owner `HUMAN_TURN`座標をexact matchする。Reservation Idは認可値ではなくlookup keyであり、target UUIDやsession IDから別reservationを列挙・選択するAPIを持たない。user flag、PID、共有current-session marker、active cursorをsession identityに使わない。stable native identityを提供できないadapterはmintをfail-closedにする。

## Wire Security

grant state resultはexit 0、stderr空、stdout単一JSON、exact keysをすべて満たす場合だけdecodeする。stderr text search、multiple JSON、unknown kind/key、partial outputを認可へ使用しない。

## Verification

U2-SEC-01–08をcarrier matrix、mode isolation、wire corpus、cursor switch、UUID attack、session replay/machine injection fixtureへ対応付ける。
