# Code Generation Plan — u3-boundary-guard

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD G1〜G3・BR-U3-1〜4 準拠)

1. **G1**: 検査対象4面(plugins/ 正本+dist/plugins/ 8 変種+.claude/plugins/+.claude/.amadeus-plugin-src/)の全ファイル走査。t258 の SCAN_ROOTS に依存しない独立検査。
2. **G2**: `scripts/` 参照の出現単位判定(行単位除外なし)。許容リスト機構は空で開始、散文・コメントも違反対象(fail-closed)。
3. **G3**: 違反 0 → exit 0 / 違反 → `<file>:<line>` 列挙で赤。
4. **TDD**(BR-U3-1): fixture 注入 Red → 最小実装 → Green+corpus sweep 両側実測。実配布物への一時注入はしない(BR-U3-4)。
5. **BR-U3-2**: t258 無変更(dead entry の除去は u1 からの引き継ぎ事項として許可)。
