# Code Summary — fix-1816-mirror-terminal-status

上流入力(consumes 全数): requirements.md — FR-4a〜4d+FR-4b'(裁定 E-OBB4-CG1)の充足状況を本書で対応付ける。

## 実装(PR #1823、branch bolt/fix-1816-mirror-terminal-status、commits a3e4bf173 + 6ecf6d50d)

- **FR-4a**: `amadeus-mirror-presentation.ts` の `## Status` 描画を completionInstance 存在時 `Completed` の導出描画へ(Phase/Stage 不変 — 裁定 Q2=A)。
- **FR-4b/4b'**: 導出を `mirrorSnapshotStatus` の**単一定義**へ引き上げ、sync writer(renderMirrorIssueContent)と drift check(buildMirrorStatusRecordView.currentStatus、`amadeus-mirror-lifecycle.ts`)が同じ canonical から読む形に統一(c1-drift-canonical-renderer)。これにより compareMirrorStatus の2面比較(body Status 節 / view.currentStatus)の write⇔check 対称性が回復し、completion 窓の偽 diverged を封鎖。追加は view フィールド導出限定・close 順序/状態機械は不変(裁定留保どおり)。
- **FR-4c**: t361 無改変・close 順序不変。仕様側(record 着地前 close)のノルム乖離は別 Issue 起票(conductor 実施)。
- **FR-4d**: lifecycle assert 未改訂。t281 既存2ケース期待値不変(新規ケース追加のみ)。

変更28ファイル: 正本2+新規テスト1(t374 integration)+t281 追加+allowlist+dist 14面+self-install 10面。

## テスト(受け入れ基準との対応)

- 基準1(Red→Green): t281 追加ケース Red(Expected Completed / Received Running)→ Green。FR-4b' は t374 integration で Red(currentStatus 面に限局する失敗 — expectedBody 側 assert 通過の裏付け付き)→ Green。**ネガティブコントロール**: 実 drift は依然 diverged を返すことを同時固定(導出が実 drift を覆い隠さない実証)。
- 基準2: t232/t281 既存 assert・t361(無改変)グリーン維持 — 宣言4スイート 53 pass(`Ran 53 tests across 4 files` 照合)。
- 基準3(allowlist): 機械 remap+全件直読照合を2回実施(端点素朴 remap が新規行を無言 waive する罠を検出し個別行写像で回避、測定可能行ゼロの分割片は STALE loud fail を受けて削除)。新設 mirrorSnapshotStatus の行はどの waiver にも不включ(patch gate: added 5 / covered 5 / uncovered 0 / **allowlisted 0**)。
- 基準4: 7ハーネス dist+self-install 同期(dist:check / promote:self:check 0)。

## 検証(個別直書き・exit code 実測)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / 宣言4スイート 0(53 pass)/ mirror unit 26f 625 pass / integration 23f 283 pass / complexity 0 new / **フル CI 674 files・9386 assertions・0 failed** / coverage registry 0 / patch gate PASS。PR: MERGEABLE/CLEAN・17 checks pass・thread 0(Bugbot 1件は実測エビデンス付きで解決)。

## 逸脱の記録

初版は比較の片側(body)だけを導出化 — compareMirrorStatus のスカラ面(currentStatus)の見落としを Bugbot 指摘の scratch 再現で確認し、**実装前停止 → 選挙 E-OBB4-CG1(案1 採用 2-0)→ 裁定準拠で実装**。symmetric-pair-review の write⇔check 非対称クラスの実例で、c1-narrow-fix-post-apply-remeasure が機能した事例。
