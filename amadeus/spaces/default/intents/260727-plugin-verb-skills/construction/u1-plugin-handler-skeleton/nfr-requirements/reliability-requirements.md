# Reliability Requirements — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): business-logic-model.md(エラーハンドリング節)、business-rules.md(BR-U1-1/BR-U1-4)、requirements.md(FR-2c/2d)、technology-stack.md

## RL-U1-1: 失敗の透過(fail-loud)

spawn 失敗・plugin CLI の failure/usage-error はすべて exit code と stderr で呼出し元へ透過する(technology-stack.md の Bun spawnSync 前提で子プロセスの exit code がそのまま得られる)(business-logic-model.md エラーハンドリング節)。utility 側での握りつぶし・リトライ・フォールバック分岐を作らない(要求されない互換レイヤー禁止 — org.md Forbidden、requirements.md FR-2c)。

## RL-U1-2: 検証

exit 0/1/2 の3系透過を unit(fake spawn)でピンし、実 spawn 縦断1本を integration に置く(business-rules.md BR-U1-4)。
