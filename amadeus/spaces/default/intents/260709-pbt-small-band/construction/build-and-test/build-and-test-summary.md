# Build & Test Summary — pbt-small-band

## 結論

4/4 Bolt(#722 B1 / #726 B2 / #724 B3 / #725 B4)がレビュー READY・CI 全 green で main へマージされ、統合ツリーのフルスイート・PBT 深掘り(50k numRuns)とも **PASS**(build-test-results.md に実測値)。リグレッションなし。上流(code-generation-plan.md / code-summary.md)の計画どおり B1 先行→3並列で完遂。

## 確立したもの

- **PBT 基盤**: fast-check(devDeps)、固定 seed 6187376 / PR CI numRuns 100 / 深掘り 50k(AMADEUS_PBT_DEEP=1)、反例ピン留め規約(canonical: setup-semver.pbt.test.ts 冒頭)
- **プロパティ資産**: P-SV1-4(semver/version-spec)、P-MF1-2(manifest、入力アンカー型)、P-PL1-2(plan 決定表)、P-AE1-2(audit-escape、条件付き roundtrip)— 全て変異キル実証済み・非トートロジー
- **seam**: plan.ts 純判定3関数の export(挙動不変)、audit escape/unescape 対の抽出(コア波及、同期コミット)
- **副産物**: #731(workspace_requires ガードの帰属認識)の発見→修正 — 本 intent の approve 自体が修正後ガードの本番初実証となった

## 特記

レビューが実質的な欠陥を3件検出・是正させた(B2: 検出力ゼロの JSON 自己整合 → 入力アンカー化 / B4: テスト名と性質の不一致 + 読み側シーム未カバー / #733: 時間スコープの過剰帰属)— PBT の「法則は実装と逐条照合」規律がチームに定着した intent だった。
