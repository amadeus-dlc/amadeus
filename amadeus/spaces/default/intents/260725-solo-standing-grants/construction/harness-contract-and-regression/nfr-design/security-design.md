# Security Design: harness-contract-and-regression

## Inputs and Trust Boundary

U3のNFR RequirementsとFunctional Designを入力とする。現行trusted UserPromptSubmit境界を維持する。

## Controls

- targetはcurrent-space `intents.json`のexactly-one in-flight UUIDv7だけを受理する。
- Reservation Idはdirective/reportで明示的に運ぶ相関値であり、認可値にしない。
- hookはhost session IDでarmed markerを選び、stateは明示Reservation Idとowner `HUMAN_TURN`座標をexact matchする。
- general audit CLIにpresence mint APIを追加しない。
- session identity欠落時は共有key、PID、active cursorへfallbackせずmutation 0。

## Harness Capability

Claude、Codex、Cursor、Kiro CLIは既存session fieldをadapterで正規化する。Kiro IDEとOpenCodeはstable native adapter完成をblocking prerequisiteとする。

## Verification

malformed carrier、別session、machine injection、別space/complete target、Reservation Id tamperでowner/non-owner mutation 0を全harnessで確認する。
