# Scalability Design — mirror-distribution-docs

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Registry Capacity

Projection Registryは6 surface、各surfaceのtool／skill／wrapper／registration artifact、2 logical payload、4 self-install stance、literal paths、parity、golden owner、scan policyを所有する。さらにdocs 4 filesのlocale、kind、source、topic／marker policy、scan policyを同じschemaで所有する。topicは最大32。公開projectionは重複copyも各fileとして64 MiBへ集計する。

## Growth

surface追加はID、artifact kind、dist path、self-install stance/path、parity、golden owner、scan policyを同一変更にする。docs追加はlocale、kind、source、topic／marker policy、scan policyを同じRegistry変更にする。payload／wrapper／docs listをconsumer別に複製せず、package／promote／scanner／validatorsが同じentry集合を読む。

## Concurrency

parallel writerを作らず、generate／recoverはexclusive lock、check／validationはTransaction Coordinatorのshared read sessionを使う。Registry管理fileだけを固定順commitする。reader数はrecord数として線形に管理し、5秒の取得timeoutで無制限待機を防ぐ。

## Verification

6 surface全artifact＋4 self-install＋4 docs matrix、surface順序変更、2 MiB＋1／64 MiB＋1、32 topic＋unknown、reader増加、consumer別duplicate registryを検証する。
