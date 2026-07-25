# セキュリティテスト手順 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

## 攻撃面の棚卸し

本 intent はネットワーク境界・認証・シークレットを一切触らない。新たに導入した外部入力も無い。したがって一般的な脆弱性スキャンの追加対象は無い。

`project.md` の `cid:build-and-test:c3-doctor-seam` に従い、成果物で実測明記した攻撃面に対してのみ検査を比例選定する。

## 本 intent 固有の安全性リスク

唯一かつ最大のリスクは **U2 のロールバックによる誤削除**である。並列化に伴い進捗台帳（`CREATED_MEMBERS`）を廃止し、削除対象を観測から再導出するように変えたため、対象集合を誤ると他人の作業ツリーを消しうる。

### 検査

`t295` が3層限定を検証する。

| 層 | 限定 | 検査 |
|---|---|---|
| 起点 | `RUN_ROOT` の直下のみ | 他ディレクトリを歩かない |
| 名前 | `members_for` の集合に含まれる名前のみ | 無関係な worktree のブランチが保持されることを確認 |
| 深さ | 直下の子のみ（再帰しない） | 孫階層へ降りない |

### 依存監査

`cid:build-and-test:c1-doctor-seam` に従い、対象変更のセキュリティ回帰とリポジトリ全体の依存監査を別判定とする。本 intent は依存を追加・更新していないため、既存 advisory があってもそれは本変更の範囲外であり、別作業として扱う。
