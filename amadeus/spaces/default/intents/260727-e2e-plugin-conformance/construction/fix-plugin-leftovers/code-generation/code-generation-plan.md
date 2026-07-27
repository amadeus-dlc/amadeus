# Code Generation Plan(fix-plugin-leftovers)

上流入力(consumes 全数): requirements.md — FR-1〜FR-5 の合否基準を本 plan の Step へ 1:1 で trace する(units-generation は SKIP スコープのため unit 系 consumes は不在が正常)。

測定 ref: observed 0c4709102(worktree plugin-dev、ブランチ worktree-plugin-dev)。

## 実装順序(cid:code-generation:c2-2 — finding ごとに Red→Green、最後に横断 suite+distribution 同期)

### Step 1: FR-2(#1585)standalone doctor の canonical レンダラ統一
1. Red: 空ホスト standalone doctor の stdout 非空+「Plugins: 0 installed」行を assert するリグレッションテストを追加し、現行コードで赤を実測
2. Green: `amadeus-plugin.ts:591-593` を `doctorPluginRows`(`:534-536`)経由へ変更(統合 doctor `amadeus-utility.ts:2890` と同一レンダラ)
3. in-process seam でも検証(spawn 盲点回避)

### Step 2: FR-3(#1586)drop の FS 完全復元
1. Red: compose→drop 後のディレクトリ構造照合(plugin 所有空ディレクトリの不在)を assert するテストを追加し、現行コードで赤を実測
2. Green: `amadeus-plugin-compose.ts` の drop 適用(`:1154` 周辺)へ「compose が作成したディレクトリのうち drop 後に空になったものを除去」を実装(mkdir⇔rm の対称化。plugin 非所有の既存ディレクトリは触らない — 除去述語は強め)
3. `baselineRestored`(`amadeus-plugin.ts:377`)へ FS 実測(plugin 所有物の不在確認)を追加。`.amadeus-plugin-drops.json` の残存許容を契約文書(利用者可視 doc)へ明記
4. 2段階分割で新たに表現可能になる中間状態の点検(cid:code-generation:cg-split-opens-new-state)

### Step 3: FR-1(#1575)canonical 定数の一本化
1. `promote-self.ts:184` の誤名 `PACKAGE_HARNESSES` 定義を削除し `plugin-projection.ts` の `SELF_INSTALL_HARNESSES` を import
2. 消費側の同義ハードコード是正: `t-plugin-projection-packaging.test.ts:48`(7値)/ `:161`、`t209-promote-self-dangling-symlink.test.ts:152` を canonical import 参照または等価 assert へ
3. Red 相当: canonical export との集合等価 assert(再導入検知)を追加
4. `projections.ts` の `MIRROR_SURFACE_IDS` はスコープ外(requirements Out of Scope 宣言どおり触らない)

### Step 4: FR-4(#1589)plugin conformance E2E
`tests/e2e/t-plugin-conformance.serial.test.ts`(仮名、既存 serial 命名規約に整合)を新設。setup-install 系既習様式(オフライン・実バイナリ spawn・live gate なし):
1. temp workspace へ claude 面ホストを dist/ 由来で構築し、フィクスチャプラグイン(tests/fixtures/plugins/test-pro 系)を folder-drop
2. SessionStart auto-compose hook の実行経路で compose(CLI 直叩き代替は不合格 — hook スクリプトを実行)
3. 実 recompile(stub なし)→ composed stage が compiled graph に載ることを実測
4. intent birth(使い捨てワークスペース)→ engine `next --stage <plugin-stage>`(`--single` なし、opt-in reach = 正規経路)が run-stage directive を emit することを実測
5. doctor が installed/composed を報告
6. drop → FS 完全 baseline 復元(Step 2 の基準で照合)
7. 実行後残渣ゼロ assert(実リポジトリの plugins/ / dist/ / record 非汚染)

### Step 5: FR-5 CI ジョブ
1. `.github/workflows/ci.yml` へ PR blocking の専用ジョブ(plugin conformance E2E のみ実行)を追加。既存 `test:ci` 不変・既存ジョブと並行実行
2. 落ちる実証は別ブランチで注入→赤実測→revert(falling-proof-injection-one-set)

### Step 6: 横断検証と distribution 同期
1. core を触った場合: `bun scripts/package.ts`(7ハーネス全 dist)+`bun run promote:self`
2. `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`+新 E2E 直接実行
3. ローカル lcov で diff 追加行の未カバー 0 を実測(push 前)
4. E2E 実行時間の実測を記録(FR-5 合否3)

## 逸脱時の停止

要件・設計から逸脱する必要に気づいたら実装せず停止して conductor へ報告(既存様式への準拠と判断する場合も停止対象)。前提1(emit 配線)/前提2(hook 配布)の不成立検知も同様。

## Traceability

| Step | FR | Issue |
| --- | --- | --- |
| 1 | FR-2 | #1585 |
| 2 | FR-3 | #1586 |
| 3 | FR-1 | #1575 |
| 4 | FR-4 | #1589 |
| 5 | FR-5 | #1589 |
| 6 | Constraints/NFR | 全件 |
