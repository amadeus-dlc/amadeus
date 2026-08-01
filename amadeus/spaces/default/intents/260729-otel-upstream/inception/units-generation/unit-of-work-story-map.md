# Unit of Work — Story Map

上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`（参照済み）

user-stories ステージは本 scope では SKIP のため stories.md は存在しない。代わりに要件（`requirements.md` の FR/NFR/VER）→ Unit の写像をカバレッジ検証として示す。

## 要件 → Unit 写像

| 要件 | Unit |
|---|---|
| FR-EXP-1, FR-EXP-6, FR-EVT-2（emit 経路）, FR-EVT-3/4/5/6, FR-TRC-2/3, FR-DST-1, FR-DST-2（manifest マッピング）, NFR-1/2/3, VER-3 | U1 otel-walking-skeleton |
| FR-EVT-1, FR-EVT-7, VER-1 | U2 event-registry |
| FR-JRN-1/2/5 | U3 journal-v2 |
| FR-EVT-2（dispatch 先）, FR-EXP-2/3/4/5, FR-JRN-3, FR-DST-3/4/5, VER-2 | U4 local-exporters |
| FR-TRC-4/5 | U5 context-propagation |
| FR-JRN-4 | U6 journal-reader-swap |
| FR-MIG-1/2（移行部分）, VER-4 | U7 callsite-migration |
| FR-MIG-2（削除部分）, FR-MIG-4, FR-MIG-5 | U8 legacy-writer-removal |
| FR-MLM-1, FR-EXP-5（Metrics 面） | U9 metrics-subset |
| FR-MLM-2, FR-EXP-4（Logs 面） | U10 diagnostic-logs |
| FR-RLY-1/2/3, NFR-4, VER-5 | U11 otlp-relay |
| FR-TRC-1（Span 化の対象選定）, FR-TRC-6 | U1（基盤）→ U7（本番 call site への適用） |
| FR-MIG-3（CLI 互換方針） | U7（互換 Adapter 維持）→ Phase 4 ADR で決定 |

## 横断要件

- FR-TRC-1/FR-TRC-6 は U1 が基盤（Provider・契約）を、U7 が本番適用（call site の Span 化）を担う跨ぎ要件
- VER-6（distribution tests）は全 Unit 共通の完了条件（各 Unit の完了検証に含有）

## カバレッジ検証

- **全要件が割当済み**: `requirements.md` の FR 39件・NFR 4件・VER 6件のすべてが少なくとも1つの Unit に写像されている（FR-DST-2 は U1 の manifest マッピングと VER-6 の横断検証でカバー）
- **全 Unit が要件を持つ**: 空の Unit なし
- **削除ゲート（FR-MIG-4）の検証主体**: U8 が機械検証を所有し、VER-3/4/5 の成果物を入力とする
