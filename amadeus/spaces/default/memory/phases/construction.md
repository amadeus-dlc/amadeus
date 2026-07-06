# Construction Phase Guardrails（Construction フェーズの防護規定）

この規則は、`phase: construction` 宣言を持つすべての stage が、対応する phase rule としてこの文書を import する場合に適用される。

## Code Completeness

- 完全に動作するファイルを生成する。部分的な実装や、理由を添えた TODO 明記のないプレースホルダーの scaffold は作らない。
- 生成した各モジュールは、単独で実行可能であるか、依存関係を明確に文書化する。
- 未解決の import エラー、型定義の欠落、壊れた参照を残さない。

## Error Handling

- 統合境界（API 呼び出し、データベース操作、ファイル I/O、外部サービス）では、必ずエラーハンドリングを入れる。
- エラーは呼び出し元へ伝播するか記録する。無言の失敗は許容しない。
- 回復可能なエラー（retry・fallback）と致命的なエラー（fail fast）を区別する。

## Testing Standards

- テストファイルは、happy path と、少なくとも 2 件のエラー・エッジケースをカバーする。
- テストは、文書化された前提条件を除き、手動セットアップなしで実行できる。
- 実装内容にかかわらず常に成功するテスト（例: `assert True`）を生成しない。

## Security

- 認証情報、API キー、シークレットをハードコードしない。環境変数または secrets manager を使う。
- システム境界のすべての入力を検証・サニタイズする。
- 認証・認可チェックを迂回するコードを検出したら指摘する。

## PR Gate

- PR にコメントが付いている場合、返答・解決なしの放置やマージを許容しない。
- PR 作成後は監視を行い、詳細手順は `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` に従う。
- merge は人間が行う。
- 検証設定（カバレッジなど）を緩めて pass させない。

## Corrections

## Bolt 運用

walking skeleton・ladder prompt・Construction Autonomy Mode は、現行エンジンにすでに実装済みの契約である。新しい契約は追加しない。

- walking skeleton と Bolt-level gate、ladder prompt の規定: `.agents/amadeus/amadeus-common/protocols/stage-protocol.md` の「Construction Bolt gates (walking skeleton + ladder + halt-and-ask)」節（89 行目）と、同節内の Ladder prompt 記述（97〜118 行目）。
- Construction Autonomy Mode の設定コマンド: `.agents/amadeus/tools/amadeus-bolt.ts` の `set-autonomy` サブコマンド（774〜868 行目付近）。

Bolt 切り直し手順（Construction 途中で Bolt 分割の見直しが必要になった場合）:

1. halt-and-ask で人間に確認する。
2. 必要なら delivery-planning への backward jump、または単発 re-run で bolt-plan を更新する。
3. 更新後に Construction を再開する。

これ以上の重い契約化（切り直しの専用 stage 化など）は、運用実績が積まれるまで行わない。
