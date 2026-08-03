# Build and Testサマリー

## 上流成果物

- `code-generation-plan.md`
- `code-summary.md`
- Requirements FR-1〜FR-6、NFR-1〜NFR-6、Acceptance 1〜7

## テスト種別

- Unit: pure extractor／comparator、6ケース
- Integration: live repository parity、実shell change detector、stage inventory、関連回帰
- Repository-native: smoke＋unit＋integrationの`bun run test:ci`
- E2E: 新しい利用者journeyがないため専用追加なし
- Performance: 定量NFRとruntime workloadがないためN/A
- Security: 攻撃面／dependency追加がないためN/A。fail-closedと静的品質を検証

## Readiness

- Build-ready: YES。typecheck、lint、coverage registry、7-harness package check、diff checkがすべてexit 0
- Test-ready: YES。focused 206 pass／0 fail、修正後repository-native CI 753 files／10,171 assertions／0 fail
- Deployment-ready: deployment対象がないためN/A

## 既知の制約

- 通常`promote:self:check`は開始前からのplugin overlay ORPHAN 31件を報告しexit 1。保護対象を削除せず、Acceptance 7の既知未達として`build-test-results.md`へ記録した。
- Code Generationレビューで、通常promotion check未達と専用E2E不在が明示承認された。Build and Testでは隠さず、比例選定と実測結果を維持する。

## 実行中に修正した回帰

初回`bun run test:ci`で、新規integration testがfilesystem／process APIを使うのに`size: small`と宣言されていることを既存size drift guardが検出した。`size: medium`へ訂正し、狙い撃ち20 testsと全体CIを再実行してgreenを確認した。

## 最終判定

通常promotion checkの既知制約を明示したうえで、Issue #2037のregistry drift再発防止実装は最終承認ゲートへ進められる。専用performance／security／E2E追加は変更境界に対して非適用である。
