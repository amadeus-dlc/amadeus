# コード品質評価

## 既存の品質ゲート(変更なし)

- `dist:check`、`promote:self:check`、`.github/workflows/ci.yml`(typecheck → lint → dist:check → promote:self:check → tests)は前回 codekb から変更なし。
- `tests/integration/t92.test.ts`(Group N test 44)が #657 のリグレッション検証アンカーとして既に存在する(exit code 2/TS18003 を期待)。
- `packages/setup/tests/setup-*.test.ts`(11ファイル)が前回 intent で新設され、`LegacyLayout` のユニットテストは合成 evidence でのみカバーしている(#656 の「本番検出パスからは到達不能」という欠陥自体は既存テストでは検出されていない)。

## 強み

- `packages/setup` は functional-domain-modeling-ts スタイルで統一されており、`Installation` のような判別ユニオン + `admitsInstall` の tell-dont-ask 設計は #656 の修理を局所化しやすい構造になっている。
- センサー複製構造(#657)は `dist:check`/`promote:self:check` という既存ドリフトガードが既に存在するため、修理後の伝播漏れは自動検知される。
- `stage-protocol.md:657` の Glossary という canonical な定義源が既に存在するため、#661 の修理は「grep して canonical に統一する」機械的な作業として実行できる。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#656**: `Installation.detect` が `LegacyLayout` を呼ばない | 高(upgrade 判定の正確性) | loose ファイルのみのレガシー導入で誤判定しうる。合成 evidence のユニットテストのみが `LegacyLayout` をカバーしており、本番検出パスの欠落が既存テストで検出されない — テストギャップそのものが負債 |
| **#656**: manifest 読取成功で無条件 `manifested` | 中 | `installation.ts:29-32` は manifest が読めれば実ファイル存在確認をしない。「manifest はあるが実ファイル欠落」の partial 経路が到達不能 |
| **#657**: `bunx tsc` の無条件使用 | 高(CI/hooks の信頼性) | repo ピン(`^6.0.3`)と bunx 解決バージョンの不一致で exit code が意図せず変わる。4箇所複製のため修理漏れリスクも高い |
| **#641**: `resolveProjectDirFromHook()` の worktree 非対応 | 高(gate の正確性) | worktree セッションで human-presence gate が誤拒否しうる。全 hooks(11個)がこの関数に依存するため影響範囲が広い |
| **#661**: Bolt/Unit グロッサリー逆転 | 中(ドキュメント整合性) | 実行時の挙動には影響しないが、delivery-planning の理解を誤らせる。複製箇所(4+)への伝播漏れリスクが本質(project.md cid:functional-design:c3 が指摘する典型パターン) |

## 修理時の安全要件

1. **#656**: `LegacyLayout.isUnsupported` 条件(b)を本番検出パスから到達可能にする変更は、既存の `none`/`manifested`/`manual-or-unknown`/`partial` 4分岐の判別ユニオンとの整合を保つ(新しい `kind` を追加するか、既存 `kind` の判定条件を拡張するかを requirements で確定)。
2. **#657**: 修理は正本(`packages/framework/core/tools/amadeus-sensor-type-check.ts`)のみを編集し、`bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(team.md Mandated)。修理後に `tests/integration/t92.test.ts` Group N test 44 を実行し、意図的に repo-local tsc 不在の状態を注入してフォールバックが正しく機能することも検証する(team.md Mandated の「落ちる実証」原則)。
3. **#641**: worktree セッションを実際に再現して修理前後の挙動差分を確認する。合成 evidence のユニットテストだけでは worktree 分岐は検出できない。
4. **#661**: 修理前に「Bolt」「Unit of Work」等の用語を全リポジトリ grep し、複製箇所を網羅リスト化してから canonical 定義へ統一する。日本語版(`inception.ja.md`、`glossary.ja.md`)の精査を含める。

## 移行しない選択肢の評価

4件とも既存機能の欠陥修理であり、「修理しない」選択肢は intent の目的そのものを満たさない。ただし各バグの修理範囲(最小差分での是正 vs. 構造的リファクタ)は requirements-analysis で比較検討すべきである — 特に #656 は `Installation` 判別ユニオンへの新規 `kind` 追加という設計判断を伴いうるため、architecture decision として明示する必要がある。
