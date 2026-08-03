# Scalability Design — interaction-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Stage-scoped Index

`InteractionIndex`はcanonical auditから再構築可能なdurable projectionであり、process-local Mapだけを正としない。schemaは`{schemaVersion, auditCursor, entries:{semanticKey:{interactionId, stageInstanceId, kind, revision}}, checksum}`、保存先はactive intent record内のgitignored `.amadeus-interaction-index.json`とする。review counter keyはstage instance固定、artifactSetIdはiteration evidenceだけに保持する。

mutationはcanonical auditと同じmkdir lockを使い、(1) auditへresolve-or-create eventをappendしてfsync、(2) projectionをtemp fileへ書いてfsync、(3) atomic rename、(4) lock解放の順に行う。audit append後にcrashした場合はprojectionの`auditCursor`が遅れるため、次processが不足eventだけを適用する。checksum不正、cursor先行、schema不明時はprojectionを破棄し、canonical auditを先頭から走査して再構築する。projectionはcacheであり、破損してもauditを変更しない。

process startup時の再構築はO(E)、有効projectionの差分適用はO(ΔE)、起動後のsemantic key lookupはO(1)とする。NFR RequirementsのO(1)はhot-path lookupへ適用し、短命CLIの初回rebuildを隠さない。再描画／resumeでは既存entryを返しrecordを増やさない。

## Bounded Growth

primaryはDepth hard cap、follow-upは1 batch、reviewは2で閉じる。artifact A→B→Cを跨ぐcap境界testと7 harness同一policy digestをblockingにする。

projection entry数はcanonical interaction数以下、temp fileは同時に1件、rebuild失敗時はreserve／dispatchをfail-closedにする。10万eventのrebuild時間と起動後lookup回数を計測し、projection無効化→再構築→同一ID復元をblocking testにする。
