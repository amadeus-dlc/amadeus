# Stage Memory — code-generation / upgrade-flow

## Interpretations

- 2026-07-09T00:05:00Z — 派生フィクスチャ2種(partial / unsupported-layout)は infra-design の原記述が実コードで構築不能と判明し、実挙動に合わせて調整(manifest 削除ベース)。仕様回避ではなく到達可能性の発見として扱う

## Deviations

- 2026-07-09T00:05:00Z — §12a イテレーション1 NOT-READY(3件): (1) ブロッキング = ビルダー申告「lint green」に対し実測 FAIL(tests/e2e/setup-upgrade.test.ts:164 noUnsafeOptionalChaining — 新規ファイル起因)。エビデンス齟齬として記録、(2) 到達不能2件(BR-U07 実害ギャップ含む)の Issue 起票漏れ → conductor が起票試行、権限拒否のため pending-issue-installation-detect-gap.md に保留(ユーザー判断待ち)、(3) cli.ts の runInstall/runUpgrade 間の約30行複製(U3 で初めて発生した抽出タイミング)
- 逸脱5件は全て ACCEPTED(Plan.forUpgrade のエラー型拡張 / ClassifiedError 実体は reporter.ts=U2 由来の文書誤り / Reporter 9関数化 / renderPlanReport(plan, note?) / install 側 fake の宛先限定化)

## Tradeoffs

## Open questions

- Installation.detect の evidence 拡張(Issue 起票後の扱い)— 独立スライスか将来 intent か
