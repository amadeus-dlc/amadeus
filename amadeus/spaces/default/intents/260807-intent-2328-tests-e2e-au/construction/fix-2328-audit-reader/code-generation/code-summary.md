# Code Summary — fix-2328-audit-reader

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` — 本 unit の設計正本。FR-1〜FR-5 / AC 全数をここからスコープした。self-fix scope は units-generation を SKIP するため unit-of-work.md は不在 = consumes_absent expected:true）

- Unit: fix-2328-audit-reader（degrade 単一 unit — Issue #2328）
- Test Strategy: Comprehensive
- トレーサビリティ: 全変更は #2328 と requirements FR-1〜FR-5 へ遡る。user stories は scope SKIP のため intent 直結。

## 裁定系譜

**E-ASD-CGDEV**（tie → ユーザー裁定 choice:1）— builder が実装中に検出した2逸脱の裁定。**問A**: t113 の赤は本欠陥クラスでなく emit 順序契約の破れ（FR-1 変換前後で失敗署名 byte 同一を実測）→ リーダー変換は維持（「e2e reader は例外なく共有ハーネス統一」を要件宣言）し、順序欠陥は未改変 base の分離 worktree 再現実測付きで Issue **#2456** へ切り出し（s2 条件どおり患部分類として AC-1a に記述 — 免責でない）。**問B**: RE 述語の `\.event\b` 連言が fields-only pin 変種を取りこぼし患部は 17→**19**（t02:116 / t06:179 を追加 — 広げた述語で追加候補はちょうど2件と実測確定）→ same-root-inventory に従い同一 unit で修正。requirements は裁定準拠で申告付き改訂済み（FR-1 / AC-1a / Assumptions の完全性主張訂正 = s1 留保）。

## FR-3: dist 前提の実装時実測（実装続行の根拠）

- **経路A（run-tests e2e tier）**: repo 外 scratch に tests/ のみ複製（dist 不在）で `bun tests/run-tests.ts --e2e` → `run-tests: dist/ is missing or empty — run \`bun run build\` first`、exit 1。ガードは `tests/run-tests.ts:1010` の main() 冒頭で tier 非依存 = **fail-closed**
- **経路B（ci.yml:252 の t341 job）**: `.github/workflows/ci.yml:247-249` に `bun run build` が先行 = 保証あり
- 補強: `tests/e2e/t134-swarm-referee.test.ts:81` が既に共有ハーネスを import — **dist 依存は本修正が新規に持ち込むものではない**（RE 実装上の注意(5) の懸念は実在先例で解消）

## 変更ファイル（19件、すべて tests/e2e/）

t-formal-verif-model-completeness-sensor / t02 / t03 / t05 / t06 / t07-audit-fork-merge / t09-halt-and-ask-preservation / t10-halt-and-ask-discard / t11-halt-and-ask-retry-correlation / t113 / t60-enterprise / t61-feature / t62-mvp / t63-poc / t64-workshop / t65-fix / t66-refactor / t67-security-patch / t92-linter-eslint-roundtrip

各ファイルの自前 v1 パーサ（`JSON.parse ... as AuditRecord` + トップレベル event/fields pin）を `tests/harness/audit-records.ts` の正規化 API（auditRowsFrom / countAuditEvent / normalizeAuditRecord）の消費へ置換。**機械検査**: `git diff --stat -- packages/ scripts/ .github/ tests/harness/ tests/integration/ tests/unit/ tests/smoke/` = 空（AC-1b writer 無改変・NFR-2 ハーネス無改変・AC-4c 除外4無改変）。`git diff --name-only -- tests/` = 19。

## Red / Green 実測（AC-1a — 患部19ファイル各単独実行）

| ファイル | Red (exit / pass-fail) | Green (exit / pass-fail) |
|---|---|---|
| t-formal-verif-model-completeness-sensor | 0 / 7-0（in-file 正規化で元 green） | 0 / 7-0 |
| t02 | 1 / 3-2 | 0 / 5-0 |
| t03 | 1 / 3-1 | 0 / 4-0 |
| t05 | 1 / 1-1 | 0 / 2-0 |
| t06 | 1 / 4-3 | 0 / 7-0 |
| t07-audit-fork-merge | 1 / 9-5 | 0 / 14-0 |
| t09-halt-and-ask-preservation | 1 / 2-2 | 0 / 4-0 |
| t10-halt-and-ask-discard | 1 / 2-2 | 0 / 4-0 |
| t11-halt-and-ask-retry-correlation | 1 / 3-3 | 0 / 6-0 |
| **t113** | 1 / 1-3 | **1 / 1-3（患部分類 — 変換適用済み・赤は #2456 の順序欠陥で署名 byte 同一）** |
| t60〜t67（8件） | 各 1 / 2〜3 fail | 各 0 / 全 pass |
| t92-linter-eslint-roundtrip | 1 / 0-1 | 0 / 1-0 |

