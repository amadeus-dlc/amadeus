# Business Rules — U3 ci-slim

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

前提: 本 BR 群は unit-of-work.md U3 の充足 FR(requirements.md FR-3/AC-3)と unit-of-work-story-map.md ジャーニー3(検証所在の機械照合)から導出。削除対象・不変対象の正本は components.md C-4 / component-methods.md C-4。

## ルール一覧

- BR-U3-1: 削除は3 job(distribution-benchmark / aggregate / release-gate)のみ。他の job・step・needs に触れない(FR-3a/3b/3c)
- BR-U3-2: `ci-success` の needs 集合(8項)は byte-identical(AC-3。services.md の blocking 区分不変)
- BR-U3-3: マージ前に U2 の perf.yml が main に着地済みであることを実測確認(unit-of-work.md の依存 — 検証無音喪失窓の防止)
- BR-U3-4: PR 本文に FR-3d 対照表(decisions.md V-1〜V-8)との写像を記載(ジャーニー3 の機械照合)
- BR-U3-5: `distribution-contract` job とその ci-success needs 掲載は不変(V-6 — contract 検証の blocking 継続)

## 落ちる実証

- AC-3 grep が削除前の ci.yml に対して非 0(現状 hit あり)→ 削除後 0 の対照で述語の有効性を実証(注入不要 — 現状が正の対照)
