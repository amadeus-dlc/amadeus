# Functional Design Questions — kimi-print-live-e2e

## Confirmed context

上流入力は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) である。

- Kimi printはPhase 2の必須接続対象であり、qualified follow-upへ分岐しない。
- 一時project、一時`KIMI_CODE_HOME`、コピーしない短命credential binding、allowlisted child environment、`kimi -p`、bounded anchorを同じUnitで閉じる。
- exact opt-in `AMADEUS_KIMI_PRINT_LIVE=1`とGitHub Actions hard denyはscratch、binding、spawnより前に判定する。
- PASSはchild reap、binding除去、一時directory除去を含むcleanup barrier成功後だけ記録する。
- 数値timeoutは既存契約または実測から固定し、本Functional Designでは推定値を受け入れ基準にしない。

## Questions and answers

新規質問はない。retryと実行・cleanup二重失敗の契約は、同じIntentのKiro TUI Functional Designで承認済みの共通lifecycle判断を適用する。

- retryableはanchor確立前かつspawn未成立のOS `EAGAIN`だけとし、内部reasonを`kimi-startup-capacity`へ正規化する。
- retryは最大1回とし、前attemptの全resourceをcleanupしてから新しいattempt identityで再準備する。
- cleanup失敗時は外側Resultを常にruntime正規値`cleanup-barrier-failed`とし、元execution outcomeはerror payload内だけに保持してledgerへappendしない。
- live journeyはpreflight後・scratch前にrun-wide FIFO leaseを取得し、retry、cleanup、ledger処理を通じて保持し、全終了経路の`finally`で解放する。

## Question boundary

Kimiの対象範囲、必須接続、認証隔離、live opt-in、共通contract、retry方針はIssue #1717と承認済み成果物から確定しているため再質問しない。
