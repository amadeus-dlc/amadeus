# Code Summary — reject-presence-guard (#675)

## 実装

`handleApprove` の3段 human-presence ガード(isAutonomousMode → humanPresenceGuardDisabled → humanActedSinceGate)を共通ヘルパー `assertHumanPresentForGateResolution` として `amadeus-state.ts` 内に抽出し、`handleApprove` / `handleReject` の両方から呼ぶよう配線(AC-675-1〜3、選挙 Q2=A)。reject では validateSlugInState 後・Revision Count mutation 前。#671 委任行が両 verb で同一判定を通ることは既存 t112 で確認(変更不要)。delegate-rejection は #685 としてスコープ外。

## 変更ファイル

- `packages/framework/core/tools/amadeus-state.ts`(ヘルパー抽出+reject 配線)
- dist 4ツリー+self-install 同期(同一コミット — CR-2)
- `tests/unit/t188-human-presence-gate.test.ts`(fixture A/B+autonomy carve-out)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| t188(修正前) | exit 1(fabricated reject が rc=0 で通過 — 落ちる実証) |
| t188(修正後) | exit 0(14 pass。拒否時は Refusing to reject+GATE_REJECTED 0件+状態不変) |
| typecheck / lint | 0(typecheck は他エージェント混入ファイルを分離して確認) |
| dist:check / promote:self:check | amadeus-state.ts は全ハーネス同期済み(検出差分は無関係な並行 Bolt の amadeus-bolt.ts のみ) |
| tests/run-tests.sh --ci | 2 — 失敗8件はすべて並行 Bolt の worktree 汚染(未コミット amadeus-bolt.ts の dist drift)由来で本修正と無関係。PR CI(クリーン環境)での再確認をレビュー条件とする |

## PR

https://github.com/amadeus-dlc/amadeus/pull/692(Fixes #675)。AC-675-1〜5 充足(AC-675-5 = #685 起票済み)。
