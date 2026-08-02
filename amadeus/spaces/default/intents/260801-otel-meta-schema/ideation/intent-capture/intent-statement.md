# Intent Statement — OTel telemetry メタ情報スキーマ v1 実装

## 何を作るか

Issue **#1868** で確定済みの telemetry メタ情報スキーマ v1(6面構成)を実装する。スキーマ正本は #1868 本文であり、本 intent は語彙の再設計をしない(実装で仕様ギャップが見つかった場合のみ #1868 改訂を経る)。

1. **§1 Resource 12属性**: service.version / deployment.environment / host.name / clone_id / harness / harness.version / gen_ai.request.model / operating_mode / agent.role / session.id / vcs.ref.head.* — ハーネス依存値(harness / model / session)は **harness overlay からの注入 seam**(core に焼かない)
2. **§2 Span attributes**: amadeus.intent.id / space / stage / phase / bolt / unit の直載り化
3. **§4 Exception イベント**: exception.type / exception.stacktrace の optional 追加+**stacktrace の redaction**(リポジトリ相対化、repo 外は `<home>` マスク)
4. **§5 Subagent 観測**: `amadeus.subagent.started` イベント新設+lifetime スパン `subagent:<type>`+span attributes(agent.type / agent.id)
5. **§6 Metrics 5計器**: gen_ai.client.token.usage(ハーネス供給・fail-open)/ stage.duration / gate.iterations / operation.failures / subagent.duration
6. **スキーマ文書**: `docs/reference/` へ telemetry スキーマ章を #1868 から起こす(en、対訳規約に従う)

## なぜ(価値)

- **バグ改修の一次証拠**: stacktrace 保全・vcs 断面・session 切り分け(2026-08-01 ユーザー裁定の動機)
- **team mode 分析**: どのハーネス/モデル/ロールの操作かを trace 単体で判別
- **コスト可視化**: トークン量(GenAI semconv 準拠で Grafana 等がそのまま読む)
- **subagent 運用**: started↔completed 突合で「起動したが完了報告なし」を機械検知(2026-07-31 の builder idle 実例が動機)

## 事前裁定(すべて確定済み — 質問対象外)

- スキーマ全語彙・配置・設計原則5つ: #1868 v1 完成宣言(2026-08-01 ユーザー裁定、当日の対話で逐次承認)
- 標準語彙優先(gen_ai.* / session.id / vcs.*)・fail-open・cardinality 統制・二層 redaction 適用・registry 統制: 同上
- 分類不変条件: exception イベントは telemetry 固定(FR-EVT-7 drift guard 維持)、log 面(§3)は無改変

## 制約

- ハーネス中立境界の維持(core/harness 分離、org/project Mandate)
- event-registry-drift guard の全数管理に従う(イベント・属性追加は registry 経由)
- 既存の blocking gate 集合(TDD 既定・patch coverage・complexity・dist drift)を全適用

## スコープ外

- Relay の実 collector 疎通検証(observability 運用面)
- #1856(fatal latch 消費)/ #1857(tracer 二重登録)— 別 Issue の独立修正
- ダッシュボード/amadeus-server(将来 intent)
