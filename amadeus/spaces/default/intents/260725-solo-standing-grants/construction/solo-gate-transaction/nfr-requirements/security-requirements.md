# Security Requirements: solo-gate-transaction

## Inputs and Threat Boundary

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とする。directive JSON、report flags、operating mode、state subprocess stdout/stderr、active-intent cursorをtrust boundaryとする。

## Authorization Controls

| ID | Threat | Required control | Pass condition |
|---|---|---|---|
| U2-SEC-01 | partial/malformed carrier | all-or-none + exact format validation | state invocation 0、mutation 0 |
| U2-SEC-02 | human inputとcarrier混在 | ambiguous authorityをprotocol error | approval audit 0 |
| U2-SEC-03 | team/invalid modeへのcarrier注入 | solo branchへもteam branchへもfail-openしない | leader/delegation invocation 0、mutation 0 |
| U2-SEC-04 | stdout/stderr protocol confusion | exit/status/stderr bytes/単一JSON exact shapeで判定 | malformed matrixのapproval 0 |
| U2-SEC-05 | active cursor substitution | workspace outer lockでreceipt ownerへpinし非ownerを操作しない | 非owner state/audit byte delta 0 |
| U2-SEC-06 | Grant Id substitution | receipt、carrier、lock内verified IDをexact match | `GATE_APPROVED` 0 |
| U2-SEC-07 | fallback target substitution/path injection | opaque UUIDv7をreceipt ownerから生成し、current-space registry exactly-one/in-flightへ解決、human reportでverbatim forwarding | path/alias/別space/未登録/complete targetのmutation 0 |
| U2-SEC-08 | human presenceのcross-session流用 | host session keyed reservationを実prompt hookだけがarmed→mintedへ更新し、owner audit座標をstateが検証 | machine injection/別session/marker改変のapproval 0 |

## Wire Validation Matrix

exit 0かつstderr空のときだけstdoutを単一JSONとしてparseする。`approved`と`await-approval`は既定key以外を拒否する。stderrが1 byteでもあれば内容を解釈せずprotocol errorとし、nonzero exitは既存fatal errorとする。protocol errorとfatal errorはexpected fallbackへ変換しない。

## Data and Compliance

Grant Id、Route Id、opaque intent UUID、Presence Reservation Id、host session IDはworkflow authorization metadataであり、credential、PII、PHI、payment dataではない。`target_intent_id`と`presence_reservation_id`はdirectiveとgitignored session runtimeにだけ露出し、filesystem pathを含めない。Reservation Idは相関値として`HUMAN_TURN`へ記録するが認可値にしない。session IDは既存`.amadeus-sessions/`保持・権限・正規化規則を継承し、prompt bodyは保存しない。既存ログescapeを維持し、新しいsecret・token・暗号鍵を導入しない。

## Traceability and Ownership

| Target | Upstream | Transaction rules | Blocking suite |
|---|---|---|---|
| U2-SEC-01–02 | FR-08, FR-10–11, NFR-03 | TR-08–09, TR-14a–c | directive/report matrix unit |
| U2-SEC-03 | FR-19, NFR-03, NFR-05 | TR-02, TR-21 | mode isolation integration |
| U2-SEC-04 | FR-15, NFR-04 | TR-10–13 | strict wire unit |
| U2-SEC-05 | FR-02, FR-12–17, NFR-03 | TR-22–23 | cross-intent integration |
| U2-SEC-06 | FR-12–14, NFR-03 | TR-15–19 | substitution integration |
| U2-SEC-07 | FR-15–18, NFR-03 | TR-11, TR-14d–e, TR-25 | targeted continuation integration |
| U2-SEC-08 | FR-18, NFR-01, NFR-03 | TR-14d–f, TR-25–26 | presence reservation/hook integration |
