# NFR Design Memory — u2-loader-generalization

## Interpretations

- 2026-08-01T22:00:00Z — scalability-design.md は独立ファイルとせず performance-design.md に畳み込んだ; scalability-requirements の実体は「構造的拡張性の拘束」(SC-U2-1〜3)で performance の構造拘束と同種のため、stage の produces_kinds(scalability-design は [service] のみ)とも整合。非サービス Unit のためサービス系カテゴリは全て N/A 段落で処理
- 2026-08-01T22:00:00Z — 検証方法列は requirements 側の「測定可能な基準」をそのまま引き、functional-design §5 のテスト計画(t403 / ピン改訂 / 統合追従 / AC1〜4)へ対応付けた

## Deviations

- なし(questions ファイルは orchestrator 未経由の単一 iteration のため作成せず、上流5成果物 + functional-design の記載内で設計が完結)

## Tradeoffs

- 2026-08-01T22:00:00Z — NFR → 機構マッピングは「新規機構を考案する」形ではなく「functional-design 規定済み機構への写像」に限定; 内部 CLI ツール Unit でサービス系 NFR パターン(キャッシュ/CB/リトライ等)を持ち込むと過剰設計になるため

## Open questions

- BR-S6 の空 models ガード要否は code-generation 冒頭の u1 parser 実測で確定(business-logic-model §6 のオープン事項をそのまま引き継ぐ)
