# Unit of Work — metrics 可視化(B1 後続)

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

## 編成方針

requirements.md FR-1〜FR-8 と application-design(components.md V-1〜V-7/R-1/C-1/T-1/T-2/D-1、component-methods.md のシグネチャ、component-dependency.md の DAG、decisions.md ADR-1〜5、services.md の外部境界)を、**単独で deployable な Bolt 境界**(units-generation:c1)で2 Unit に分割する。walking-skeleton(amadeus-feature = skeleton ON)の Bolt 1 は「ユーザーが index.html を開いてトレンドを見られる」end-to-end 価値を最小構成で出荷する。

## U1: visualize-skeleton(walking skeleton — end-to-end 最小スライス)

- **内容**: R-1(timeseries への formatValue export 昇格+numericValue 新設 — ADR-2)、V-1(CLI `--write`/usage、fail-closed データ集約 — FR-1/FR-2)、V-3/V-4/V-6(基本 HTML: コレクタ別チャート+表+SHA title+エスケープ — FR-3/FR-4 S1/S3)、T-1/T-2 の中核(純関数 unit+--write/fail-closed の integration、実データ sweep — AC-1/AC-4 の一部)
- **出荷価値**: `bun scripts/metrics-visualize.ts --write` → `metrics/index.html` をブラウザで開き全6系列のトレンドが見える(S1+S3)。単独マージ・単独リリース可能
- **見積り**: 約 350〜450 行(script 220〜280+timeseries +10〜15+tests 120〜160)
- **受け入れ**: AC-1(生成・全コレクタ出現)、AC-4 の fail-closed(壊れ・空 → zero-write exit 1)、AC-7(契約 grep)、AC-3 / S3(SHA title の実在 assert)

## U2: visualize-hardening(強調・ガード・CI・docs)

- **内容**: V-5(劣化強調 regressionClass — FR-4 S2)、V-7(サイズガード MAX_HTML_BYTES — FR-6、ADR-3 の serializeSnapshot ピンテスト込み)、`--check` ドリフトガード(FR-1/AC-5)、C-1(CI 同乗 — FR-5/AC-6)、D-1(docs 日英ペア — FR-8/AC-8)、T-1/T-2 の残余(強調両側実証・drift 落ちる実証・上限超過 — AC-2/AC-4 残・AC-5)
- **出荷価値**: 劣化が一目で分かる強調(S2)+CI で常に最新(S4)+ドリフト検査(S5)+利用手順
- **見積り**: 約 250〜380 行(script +60〜80+ci.yml +3〜4+tests 130〜190+docs 120〜200)
- **受け入れ**: AC-2(強調両側)、AC-4 残(上限超過)、AC-5(drift)、AC-6(CI)、AC-8(docs)

## 境界の検証(1 Unit = 1 Bolt = 1 PR)

- U1 は U2 なしで利用者価値(トレンド閲覧)を完結して出荷できる — 「検出と記録の片側だけ」型の非 deployable 境界ではない
- U2 は U1 の公開面(renderHtml / CLI)への追記であり、U1 マージ後に独立 PR で出荷できる
- 相互依存は U1 → U2 の一方向のみ(直列)。並行実装はしない(同一ファイル `scripts/metrics-visualize.ts` を触るため c6 交差判定により直列 — 並行化の利得もない規模)
