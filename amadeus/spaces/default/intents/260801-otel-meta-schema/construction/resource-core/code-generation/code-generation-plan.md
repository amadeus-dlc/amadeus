# Code Generation Plan — U1 resource-core(Bolt 1 / walking skeleton)

上流入力(consumes 全数): functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design 5成果物、requirements.md FR-RES-1〜4 — 実装契約は FD の解決フロー・二層 redaction・閉集合14属性から、検証形は nfr-design(counter assert・落ちる実証・per-key fail-open)から導出した。

## 実行形態

- gated swarm batch 1(単独 Bolt・walking skeleton)。driver = subagent(resolve 実測)。worktree `bolt-resource-core`(base = origin/main 7aa22526e)
- TDD 必須(vertical slice 反復)。PR 1本(スカッシュ)。NFR-4: package.ts+promote:self 同一変更

## スライス計画(実施済み実績の記録)

1. buildResource 中立8属性(fail-open per-key)
2. vcs 2属性(git rev-parse subprocess 1回・失敗両省略)
3. currentResource memo+supplier 合成(※Red 欠落を申告 — 落ちる実証3・4で事後カバー)
4. supplier 閉集合4キー・二重設定/閉集合外 throw
5. 3シグナル配線(tracer literal 置換・log/metric exporter 書込境界)
6. 二層 redaction(write-time = RESOURCE_REDACTION_POLICY / export 境界 = redactRecord resource 面)+ SessionStart hook session.id supply

## 裁定

- 設計逸脱2件は E-OMSB1-DEV(2-0、両票 GoA 2)で承認。留保 = U5 受け入れ項目へ (a) 実 hook spawn 後のストア行 session.id 実測 (b) hook supply 行の落ちる実証、を引き継ぎ(CG diary 記録済み)
