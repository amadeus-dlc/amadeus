# Requirements — 260710-kiro-stale-hooks(fix #719)

> Scope: bugfix / Depth: Minimal。上流: intent 記述(audit 参照)、codekb(business-overview / architecture / code-structure、および本 intent の re-scans/260710-kiro-stale-hooks.md)。
> 修正方式は選挙結果待ち(requirements-analysis-questions.md の Q1/Q2)。確定後に FR を最終化する。

## Intent 分析

- **達成したいこと**: Kiro CLI ハーネスの source ツリー衛生の回復と、それを見逃した検証ゲートの誤 green(検証劇場)の解消。GitHub Issue #719(bug / P3、クロスレビュー2名 VERIFIED)。
- **問題の構造(2層マスキング、#719 コメント 4931194718 の訂正済み理解)**:
  1. **source 側(1層目)**: `packages/framework/harness/<name>/` 配下の manifest 未参照ファイルを検査する機構がそもそも存在しない(`scripts/package.ts` の `checkHarness` :554-633 は dist ツリーのみ walk)。stale 7 件が残存できた直接の理由。
  2. **dist 側(2層目)**: `harness/kiro/manifest.ts:81` の authoredExempt 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は、kiro CLI が `.kiro.hook` を 1 件も出荷しないため守る実体がなく、将来 dist に stale が混入しても ORPHAN 検出を無音で抑止する純粋マスキングとして機能する。
- **現状の実測(codekb re-scan で file:line 確定)**:
  - `packages/framework/harness/kiro/hooks/` に `.kiro.hook` 7 件 + adapter 1 件。7 件は Kiro CLI では登録(`agents/amadeus.json` の adapter 経由 hooks ブロック)・出荷(dist 0 件)とも dead。
  - 7 件中 6 件は kiro-ide 版と byte 一致、`amadeus-session-end.kiro.hook` のみ adapter 非経由の旧世代 command(`bun .kiro/hooks/amadeus-session-end.ts`)で内容 drift。
  - kiro-ide は 9 件の `.kiro.hook` を harnessFiles で正当に明示出荷(manifest.ts:51-59)しており、同種 exemption(:96)は実体があるため正当。
  - t148(smoke)/ t147(unit)は dist/kiro のみ参照 — source 7 件の削除で既存テストは壊れない(23 pass 実測)。

## 機能要件(FR)

> FR-1/FR-2 の具体形は選挙 Q1/Q2 の結果で確定する。以下は選挙の選択肢に依存しない骨格。

- **FR-1(dist 側マスキング解消)**: kiro CLI ハーネスにおいて、stale な `.kiro.hook` source ファイルと空振り orphan exemption の組み合わせを解消する(方式は Q1 選挙結果)。
- **FR-2(source 側マスキング対処)**: manifest 未参照の source ファイルが検出されないギャップについて、本 intent での対処範囲を確定する(方式は Q2 選挙結果)。
- **FR-3(kiro-ide 非影響)**: kiro-ide ハーネスの `.kiro.hook` 出荷(9 件)と authoredExempt は変更しない。修正後も kiro-ide の dist 内容は byte 不変であること。
- **FR-4(検証エビデンス)**: 修正後、`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` がすべて exit 0 であること。t147/t148 は無改修で green を維持すること。

## 非機能要件(NFR)

- **NFR-1(落ちる実証、Mandated)**: 新設・変更するゲート挙動は、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする。最低限、(a) exemption 除去後に stale `.kiro.hook` を dist へ注入すると `dist:check` が ORPHAN で exit 非 0 になること(2層目)。Q2 で検査機構を追加する場合は (b) manifest 未参照の source ファイルを注入すると新検査が exit 非 0 になること(1層目)。
- **NFR-2(dist/self-install 同期、Mandated)**: `core/` / `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成し、`bun run promote:self` でセルフインストールへ昇格し、同一コミットに含める。
- **NFR-3(surgical)**: 変更は #719 の解消に必要な最小範囲に限定する。kiro-ide・他ハーネスの挙動、および無関係な隣接コードに触れない。
- **NFR-4(deslop)**: PR 作成前に deslop を実行し、挙動不変を全検証コマンド再実行で実証する。

## 制約

- トランクベース開発: 短命 Bolt ブランチ → squash マージ(人間承認後、leader 執行)。
- bugfix scope の Testing Posture: 対象バグに対するリグレッションテストを追加し、既存スイートはグリーン維持(org.md)。本件の「リグレッションテスト」は NFR-1 の落ちる実証を恒久テスト化するかどうかを含め design/testing 段階で確定する。
- バージョン・CHANGELOG・リリースノートには一切触れない(release.yml 一本化、Mandated)。

## 前提(Assumptions)

- kiro CLI の hook 登録は `agents/amadeus.json` 経由の adapter 登録が唯一の正であり、`.kiro.hook` ファイル方式は kiro-ide(IDE)専用の登録面である(codekb re-scan と #719 クロスレビューで確認済み)。
- Codecov patch ゲート(codecov/patch)が PR の新規行カバレッジを検証する。`bun --coverage` は spawn したサブプロセスを計測しない(cid:...:bun-coverage-spawn-blindspot)ため、Q2 で検査ロジックを追加する場合は in-process seam(関数直接呼び出し)でテスト可能な形に設計する。

## スコープ外(Out of Scope)

- kiro-ide ハーネスの hook 出荷・exemption の変更(FR-3 で不変を保証)。
- 他ハーネス(claude / codex / kiro-ide)の authoredExempt の棚卸し(発見事項があれば Issue 起票で分離)。
- Kiro CLI の hook 登録方式自体の再設計(adapter 経由登録は既定の正)。

## 未解決事項(Open Questions)

- Q1(dist 側修正方式)/ Q2(source 側検査のスコープ)— エージェント間選挙で決定待ち。結果確定後、本ファイルの FR-1/FR-2 を具体化して最終化する。
