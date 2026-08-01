# Scope Document — otel-meta-schema

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md — Must/Won't の母集合と動機は intent-statement の6項目・スコープ外リストから導出した。

## Must(すべて #1868 v1 の契約 — Should/Could は置かない)

1. **M1 Resource 12属性**(#1868 §1)— 中立層で組める8属性+**harness overlay 注入 seam**(harness / harness.version / gen_ai.request.model / session.id)。取得不能は省略(fail-open)
2. **M2 Span attributes 直載り**(§2)— intent.id / space / stage / phase / bolt / unit
3. **M3 Exception 3属性化**(§4)— type / stacktrace 追加+**stacktrace redaction**(repo 相対化・`<home>` マスク)
4. **M4 Subagent 観測**(§5)— `amadeus.subagent.started` 新設+lifetime スパン+agent.type/id 属性
5. **M5 Metrics 5計器**(§6)— token.usage(ハーネス供給)/ stage.duration / gate.iterations / operation.failures / subagent.duration
6. **M6 スキーマ文書** — `docs/reference/` へ telemetry スキーマ章(#1868 から起こす)

## Won't(厳格除外)

- Relay 実 collector 疎通検証 / ダッシュボード / amadeus-server
- #1856(fatal latch)・#1857(tracer 二重登録)— 独立修正
- log 面(§3)の変更 — registry 現行を無改変
- ハーネス側の model/session 取得を**全ハーネスで保証すること** — 注入 seam の契約化まで(供給は取得可能なハーネスから段階導入、claude を最初の実証対象とする)

## 優先順序(dependency + risk-first)

**seam の成立が最大リスク** — harness overlay → core resource 注入の境界設計が崩れると M1/M5 が連鎖するため、walking skeleton は「claude harness から1属性(amadeus.harness)を注入し span/log/metrics の resource に現れる end-to-end」とする。以後 M1 完成 → M2(独立)→ M3(独立)→ M4 → M5 → M6。

## 規模の見通し

コード面は additive(スキーマ削除なし・後方互換 shim なし)。単一 repo、単一 intent。並行化は units 設計(M2/M3 は独立、M4/M5 は M1 seam 依存)で確保。
