# Code Summary — fix-1752-boundary-report-create

上流入力(consumes 全数): requirements.md — FR-3a〜3d の充足状況を本書で対応付ける。

## 実装(PR #1802、branch bolt/fix-1752-boundary-report-create、commit 6d1f1af82)

mirror boundary report の `--user-input create` 受理判定を「Mirror Issue が未記録であること」から「create が実際に走った証拠 = create receipt が `succeeded` で存在すること」へ変更(FR-3a)。

- `packages/framework/core/tools/amadeus-mirror-state-codec.ts`: `succeededMirrorCreateExists(document)` 新設。receipt 読み出しは既存 seam(`parseMirrorStateDocument` → `MirrorStateSnapshot.receipts`)、status 語彙は `classifyReceipt`(amadeus-mirror-policy.ts)準拠で `succeeded` のみ成功。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: import 追加+拒否条件を `(answer === "create" && !createRan)` へ置換。`--instance` は照合しない(FR-3c)。receipt 不在の report create は拒否維持(FR-3b)。sync/skip は未変更(FR-3d)。
- 配布面: dist 7ハーネス+self-install 5ツリーの同2ファイルを再生成(計28ファイル)。

## テスト(FR-3 受け入れ基準との対応)

- 基準1(Red→Green): t265 integration に in-process `handleReport` 駆動の受理ケース(create receipt succeeded → `print`+receipt completed 記録)を先行追加、Red exit 1 → Green exit 0 実測。
- 基準2(2ケース分離): 拒否ケース(receipt `attempted` = 未 succeeded → `error`+state バイト不変)を追加。既存 "unoffered create"(Issue あり・receipt 無し)は拒否のまま意図コメントで固定。
- 基準3・4: t265 grid assert・sync 正常系・t371(#1791 初回 create 経路)グリーン維持(`Ran 94 tests across 2 files` 照合)。
- fixture は mirror block の parse 妥当性を自己 assert し、invalid block 由来の偽 green を構造的に封鎖。

## 検証(すべて最終変更後・個別直書き・exit code 実測)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / t265+t371 0 / mirror 隣接5スイート 0 / complexity 0 / coverage patch 0(追加測定9行 covered 9・uncovered 0・allowlist 追加なし) / フル coverage:ci 0(RESULT: PASS)。初回フル CI の赤3本(t259 性能比・codex-resume timeout・tla-skeleton identity)は単独再実行 exit 0+mirror 非参照 grep 0件で負荷起因フレークと帰属(assertion 実文確認済み)。

## 同根棚卸し

`hasMirrorIssue`/`mirrorIssueNumberFromDocument` 全参照を棚卸し — 自己矛盾同型は他に無し(残参照は create 実行前の `next` 側評価)。docs 同期対象なし(grep 0件)。
