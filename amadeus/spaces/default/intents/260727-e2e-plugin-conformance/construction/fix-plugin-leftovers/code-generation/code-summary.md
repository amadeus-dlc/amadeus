# Code Summary(fix-plugin-leftovers)

上流入力(consumes 全数): requirements.md — FR-1〜FR-8(承認後追補含む)の実装結果を本 summary へ 1:1 で対応づける。plan は code-generation-plan.md。

測定 ref: worktree plugin-dev、base origin/main 0c4709102。検証 exit code はすべて builder 報告+conductor 再実行の実測。

## 実装結果(Issue 別)

| Issue | FR | 実装 | リグレッション固定 |
| --- | --- | --- | --- |
| #1585 | FR-2 | standalone doctor を canonical `doctorPluginRows` 経由へ(amadeus-plugin.ts の doctor variant を section 化、旧ローカル写像削除) | t339(Red 0/3→Green 3/3 実測) |
| #1586 | FR-3 | `pruneEmptyAncestors`(mkdir⇔rm 対称化、bottom-up・非空停止・root 不可侵)+ `baselineRestored` へ FS 実測合流+drops record 残存許容を docs 契約化 | t340(Red 1/4→Green 5/5、rollback 経路込み) |
| #1575 | FR-1 | promote-self.ts が canonical `SELF_INSTALL_HARNESSES` を import(誤名重複定義削除)+テスト側三重定義を canonical 参照へ+再導入検知ガード | t209/t-plugin-projection-packaging(注入赤の実証済み) |
| #1590 | FR-6 | t132 の count-word parse 依存 5テスト(4/5/6/7/8)を count-free 契約(件数断定ゼロ+per-script インベントリの forward/reverse 照合)へ | 落ちる実証: count word 注入→3 fail→復元 |
| #1591 | FR-7(裁定B) | compose 系の hostRoot をハーネスディレクトリへ統一 — hook の `--project-root`(core/hooks/amadeus-plugin-compose.ts:16)、CLI 既定 `defaultPluginHostRoot()`(amadeus-plugin.ts:293/:314)、INSTALL.md 投影(plugin-projection.ts:597)、統合 doctor 観測ルート(amadeus-utility.ts:632 — D1 同根第3面、same-root-inventory 準拠の同時修正)、docs EN/JA 統一 | E2E (a)(b)+falling proof(hook 巻き戻し→赤) |
| #1592 | FR-8 | `spawnRecompile` を graph compile → runtime compile の2段へ(非0 loud 中断) | E2E (c)+falling proof(runtime のみへ巻き戻し→赤) |
| #1589 | FR-4/FR-5 | `tests/e2e/t341-plugin-conformance-journey.serial.test.ts` 新設 — 出荷 dist/claude 由来ホスト+出荷 plugins/formal-model-check(read-only)で (a)folder-drop(投影 INSTALL.md 文言と一致する経路)→(b)出荷 settings.json の SessionStart コマンド verbatim spawn で compose→(c)stage-graph.json 実在(baseline 0 hit の非空振り確認付き)→(d)intent birth+`next --stage`(--single なし)の run-stage directive emit→(e)doctor installed/composed→(f)FS 完全 baseline 復元(sha256+構造)。実行時間 0.76秒(実測)。CI: `plugin-conformance-e2e` ジョブ新設(ci.yml:146)+ci-success へ blocking 接続 | E2E 自身+FR-5 落ちる実証(意図的失敗で同一コマンド exit 1) |

## 検証(最終、exit code)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / `tests/run-tests.sh --ci` 0(608 files / 8249 assertions / Failed 0)/ gen-coverage-registry --check 0 / complexity-gate --check 0 / E2E 0(conductor 再実行でも 0)

## 落ちる実証(5面、すべて注入→赤→byte 復元の1セット)

FR-7 hook 巻き戻し→E2E 赤 / FR-8 recompile 巻き戻し→E2E 赤 / FR-5 同状態で CI ジョブ同一コマンド exit 1 / FR-6 count word 注入→t132 赤 / FR-1 誤名定数再注入→再導入ガード赤

## 逸脱・申告の裁定記録

- builder 第2便の逸脱停止(D1/D2 発見)→ #1591/#1592 起票 → ユーザー裁定(D1=案B・巻き取り・formal-model-check 素材)→ FR-7/FR-8 追補 — 経緯は CG diary 参照
- 統合 doctor(amadeus-utility.ts:632)の同時修正は裁定Bの同根第3面への機械的執行(cid:code-generation:same-root-inventory)として conductor 受理
- t153 自己捕捉是正1件(core コメントのハードコード harness パス → reword、shipped-comment-vocab 同族)

## 残課題(スコープ外、既存記録)

- marketplace 経路 discovery / 他ハーネス面 E2E / TLA+ 資産同梱(requirements Out of Scope どおり)
- FR-3 の「compose 前から空だった祖先ディレクトリ」エッジ(record スキーマ変更が必要、実害未観測 — 必要になれば別 Issue)
