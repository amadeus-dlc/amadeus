# Intent Statement — 260706-installer-versioning（Issue #543）

上流入力: record の audit shard にある user project description（Intake）、[Issue #543](https://github.com/amadeus-dlc/amadeus/issues/543)

## 目的（問題）

インストーラ（#451、`scripts/amadeus-install.ts`）は状態収束型で、バージョン概念と導入先カスタマイズの検出を持たない。
現状の更新（再実行）は全置換であり、導入先でファイルが改変されていても無言で上書きする。
配布契約上エンジンと amadeus* skills は改変しない前提だが、実利用ではカスタマイズが発生しうるため、無言上書きによる利用者の変更喪失を防ぐ必要がある（Maintainer 指示、2026-07-06）。

## 対象

- 一次対象: Amadeus を自分の workspace へ導入・更新する利用者（インストーラの実行者）。
- 二次対象: 配布物を保守する Maintainer と開発チーム（版の判別と更新戦略の運用）。

## 成功条件（観測可能）

1. 導入先で「どの版が入っているか」を 1 コマンドで確認できる。
2. 未改変ファイルの更新は従来どおり収束し、改変済みファイルは無言で上書きされない（選定した戦略が適用され、eval で検証されている）。
3. 更新の非対話 1 コマンド性（#451 grilling 確定 4）と冪等性（確定 5）を維持する。
4. README（英日）に更新戦略が文書化されている。

## 契機

- Maintainer 指示（2026-07-06）。実利用でのカスタマイズ発生に先回りするための導入。
- #451 のインストーラ本体が merge 済みで、更新戦略を載せる土台が存在する。

## 範囲

- 対象: `scripts/amadeus-install.ts`、`dev-scripts/evals/installer/check.ts`、README（英日）、必要な manifest 形式の新設。
- 設計論点（バージョン表現、ハッシュアルゴリズム、3-way 判定、改変時戦略、BR-13 整合、適用範囲）は Ideation の questions + 全メンバー同報ピア協議で確定する。
- 対象外: 配布契約そのものの改定（必要になった場合は人間へ個別エスカレーション）。amadeus/（旧 aidlc/）不可侵の原則は維持する。
- 順序制約: Construction（コード変更）は #573 の merge 後に開始する。
