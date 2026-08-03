# Scalability Design — intent-autonomy-runtime

## 入力とpartition

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。新しい中央authorization serviceを設けず、Intent auditをgrant正本にする。

mode、grant、decision、park / resumeはIntent UUIDでpartitionする。interaction occurrenceはIntent、stage / phase / Bolt、gate / question ID、graph revisionへ属し、別Intentのprojectionやhuman provenanceを参照しない。

## Independent Intent execution

各Intentはcurrent mode / grant / workflow stateを独立再生できる。team child Intentはexplicit UUIDを持つ別partitionであり、parent / siblingのgrant、policy、park reasonを共有しない。

per-clone audit eventはcanonical identityで畳み込み、同じprojection revisionから矛盾するmode / grant successorがある場合は物理順で勝者を選ばず`CONFLICT`へ閉じる。global mutable grant tableやcross-clone sequence allocatorを置かない。

## Policyとregistry growth

policyはscope / selectorのcompiled index、effectはrevisioned registryで解決する。将来option typeやharnessが増えても、unknownをdefault allowせずregistry contributionとfixture追加を要求する。

Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じM04 / M05 Coreを使う。native adapterはcapability facts、election、recommendation invocationだけを提供し、mode表、grant scope、decision chainをforkしない。将来harness追加はregistry rowとadapter / fixtureで閉じる。

## Capacity behaviorと検証

suspended Intentのsame condition起動は外部decisionを呼ばない。多数Intentが並行しても、対象Intent partitionだけをload / commitする。複数Intent / clone / child Intent / registry revision / harness cohortのfixtureでprojection isolation、deterministic conflict、Core分岐不増加を検査する。

