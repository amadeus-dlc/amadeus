# Services: PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、architecture、component-inventory

測定 ref: observed = origin/main `8409c2039c52`

## サービス(実行時の協調単位)

本 intent は常駐サービスを持たない(CLI/ファイル境界の決定的実行 — cid:nfr-design:c1 の CLI 原則)。「サービス」は次の3つの実行時協調フローとして定義する。

### S1: install / uninstall フロー(compose / drop)

1. `amadeus-plugin.ts compose pr-convergence` → manifest parse(C9)→ host snapshot(C1 の実 frontmatter parse で code-generation を HostStage として認識)→ seam plan(produces overlay)→ TrustGrant digest → apply(C2: frontmatter 書換え+seam 台帳記録)→ recompile → runner 再生成
2. drop は台帳から逆適用(C2 既存の `rebuildStageSeams`)→ FS 実測復元検査(既存 `pluginArtifactsAbsent` + 空親ディレクトリ検査)→ recompile
3. 失敗時 rollback は既存 `createPluginInstallSnapshot` に相乗り

### S2: Bolt 内の収束ループ(conductor が工程断片 C7 に従い駆動)

1. 工程(0): `gh pr view --json mergeable,mergeStateStatus`(C5 status 経由)で競合解消を先行
2. 工程(1)-(2): PR 作成後、C5 status が C4 台帳+C3 述語で checks+reviewThreads 全数を評価
3. 工程(3): トリアージ基準による処分(本 PR 修正 / Issue 化 / 却下+resolve)— 人間承認境界(リモート書込み前)は Guardrail が保持
4. 工程(4): push ごとに C5 status 再実行(bot 再指摘の再取得)
5. 工程(5): 収束成立 → C5 report がレポート機械生成 → `unitCovered`(C10)が次の engine next で通過 → 収束通知は機械集計値
6. 不成立のまま GitHub 不達 → conductor は engine park(既定)。人間が override を裁定した場合のみ C5 override(ADR-3)

### S3: 検証フロー(NFR-1〜3 の対実証)

1. install 済み fixture workspace: compose 後 compiled graph の code-generation produces に `pr-convergence-report` が実在 → レポート1件削除 → engine next が同 batch を再発出(落ちる実証)
2. 未 install fixture: produces 不変の byte 照合
3. `replied-unresolved` fixture で C3 述語が赤(不成立)
4. C4 の GraphQL fixture(実測から採取)でページング・bot 判定・severity・終端処理を固定

## 障害モードと回復

| 障害 | 検出 | 挙動 |
|---|---|---|
| gh 不在/未認証 | C5 実行時の readiness 検査 | exit 2 loud fail(FR-4b)→ conductor は park 既定(FR-7a) |
| GraphQL rate limit / API 障害 | C4 の typed error | 同上(空台帳を作らない) |
| mergeable UNKNOWN 継続 | C3 retry 上限(ADR-4) | 不成立確定 → 工程(4)の次周期へ(busy-wait しない) |
| レポート手書き偽装 | C8 センサー(様式検査)+レビュー観点 | advisory 可視化+§12a で差し戻し(A-3) |
