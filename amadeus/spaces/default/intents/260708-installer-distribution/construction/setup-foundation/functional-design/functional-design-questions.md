# Functional Design Questions — setup-foundation

> ステージ: functional-design (3.1) / Unit: setup-foundation / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

stage-protocol §3 の位相進行ルール(Construction では質問は例外であり、上流ステージが真のギャップを残した場合のみ)に基づき、本 Unit では質問を生成しない。根拠:

- バージョン解決規約 → requirements FR-006 で全分岐確定(Release→タグ、SemVer 順序、プレリリース/ドラフト除外)
- 取得・リトライ・エラー分類 → FR-012+ADR-003(REST+codeload、1実行2リクエスト)
- マニフェストスキーマ → FR-016(パス・最低フィールド・files[] 契約)
- ビルド/パッケージ骨格 → ADR-002(単一バンドル)、FR-001(メタデータ)、team.md Mandated(検査配線)
- 公開 API 形状 → application-design/component-methods.md で凍結済み

未解決の曖昧さ: なし(ambiguity 分析済み)。


---

## レビュー経過の記録(§12a)

- イテレーション1(Rev.3): NOT-READY — 必須修正4件+参考1件 → 全件是正(未定義型4件の定義、HarnessName.parse の U2 所有化、services.md 参照追加、freeze 統一注記、表記統一)
- イテレーション2(最終): NOT-READY — 残指摘1件(`ManifestError`/`VersionError` 未定義)。前回5件の是正はすべて有効と確認済み
- **ビルダー是正(イテレーション上限到達後)**: `VersionError`(invalid-format)と `ManifestError`(schema-unsupported / malformed / unknown-harness / duplicate-path / io)を `ResolveError`/`FetchError` と同一パターン(判別ユニオン+コンパニオンファクトリ)で定義し、参照切れを解消。unknown-harness variant により fix #2 の往復整合(JSON harness 文字列の復元検証)も明示化
