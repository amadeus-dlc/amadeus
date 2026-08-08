# Build and Test Summary — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(受け入れ基準と検証宣言)と `code-summary.md`(unit 単位の着地と実測) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 検証の構成(Test Strategy: Comprehensive の比例適用)

戦略名を根拠に検査を機械追加せず、承認済み NFR と実在境界へ trace できる範囲だけを生成した(`cid:build-and-test:bt-proportional-selection`):

| 面 | 指示書 | 判定 |
|---|---|---|
| ビルド・配布 | build-instructions.md | 実施 — NFR-5 へ trace |
| unit テスト | unit-test-instructions.md | 実施 — NFR-3 へ trace |
| integration テスト | integration-test-instructions.md | 実施 — NFR-3(落ちる実証必須)へ trace |
| 性能 | performance-test-instructions.md | **N/A(反証可能な根拠付き)** — 性能 NFR が不在、変更面に性能境界なし |
| セキュリティ | security-test-instructions.md | 実施 — NFR-1(認可境界の不変)へ trace。外形 DAST・依存 audit は変更面へ trace 不能のため対象外 |

brownfield バグ・機能バッチとして、**per-unit の PR CI green + conductor 本線でのフルスイート1回**を Comprehensive の実行形とした(`cid:build-and-test:bt-20260730-1` — 各 bolt worktree での full 再実行は unit の CI 証跡と重複する)。

## 実測の要約(確定値 — 出典は build-test-results.md)

- 全 PR(#2492 / #2487 / #2477 / #2524 / #2532)マージ着地、CI 全 check green
- conductor ツリーのフルスイート: 907 files / 12,186 assertions / 失敗 3 files・3 assertions
- 失敗3件はすべて**既存事象(ambient 入力起因)** — 未改変 base + 同一 ambient 再現で同型赤を立証し、GitHub CI では全 green。既起票 #2464 / #2469 を引用(新規起票なし)
- AC 内外の認定: 3件とも FR-1〜5・NFR-1〜5 の**外**(実文照合済み)

## 検証した面と検証していない面(verdict 自体に書き分ける)

**検証済み**:
- 認可境界の不変(NFR-1) — `full` 儀式の非代行・上書き不可・grant 取消の非副作用・launch chain の identity 束縛・観測の非干渉・記録失敗の fail-open を、拒否経路が「修正前実装で赤くなること」まで含めて固定
- 監査面(NFR-4) — 新設イベントの registry 登録と docs 同期、append-only 維持
- 配布面(NFR-5) — `bun run build` 再生成で追跡ファイル不変、隔離2回ビルド再現性・source-only・グラフ不変量は PR CI で通過
- テスト規律(NFR-3) — TDD 既定、落ちる実証は builder / conductor が独立実施、blocking gate 全維持
- 互換(NFR-2) — 互換レイヤー・シムの不在をレビュー観点で確認(§12a 全 unit READY)

**未検証(AC 外として明示)**:
- FR-4c の一部は **PENDING**(u5 の計測レポートに閉包条件を明記 — 適用後の新規 intent での実測は本 intent の後に発生する運用面であり、PASS と代用していない)
- ローカル worktree での cursor 共存時のフルスイート green(#2464 / #2469 の解消)は本 intent のスコープ外

## Verdict: **READY(無条件)**

未検証面2件はいずれも受け入れ基準(FR/NFR)の外にあり(`cid:build-and-test:c2-unconditional-ready-boundary` — AC 外認定は requirements.md 実文照合で実施、`no-silent-scope-narrowing` が縛る実装時実測の規定項目に該当しない)、上の申し送り節に列挙した。条件付き READY にはしない — AC 外項目まで条件化すると条件付きの信号が希釈する。
