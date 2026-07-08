# Monitoring Design — setup-foundation

> ステージ: infrastructure-design (3.4) / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(可観測性節)、scope(observability-setup は SKIP)

## 適用外の宣言(根拠付き)

常駐システムを持たないローカル CLI であり、メトリクス収集・アラート基盤は対象外(composed スコープで observability-setup を SKIP した根拠と同一)。CLI 相当の可観測性(stderr の分類出力+終了コード)は nfr-requirements の可観測性節で確定済み — 追加のモニタリング設計はない。
