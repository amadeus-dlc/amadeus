# Code Summary — Bolt 2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `code-generation-plan.md`(Step 実績)、`unit-of-work.md`(U2 完了条件)、`business-rules.md`(BR-U2-1〜9)、`business-logic-model.md`(判定フローの実装対応)、`domain-entities.md`(型と C1 参照規律)、`bolt-plan.md`(Bolt 2 の Definition of Done)、`requirements.md`(FR AC)、`security-design.md`/`logical-components.md`(統制と配置の充足面)。

## 実装実績(swarm 経路 — builder: amadeus-builder-agent、worktree `bolt-budget-sensor`、base = a5e05d2af)

| コミット | 内容 |
|---|---|
| 3fa699f8c | feat(grilling): deferred-node 節を questions ファイル義務へ(U1 正本への申告付き追補、4列挙面同時) |
| 079568178 | feat(sensor): question-budget センサーが grilling 3トークンを読む |
| ffe078253 | feat(sensor): 超過記録の検査と未知 depth fail-open の封鎖(severity 導入) |
| 4e4d8c37a | test(t415): Bolt 1 が暫定に留めた grilling 契約 pin の完全化 |
| 7c2bf7d98 | docs(sensor): question-budget manifest を grilling 検査へ同期 |

referee: `amadeus-swarm.ts check budget-sensor` converged / tampered false → `finalize --batch 2 --claimed budget-sensor,projection-sweep` exit 0(converged 2 / failed 0)。

追補したマーカー様式: `<!-- amadeus-grilling:deferred -->`(既存2トークンの `amadeus-grilling:<名詞>` 命名に整合する1行 HTML コメント)。

## 検証(builder 実測+conductor 独立再実測)

| 検査 | builder | conductor 再実測 |
|---|---|---|
| typecheck / lint | 0 / 0 | — |
| t415+t516+t517+t530+t531 | 102 pass / 0 fail(Ran 102 across 5 files) | referee check-cmd 内で green |
| protocol 消費12ファイル(t34/t35/t36/t37/t86/t01/t146/t199/t487/t492/t76/t367) | 269 pass / 0 fail | — |
| `bash tests/run-tests.sh --ci` | 963 files / 12,964 assertions、失敗4ファイル(全件 base 由来と帰属確定) | — |
| `bun run build` 後 tracked 不変 | 差分なし | — |
| 骨格 digest(FR-PROTO-1) | 追補は overlay 側のみ | `fa5c1e5ee76b1c8f…` = Bolt 1 記録と完全一致(自己記述 awk で独立再実測) |
| 追補の4列挙面 | 4面同時 | grilling-protocol.md:127/:205/:281、stage-protocol.md:355/:760 を独立 grep で実在確認 |
| 刈り0件でも必須の明記 | 明記済み | :120 / :143 の逐語で確認 |

### フルスイート失敗4件の帰属(builder 実測)

自変更8点を base 版へ戻した対照実行で、HEAD 39件 / base 36件。差分3件はすべて t222 `Kiro advancing guard parity` で、同一 HEAD 内でも 3→2→1 と変動し base でも 2→0 と断続する **既存 flaky**(git fixture の `failed to insert into database`)。t222 を除くと HEAD 36 = base 36 で失敗集合が完全一致。no-silent-drop 3ファイルは `BASELINE_INVALID`(ベース revision 解決依存、project.md `cid:build-and-test:c3-260805-subagent-type-guard` の記録済みクラス)。

### 落ちる実証(BR-U2-7 (ii)(iii))

- (ii) 超過記録行を除去 → `pass=false reason=over-budget-unjustified` / `[error] missing-justification`
- (iii) deferred マーカーを除去 → `pass=false reason=over-budget-unjustified` / `[error] missing-deferred-list`
- 対照 (i) 両方あり = `pass=true reason=justified-overrun findings 0`
- 実装面の感度: 検査追加前(079568178)へ面切替すると t531 が 8 fail。復元は `git checkout <fix SHA> -- <path>` で行い、`git diff --stat` / `git status --porcelain` とも空 = 残渣ゼロ(注入→赤→復元→機械確認を不可分の1セット、stash 不使用)。

### 対角実測(BR-U2-6)

| 組合せ | 結果 |
|---|---|
| (a) 改訂後 t415 × 改訂後正本 | 10 pass / 0 fail |
| (b) 改訂前 t415 × 改訂後正本 | 8 pass / 0 fail(追補が加算的で既存 pin を壊していない) |
| (c) 改訂後 t415 × 改訂前正本 | 1 fail(`Expected to contain: "<!-- amadeus-grilling:deferred -->"`)= 新 pin が荷重を持つ実証 |

FR-CONTRACT-6 が名指すのは (b) だが、追補が加算的である以上 (b) 単独では改訂の実効を示せないため (c) を併測した(builder 申告、conductor 受理)。

## BR-U2-1〜9 の充足

BR-U2-1 マーカー検知 / 2 justification 切替 / **2b 列挙節検出(裁定 B により「見出し逐語の完全一致」→「言語中立マーカーの存在」へ読み替え。走査範囲・存在のみ判定・型は設計どおり)** / 3 未知 depth の loud 化 / 4 vacuity guard(count 側・answer-evidence 側の両方向) / 5 VALID_DEPTH_VALUES 3値 assert / 6 t415 完全改訂+対角 / 7 5態+落ちる実証 / 8 単一ゲート / 9 迂回路不在(9入力組合せ) — 全数充足。

## 逸脱・申し送り

- **申告付き逸脱(裁定・ユーザー承認済み)**: 着地済み U1 正本(PR #2828)への追補。出典 = ソロ選挙 E-GFR-CG2(choice B、2-0、GoA 2x2、記録 `amadeus/spaces/default/elections/260810-e-gfr-cg2/`)+ ユーザー承認 2026-08-10。エスカレーション正準リスト(4)該当としてユーザー裁定を経ている(cid:requirements-analysis:implementation-deviation-election / cid:code-generation:c1-external-review-contract-change)。選挙の留保2件(4列挙面同時追補 / トークン正本は C1 単一定義・刈り0件でも必須)は実装へ全数転記済み。
- **スコープ注記2点(builder 申告・conductor 受理)**: (1) `t517` の旧 fail-open pin(未知 depth → `no-depth, pass:true`)の改訂 — FR-CONTRACT-4(ii)/BR-U2-3 が変更を命じている当の挙動であり、pin を残すと要件実装が不可能(t415 改訂がスコープ内であるのと同型) (2) `packages/framework/core/sensors/amadeus-question-budget.md` manifest の `output_schema` への severity 追加と fail-open 記述の訂正 — C3 と同一コンポーネントの契約文書で、放置すると正本が自己矛盾する(business-logic-model.md:87 が「意図した契約変更」として予期)。
- t415 の実所在は `tests/integration/`(ディスパッチの `tests/unit/` は所在違い)。既存 `// size: medium` を維持。
- `coverage-patch-allowlist` は非該当(未接触)。新規行は t530/t531 の in-process 直接呼び出しで駆動し spawn 盲点に入らない。
- PR は conductor が発行(cid:code-generation:c2-ssp-plugin-overlay-review-order — PR 発行 → 収束 → pr-convergence-report → §12a → approve の順)。
