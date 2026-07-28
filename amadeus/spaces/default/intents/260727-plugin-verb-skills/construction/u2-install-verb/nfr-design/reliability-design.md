# Reliability Design — U2 u2-install-verb

上流入力(consumes 全数): reliability-requirements.md、performance-requirements.md、security-requirements.md、scalability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

RL-U2-1〜3(reliability-requirements.md)の実現 = business-logic-model.md の swap(α〜δ)+冪等収束表そのまま。追加の journal・lock ファイルを導入しない(単一プロセス前提 — scalability-requirements.md SC-U2-1 の N/A と整合。並行 install の相互排除は将来要求が実在してから)。

## 検証設計

BR 由来の6ケース(tech-stack-decisions.md TS-U2-2 の in-process+実 FS)で収束表の各行を1:1でピン。失敗注入は deps seam(compose 失敗 = recompile fake)で決定的に行う(security-requirements.md SR-U2-3 の loud 経路も同テストで exit/stderr を assert、performance-requirements.md への追加負荷なし)。
