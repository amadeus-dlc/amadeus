# Deployment Pipeline Memory

## Interpretations

- 2026-07-12T13:56:00Z — deploymentをmainへのappend-only snapshot commitとして扱った; upstream deployment architectureにクラウド環境新設なしと明記される。

## Deviations

- 2026-07-12T13:56:00Z — blue/green/canary/feature flagsを生成しない; trafficを持つruntime serviceが存在しないため。

## Tradeoffs

- 2026-07-12T13:56:00Z — 誤snapshotは履歴rewriteでなく通常PR経路のgit revertで戻す; auditabilityと既存PR merge controlsを維持するため。collector/schema defect時は修正とrevertを同一PRにする。

## Open questions

- 2026-07-12T13:56:00Z — landing後のmain実run、bot author、queue挙動を実GitHub Actionsで観測する。
