# Security Test Instructions — Amadeus Grilling 統合

> DevSecOps 視点(サポートエージェント)での検査項目。

## 検査項目と結果

1. **認証情報・シークレットの不在**: 追加ファイル(grilling-protocol.md / SKILL.md / t199)はマークダウンとテストのみ。シークレット・環境変数の追加なし — 該当なし(確認済み)
2. **read-only 分類の強制**: スキルはワークフロー状態・監査ログへ書き込まない設計(BR-S1)。t199 が `classification: read-only` frontmatter を機械検証
3. **監査バイパスの不在**: Grill me モードは既存の decision/answer 契約に完全準拠(BR-W4)、新イベント型なし(FR-3.2)— `VALID_EVENT_TYPES` に差分がないことを git diff で確認済み
4. **サプライチェーン/ライセンス**: 取り込みは MIT ライセンスのプロンプトテキストのみ(実行コードなし)。帰属表示は t199 が検証。依存パッケージの追加なし
