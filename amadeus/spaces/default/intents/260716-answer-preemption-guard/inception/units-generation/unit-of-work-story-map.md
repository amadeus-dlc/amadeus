# Unit of Work Story Map — answer-preemption-guard

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-5)、`../application-design/component-methods.md`、`../application-design/services.md`(二層防衛)、`../application-design/component-dependency.md`(依存グラフ・非交差)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)。

## ストーリー対応

| ペルソナ | ストーリー | Unit 内の対応 |
|---------|-----------|--------------|
| conductor | questions に先取り記入をした瞬間に loud に知りたい | C-1/C-2/C-4(Write 時 sensor 発火)|
| conductor | 手動 fire でゲート報告前に全成果物を検査したい | C-1 の skipped 表現(ADR-4 — 非 questions は pass+理由)|
| reviewer | 先取り記入なしを機械保証として信頼したい | C-5(落ちる実証両側)+ gate-start 既存層との対称性 |
| エンジン保守者 | cutoff の変更を1箇所で済ませたい | C-3(canonical 化)|

## トレース補足

全ストーリーは requirements FR-1〜5 と decisions ADR-1〜5 へ帰着 — 独立テスト可能(C-5 が各ストーリーの受け入れを固定)。
