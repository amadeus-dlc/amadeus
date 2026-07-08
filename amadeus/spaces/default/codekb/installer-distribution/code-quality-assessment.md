# コード品質評価

## 既存の品質ゲート

- `dist:check`(`bun scripts/package.ts --check`）が commit 済み `dist/<name>` と生成結果の byte-diff を検証する。
- `promote:self:check`(`bun scripts/promote-self.ts --check`）が dogfood self-install 状態(`.claude`/`.codex`/`.agents`）を検証する。
- `.github/workflows/ci.yml` が単一 ubuntu-latest job でこれらを実行する: typecheck(2 tsconfig）→ lint(`tests/` のみ）→ `dist:check` → `promote:self:check` → `bash tests/run-tests.sh --ci`(smoke+unit+integration）。
- `tests/unit/t68-version-changelog-sync.test.ts` が `AMADEUS_VERSION`・CHANGELOG 最新見出し・README バッジの3者一致を実行結果ベースで検証する。
- smoke(12)/unit(120)/integration(100)/e2e(64)= 計296 `.test.ts` が packaging、Codex 配布物 shape、promote-self preservation、harness runtime flow を検証する。

これらのゲートは `dist/` が生成済みかつ commit 済み release artifact であるために価値を持つ。installer が新たに追加する `packages/setup` の公開物にも同種の実行結果ベースのゲート(`npm pack --dry-run` 等)が必要になる。

## 強み

- root scripts(`package.ts`, `promote-self.ts`）は manifest ベースの明示的な projection を持ち、harness ごとの配布 shape が1箇所に定義されている。
- self-promotion は local settings・hooks・composed scopes の preservation ロジックを持ち、data-loss リスクを抑えている。これは installer の non-destructive merge 設計に転用可能な資産である。
- `tests/harness/fixtures.ts`/`tui-fixtures.ts` が install fixture を集約しており、installer テストが同じパターンを踏襲しやすい。
- layout-normalization intent(前 intent）でのシンボリックリンク移行は純粋な rename(git diff -M50 で 250 files R100、9 files R097–R099）であり、ロジック変更を伴わなかった。移行の安全性が高かったことを示す。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| root `package.json` の `"license": "MIT-0"` | 高(installer 直結) | `packages/setup` を実際に npm publish する際、正しいライセンス表記(project.md 是正事項では `(MIT OR Apache-2.0)` が想定値として言及されている)が必要。現状は誤ったまま放置されている |
| root `package.json` の `"repository.url": "https://github.com/awslabs/amadeus-workflows"` | 高(installer 直結) | 現行リポジトリと不一致の stale URL。setup package.json には正しい repository を設定する必要がある |
| CI の biome lint scope が `tests/` のみ | 中〜高 | `packages/framework` と `scripts/` は元々 lint 対象外(既存の負債)。`packages/setup` は新規追加なので、この負債を継承せず明示的に lint wiring する必要がある |
| git tag が0件 | 高(installer 前提を直撃) | tag アーカイブ配布という設計の前提となる tag 運用が存在しない。tag 発行フロー(手動 or 自動)を intent 内で整備するか、別途前提として明記する必要がある |
| publish workflow が存在しない | 高(installer 前提を直撃) | 現状 CI に release/publish ジョブがない。`packages/setup` の npm publish 手順(手動 or GitHub Actions)を新設する必要がある |
| `AMADEUS_VERSION` と setup パッケージバージョンの関係が未定義 | 中 | 二重バージョン管理の前例がなく、t68 のような同期ゲートが setup 側には存在しない |
| `packages/framework/package.json` のスクリプトが root `scripts/*.ts` への薄い委譲のみ | 低〜中 | 2箇所結合(script 名と実ロジックの分離)。`packages/setup` で同様の分離を作る場合は意図を明示すること |

## 移行時の安全要件(installer 追加にあたって)

1. `packages/setup` の package.json は正しい `license`/`repository` を設定する(root の既知の不備を再生産しない)。
2. `dist:check`/`promote:self:check` を壊さない — installer は既存 framework 配布経路の外側に追加する。
3. `scripts/promote-self.ts` の preservation rules(`.claude/settings.json`、`.codex/config.toml` 等)を non-destructive merge 設計の参照実装として明示的に踏襲する。
4. tag 運用が0件である事実を requirements.md に明記し、tag 発行フローの前提を確定してから version resolution を設計する。
5. `packages/setup` 用の lint/publish ワークフローを、既存の narrow biome scope という負債を継承せずに新設する。

## 移行しない選択肢の評価

`packages/setup` を追加しない選択肢は、この intent の目的(npm 経由の配布導線を作る)そのものを満たさないため妥当ではない。ただし、「installer を追加するが、`AMADEUS_VERSION` と連動させず独立バージョンにする」「tag 運用は将来別 intent で整備し、当面は特定コミット参照で代替する」といった段階的な選択肢は requirements-analysis で比較検討すべきである。
