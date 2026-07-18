上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# U1 NFR Design 質問判定

## 判定

追加の人間判断を要する未決事項はない。Construction の質問は例外扱いとし、既決の NFR 要件と `business-logic-model.md` から5つの設計成果物を導出する。

## 導出根拠

- `SizeLedger` の公開スキーマは変更しない。regular file または symlink として発見された `*.test.ts` raw candidate の個別 path/read failure はスイープ駆動境界の complete / incomplete、重複・母集団確定不能は fatal で可視化し、具体的な永続化形式は実装 intent に残す。
- 上流の `buildLedgerRow({ file, tier, source })` signature を維持し、classifier 1回と、その成功後の parser 1回を builder が所有する。発見時 logical path は file/tier、canonical target は containment/read のみに使い、診断 outcome は kind ごとの判別 union と正規化済み logical path に限定する。
- `business-logic-model.md` の tier 説明は、同書の引用コードと SCAL-2 が示す tests-root-relative path の第1階層として明確化する。既存 tier 意味論を変更せず、repository 相対 file とは別の path projection とする。
- 性能は単一プロセスの決定的スイープ、セキュリティ境界は repository 内 `tests/`、スケールは全数再走査、信頼性はファイル単位の障害局所化まで上流で確定している。
- cache、queue、DB、外部サービス、AWS resource、認証基盤、CI 配線、生成スクリプト実装を追加しない。
- 現行の tier purity gate と smoke policy は U1 台帳の出力契約外であり、本ステージでは変更・再解釈しない。

このファイルには回答対象がないため `[Answer]` タグを置かない。
