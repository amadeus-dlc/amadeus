# NFR Design Questions — kiro-tui-live-e2e

## Confirmed context

入力は [business-logic-model.md](../../functional-design/business-logic-model.md) である。NFR Requirementsはactive scopeで意図的にSKIPされており、欠落成果物を再作成しない。

## Questions and answers

新規質問はない。private tmux、scratch home/project、allowlisted environment、disk/state anchor、bounded pane diagnostic、全resource cleanup、direct/follow-up分岐はFunctional Designで確定済みである。

## Question boundary

AWS、network service、database、daemonは本Unitに存在しない。Kiro IDE GUI/CDPとACPは対象外であり、TUIのsecurity evidenceから能力を推定しない。
