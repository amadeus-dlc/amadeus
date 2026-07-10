# Code Generation Plan — pbt-small-band

> 上流: inception/requirements-analysis/requirements.md(FR-1〜5、C-1)と construction/small-band/functional-design/(プロパティカタログ・seam 設計)を実装計画へ具体化。

## Bolt 編成と実行順

| Bolt | 内容 | ブランチ | 依存 |
|---|---|---|---|
| B1 | fast-check devDependency + 生成器規約 + semver/version-spec PBT(P-SV1〜4) | bolt/697-b1-fastcheck-semver | 先行(単独) |
| B2 | manifest roundtrip PBT(P-MF1/2) | bolt/697-b2-manifest-pbt | B1 マージ後 rebase |
| B3 | plan.ts 純判定 seam export + Small テスト(P-PL1/2) | bolt/697-b3-plan-seam | B1 マージ後 rebase |
| B4 | audit-escape 抽出 + PBT(P-AE1/2、コア波及: dist+promote 同期) | bolt/697-b4-audit-escape | B1 マージ後 rebase |

B1 が fast-check 依存を単独所有(重複追加禁止)。B2/B3/B4 は B1 マージ後に並列。coverage-registry 競合は B4 のみ(functional-design で実測確認)— 必要時は integrity-batch のマージランブック適用。

## 検証基準(全 Bolt 共通)

- 変異注入の落ちる実証(exit code 付き)— NFR-3 トートロジー禁止の判定
- typecheck / lint / dist:check / promote:self:check / run-tests --unit(B4 は --ci)全 exit 0
- in-process 実行(Corrections: bun --coverage spawn 非計測)で codecov/patch(新規行 100%)を満たす
- PR CI 時間増: 修正前後実測比較で +60 秒以内(FR-1.4、B1 で numRuns を逆算決定し他 Bolt が踏襲)

## 運用

worktree 隔離 fan-out(割当 worktree 外の git 操作禁止を毎回明示)、push は conductor 検分後、Bolt ごとに PR/スカッシュ、codex 直接レビュー(GitHub verdict コメント必須)、マージ人間承認。
