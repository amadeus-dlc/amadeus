# Stakeholder Map — otel-meta-schema

## 主ステークホルダー

| 役割 | 関心 |
|---|---|
| **フレームワーク運用者(j5ik2o)** | バグ改修時の一次証拠(stacktrace / vcs 断面)、トークンコスト可視化、subagent 未完了検知。#1868 の裁定者 |
| **conductor / builder / reviewer(エージェント)** | 自らの操作が trace に正しく紐づくこと。注入 seam の設定漏れが emit を止めない(fail-open)こと |
| **ダッシュボード等の下流消費者(将来)** | 標準語彙(gen_ai.* / vcs.* / session.id)準拠により汎用ツール(Jaeger / Grafana)がそのまま読めること |

## 影響面

- **全ハーネス**: resource 注入 seam は harness overlay 側の実装。取得不能ハーネスは省略(fail-open)のため段階導入可
- **既存 telemetry 消費者**: shadow-compare(診断用)・Relay — resource/属性の追加は additive で後方互換(スキーマ削除なし)
- **redaction 境界**: stacktrace の新規機微面(ホームパス)が加わる — devsecops 観点は construction の NFR 段で検証
