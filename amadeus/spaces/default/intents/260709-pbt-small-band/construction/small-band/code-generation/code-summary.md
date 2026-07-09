# Code Summary — pbt-small-band(code-generation 3.5)

> 上流: requirements.md(FR-1〜5)/ functional-design のプロパティカタログを実装した結果。

## 実装結果(4 Bolt、全てマージ済み)

| Bolt | PR | 内容 | レビュー往復 |
|---|---|---|---|
| B1 | #722 | fast-check ^4.9.0(root devDeps のみ)+ semver/version-spec PBT(P-SV1〜4)+ PBT 規約 canonical 定義(seed 6187376 / numRuns 100 / AMADEUS_PBT_DEEP=1 で 50k) | READY 一発(CI は setup-pack-contract フレーク1回 → re-run green) |
| B2 | #726 | manifest roundtrip + duplicate-path(P-MF1/2) | 1回: P-MF1 が emitted JSON 自己整合で値写像破壊を検出できず(codex-1 が変異実測で証明)→ 入力アンカー型へ強化、変異検出を双方で実証 |
| B3 | #724 | plan.ts 純判定 seam export(挙動不変 +17/-3)+ P-PL1/PL2 + BR-I* コメント | READY 一発(codex-2 が変異再現) |
| B4 | #725 | audit escape/unescape 純関数抽出(コア波及: core+dist4+self2 同期)+ 条件付き roundtrip P-AE1 + 一行不変条件 P-AE2 + t205 実経路シームテスト | 2回: (1) P-AE2 テスト名が lone CR 許容と不一致 → 名称修正 (2) codecov/patch — 読み側呼出行(CLI 経由のみ)が in-process 未カバー → handleAppendRaw 最小シーム化+t205(medium 分離、test-size-drift 赤を実測して判断) |

## 品質エビデンス(全 Bolt 共通で実測)

- 赤先行の変異注入実証(コミット非含有)+ 固定 seed の決定的再現(B1 で seed/path/counterexample の2回連続一致)
- typecheck / lint / dist:check / promote:self:check / run-tests --unit / gen-coverage-registry --check 全 exit 0
- conductor 独立検証(全 Bolt): テスト再実行+主要チェック再実行、B2 は変異注入まで独立再現

## 学び(diary 詳細)

- プロパティは実装と逐条照合してから書く(functional-design iter1 の Critical、B4 の条件付き roundtrip、B2 の入力アンカー) — 「成り立たない法則」「検出力のない法則」の両方を排除
- Small 純度は test-size-drift ガードが機械執行する — FS 統合ケースは medium の別ファイルへ分離(B4 t205)
- codecov/patch は「新規行の in-process 到達」を強制する — CLI 専用経路は最小シーム export で到達可能にする(#715 知見の再適用)

## Small band への寄与

新規 Small テスト4ファイル(semver/manifest/plan-decisions は small、t204 small + t205 medium)。Small≥90 は milestone であり本 intent の hard gate ではない(達成度は build-and-test で実測報告)。
