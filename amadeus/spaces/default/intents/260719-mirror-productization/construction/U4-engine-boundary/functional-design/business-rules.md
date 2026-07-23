# Business Rules — U4-engine-boundary(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## BR-U4-1: 発火は phase-check 対象3境界のみ(E-MPRRA1 裁定 A)

ideation/inception/construction の各完了時。境界集合は PHASE_CHECK_REQUIRED_PHASES の canonical 参照(重複定義禁止)。operation 完了(workflow complete)では発火しない([e6] 保存視点は将来判断)。

## BR-U4-2: 分岐規則(FR-5/FR-6、4象限)

| auto-mirror | ミラー | 決定 |
|---|---|---|
| off/未設定 | 任意 | ask(未作成なら create 選択肢込み) |
| on | 作成済み | sync 実行の print(run-then-continue) |
| on | 未作成 | ask へ降格(create 選択肢込み — E-MPRRA2 裁定 A) |

## BR-U4-3: config invalid は loud(U3 の fail-closed を握りつぶさない)

U3 resolve が invalid のとき、無音 skip・default 降格をせず、invalid 層と errors を stderr へ出しエラー終了(fail-open 禁止 — 検証劇場 Forbidden の予防)。

## BR-U4-4: 出力契約の維持(C-08)

ask/print の directive JSON は stdout。ミラー関連の注記は stderr(advisory)。実装前に next 出力の既存消費者(tests/ツール)を repo grep で棚卸し(stderr-addition-consumer-grep)。

## BR-U4-5: 冪等(同一境界での再 ask 抑止)

同一 phase 境界で既に ask へ回答済み(または auto-sync 実行済み)の場合、next の再実行で再発火しない — 発火済み判定は監査イベント(または state の決定的フィールド)から導出し、推測しない。具体機構は実装時に既存の gate/checkbox 冪等機構へ揃える(新規の状態面を作る場合は最小1フィールド)。
