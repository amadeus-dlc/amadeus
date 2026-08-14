# Application Design 質問(260814-plugins-rename-drift)

> requirements.md の Open Questions 7 件(Issue が「設計段で確定」と明記した裁定事項)を、機構 spike の実測(下記の根拠)に基づき裁定する。semi autonomy 有効のため `amadeus-bolt decide-question` の五段梯子で裁定し、裁定 id を承認証跡に記録する(cid:scope-definition:c1-semi-ladder-routing)。予算 8 問中 7 問使用。
>
> spike 実測(読み取り専用調査、observed = cd64486a6): stages:[] + sensors + seams の合成形状は現行コードで構造的に処理可能(parse 5 面が独立 `amadeus-plugin-compose.ts:345-351`、seam 検証はホスト core ステージのみ参照 `:547-561`、投影はディレクトリ全 walk `scripts/plugin-projection.ts:178-196`、stages:[] の composed 前例 = coverage-patch-quick)。ただし t341 conformance e2e は fixture 固定(formal-model-check)で新形状は被覆外。プラグインは core を import できない(ADR-6 + `scripts/import-closure-guard.ts` fail-closed)。config キー追加は registry 1 エントリ+parse 関数+docs 2 本(t432 が逐語一致を強制)。

## Q1. FR-REN-7: scope-bindings 移行の方式

A. 本リポジトリの `amadeus/config.json` を改名 PR で同期し、scope-grid の不変を落ちる実証付きテストで検証する(config 未同期ならステージが全スコープ行から脱落して赤くなるテスト)。恒久の外側キー fail-closed 検証は #2996 明記どおりスコープ外(別 Issue 候補)。(推奨)
B. 恒久の fail-closed 検証(compile/doctor)も本 intent で実装する
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q2. FR-REN-8: フィクスチャ名の追随可否

A. `tests/fixtures/pr-convergence/` は**維持**(不変のステージ slug `pr-convergence` に整合する名前であり、パス述語 `plugins/pr-convergence` に構造的に非該当。README 内のパス文字列参照のみ更新)。`t445:52` の `PLUGIN = "pr-convergence"` は**追随必須**(実プラグイン名軸 — 更新しないとテストが構造的に赤化)。残存参照検査の除外リストに fixtures ディレクトリ名を理由付きで記載。(推奨)
B. fixtures ディレクトリも `github-pr-convergence` へ改名する
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q3. FR-SET-5: env 宣言スキーマの先行着地可否

A. **先送り**。git-drift は機密を要さず実消費者が本 intent に存在しない。inception ガードレール「外部契約の先行着地禁止 — 実装+配線が同一 intent に揃う場合のみ導入」に従い、最初の `github-*` 系実消費者の intent で導入する。settings 側の機密キー名パターン拒否(FR-SET-3)は本 intent で実装。(推奨)
B. 宣言スキーマの定義・検証まで先行して入れる
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q4. FR-DRIFT-1: seams 注入先ステージ

A. `code-generation` と `build-and-test` の両方の sensors seam へ注入(Construction の長時間作業帯全体をカバー。pr-convergence の code-generation 注入前例と同機構、WRITABLE_SEAMS は sensors を許可)。(推奨)
B. code-generation のみ
C. 全 Construction ステージ
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q5. FR-DRIFT-4: 配送機構 — センサー方式 vs advisories 宣言機構

A. **センサー方式**。advisories 機構はステージ境界での hold + 人間選択(run-now/defer)の機構であり、作業中の受動的早期警告という要件に不適合。センサーは PostToolUse 発火 + advisory severity で audit 記録も残る。(推奨)
B. advisories 宣言機構
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q6. FR-DRIFT-6: 配布経路

A. 既存 3 プラグインと同一: `plugins/` オーサリングディレクトリ + `dist/plugins/git-drift/` ハーネス中立バンドルとして出荷し、workspace は `plugin.activation.names` で opt-in。本 workspace は改名後の names へ `git-drift` を追加して有効化。stage-less のため `plugin.scope-bindings` エントリは不要。(推奨)
B. フレームワーク標準(全ユーザー既定有効)
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## Q7. 設定値のプラグインへの受け渡し経路(FR-SET-2/FR-DRIFT-2 の接続面)

A. **core 解決・引数渡し**: core の `amadeus-sensor.ts fire` ディスパッチャが plugin.json スキーマ(デフォルト)+ `plugin.settings.*`(project → space → intent 階層)を fail-closed で解決し、センサー起動時に引数として渡す。プラグインは core を import できない(ADR-6 / import-closure-guard)ため、プラグイン側での config 再パース(検証の二重実装)を避ける。(推奨)
B. プラグインが `amadeus/config.json` を自前 fs 読取(検証の二重実装)
C. プラグインが core CLI ツールを spawn して設定値を受け取る
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 承認証跡参照)

## 承認証跡

- semi 梯子裁定(承認): 2026-08-14T08:20:00Z — Q1=A `auto-decision-40995e1cfb91f99ac9705ac509ecd70a` / Q2=A `auto-decision-ce3b45e18f82442a8cff3f810ae6255a` / Q3=A `auto-decision-53d67d536f2a97751a7b65c765912444` / Q4=A `auto-decision-aad3e87bdf0e13b970f0aea1a694f1e0` / Q5=A `auto-decision-bea777c5852848ff1c6f17c512e16a1e` / Q6=A `auto-decision-b7b937c6e16068f3d31f10a640666aa0` / Q7=A `auto-decision-df738f326639484b4a7d6c8c0b43cd54`(いずれも decider=agent-recommendation、unreviewed キュー入り。INTENT_AUTONOMY_TRANSACTION_COMMITTED が一次記録)
