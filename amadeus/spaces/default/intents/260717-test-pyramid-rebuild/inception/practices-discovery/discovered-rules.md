# Discovered Rules(260717-test-pyramid-rebuild、#684)

上流入力(consumes 全数): codekb `code-structure.md`・`technology-stack.md`・`dependencies.md`・`code-quality-assessment.md`・`architecture.md`・`business-overview.md`(同日 RE で現況化済みの6点を証跡スキャンとして代用 — practices-discovery:c1)

## 新規発見ルール

**0件** — evidence.md の差分ギャップ分析どおり、affirmed 済み team.md / project.md に新たに昇格すべきプラクティスは発見されなかった(決定的スイープ論は §13 で回収済み)。

## 本 intent へ適用される既存ルール(確認のみ)

| 領域 | 適用ルール(既存) |
|---|---|
| 分類・比率の導出 | 検証劇場禁止(計測から導出、ハードコード不可) |
| サブエージェント判断 | subagent-utilization+E-TPR-RE C1(決定的関数は直接全数適用) |
| 移設スコープ | 実移設は Out（別 intent）— 単一 Bolt 非押込み |
| グリーン維持 | 既存スイート非退行(Testing Posture) |
| units 分割 | 大型の units-generation 分割(inception ガードレール規模正当化) |