**t113 の base 再現**（裁定 s2 条件）: conductor が未改変 base `a5621236c` の分離 worktree（`git worktree add --detach` + build）で 1 pass / 3 fail・同一署名（`Expected: "WORKFLOW_COMPLETED" / Received: "INTENT_AUTONOMY_TRANSACTION_COMMITTED"`）を実測 — 既存事象と確定し #2456 へ起票済み。

手続き知識（E-ASD-CGS13 C2 不採用時の record 固定 — s1 留保）: 変換適用前後の失敗署名 byte 同一は「変換起因でない」ことしか示さず、cid:build-and-test:c4-260805-subagent-type-guard が要求する未改変 base の分離 worktree での失敗集合一致の**代替にならない** — #2456 の起票根拠は base 再現で初めて成立した（byte 同一署名は補助証拠）。

## FR-2: vacuity guard 落ちる実証（3件）

注入面 = テストが実読する audit shard（v2 形行の append）。`git stash` 不使用、復元は scratch バックアップ + md5 照合、`grep -rn "VACUITY-INJECTION" tests/` = 0件。

| assert | 注入後 |
|---|---|
| t09:211 `eventCount(p,"WORKTREE_DISCARDED")).toBe(0)` | Expected: 0 / Received: 1（exit 1） |
| t07:371 `countEvent(...,"AUDIT_MERGED")).toBe(0)` | Expected: 0 / Received: 1（exit 1） |
| t07:530 `countEvent(...,"AUDIT_FORKED")).toBe(0)` | Expected: 0 / Received: 1（exit 1） |

復元確認: t09 md5 `65b8a90ed0736c07d8ad2082f378f237` / t07 md5 `c138696081fd383d04b63268bac6af61`（注入前と一致）、復元後 e2e tier で両ファイル PASS。

## FR-4: 非 e2e 再棚卸し（述語記録 — E-ASD-RES13 準拠）

**狭義述語**: P1 = tests/{unit,integration,smoke} の *.test.ts / P2 = `audit` 含む / P3 = `JSON.parse` 含む / P4 = `\.event\b` 含む / P5 除外 = `harness/audit-records|parseAuditRecords` を import しない（出現単位・`grep -v` 行単位除外不使用）→ 分類後 **真の latent = 14件**。14 vs 29 不一致の主因は Architect が第2の正準入口 `parseAuditRecords`（tests/harness/fixtures.ts:853）を P5 に含めなかったこと。

**広義述語**（P4 を `\.event\b|\.fields\b|\["Bolt slug"\]` へ拡張 — t02/t06 の実証を受けた再計測、conductor 実施）→ **候補上限 26件**（逐語パイプラインは scratch `fr4-remeasure.sh` — per-file 分類は Issue 側作業）。**Issue #2457 起票済み**（AC-4b 充足）。

## FR-5: CI 死角（AC-5a）

新規起票せず既存 open **#1981**（e2e 層の CI 昇格）が同一課題をカバーと確認（pre-filing-dup-and-branch-check）— #2328 の6日間不可視の証跡をコメントで追加。表題再定義（AC-5b）はクローズ時に実施。

## 再接地（base-advance-regrounding）

実装完了後に origin/main が前進（a5621236c → 6bef8206d — t480/t485/t-formal-verif 変更を含む）。`--no-ff` merge 完遂を機械確認（parents 2・ls-files -u 0）、共有台帳2件（elections.json / intents.json）は 3-stage blob からの union 再構成（base 対比で双方純追加・parse OK・マーカー0）。交差ファイル t-formal-verif-model-completeness-sensor は merge 後 7 pass / 0 fail 再実測。dist 再生成後 typecheck exit 0・lint exit 0。

## 検証 exit code（最終）

| コマンド | exit |
|---|---|
| `bun run typecheck`（再接地+build 後） | 0 |
| `bun run lint` | 0（info 13 は既存水準） |
| e2e tier `bun tests/run-tests.ts --e2e` | 4（99ファイル中 fail 4 — 下記帰属） |
| `bun run test:ci`（builder 実測） | 2（t17 / t66 — 未変更・後述） |

**残余赤の帰属**（bt-20260730-2 — いずれも自変更 19 ファイルと import 交差なし・`git diff` 空を機械確認）: t113 = #2456（患部分類・base 再現済み）/ t267 = election CLI tally の既存事象 / setup-install・setup-upgrade = `bun build failed for @amadeus-dlc/setup ... ENOENT` のビルド環境要因 / test:ci の t17・t66 = stage-graph walk parity の既存事象。

## 逸脱

E-ASD-CGDEV で裁定済みの2件（t113 患部分類 / 患部 17→19）のみ。裁定後の新規逸脱なし。git commit・state 変更コマンドは builder 未実行（checkpoint/merge コミットは conductor 実施）。
