# Reliability Design — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): reliability-requirements.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

RL-U1-1/RL-U1-2(reliability-requirements.md)の実現: PluginDelegateDeps.spawn の戻り exitCode を無加工で process.exit へ(business-logic-model.md エラーハンドリング節)。spawn 例外(bun 不在等)は非0 exit で伝播。リトライ・フォールバックなし(security-requirements.md SR-U1-1 系と同根の無音経路禁止)。

## 検証設計

unit(fake spawn で 0/1/2 の3系)+integration(実 spawn 縦断1本)— tech-stack-decisions.md TS-U1-2 の seam 位置と reliability-requirements.md RL-U1-2 の層配置に従う。performance-requirements.md PR-U1-1・scalability-requirements.md SC-U1-1 への追加負荷なし(テストは既存ランナー内)。
