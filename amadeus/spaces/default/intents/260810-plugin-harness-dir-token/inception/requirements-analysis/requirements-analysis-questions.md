# Requirements Analysis — 明確化質問

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: Minimal
Focus: [Issue #2790](https://github.com/amadeus-dlc/amadeus/issues/2790)（ミラー [#2799](https://github.com/amadeus-dlc/amadeus/issues/2799)）
観測 ref: observed = `df1c874cfb397fafe877a72f00a82664a59689ae`

回答方法は 2 通りあります。どちらでも構いません。

- **guided** — 対話で 1 問ずつ回答（推奨。回答は本ファイルへ書き戻します）
- **self-guided** — 本ファイルの `[Answer]:` を直接編集

`[Answer]:` タグが本ファイルの正本です。すべて埋まるまで次へ進みません。

## 回答の裁定・承認証跡（E-OC1）

Q1〜Q4 の回答は guided モードでユーザーが直接選択したものであり、E-code を伴う裁定プロセス経由ではない。
根拠は audit shard の実測 `HUMAN_TURN` イベントである（自己申告ではない）。

- **ユーザー承認**: `2026-08-10T05:30:34Z`（`<record>/audit/j5ik2o-mac-studio-lan-5938f5b3b224.jsonl` の `HUMAN_TURN`。
  直前の `HUMAN_TURN` `2026-08-10T05:27:01Z` は formal-model-check advisory の `defer-with-risk` 選択で本質問群とは別件）
- 選択内容: Q1=A / Q2=C / Q3=A / Q4=A（下記各 `[Answer]:` に逐語記録）
- 回答後の追加ラウンド: なし（曖昧語・矛盾の走査で該当 0 件）

---

## 前提となる実測事実（RE ステージの成果、すべて PROVEN）

配送路は 2 本あり、トークン置換器は片方にしかありません。

| 経路 | 実体 | 置換 | 出力先 |
|---|---|---|---|
| 経路A build-time packager | `plugin-projection.ts:262-278` → `harness-transform.ts:33-46` | **あり**（`.md` / `.md.example` のみ） | `dist/plugins/<name>/` (中立・逐語) と `dist/plugins/<name>/<harness>/` (導入バンドル・置換済み) |
| 経路B runtime compose | `amadeus-plugin.ts:676-688` `copyRealFiles` / `amadeus-plugin-compose.ts:381-412` | **なし**（byte-verbatim） | `<harnessDir>/plugins/<name>/` |

決定的な非対称（N-3）: self-install 5 面（`.claude/` `.codex/` `.cursor/` `.opencode/` `.kimi-code/`）は
`promote-self.ts:382` → `projectInTemporaryWorkspace`（`plugin-projection.ts:1019-1067`）経由で、
**build script の中から呼ばれていながら経路B に乗り、`transform()` を通らない**。
`:1031` が authoring `plugins/` を `cpSync` で逐語コピーし、`:1035` で compose を spawn するため。

一方で **consumer ホストは経路A の導入バンドル（置換済み）を受け取る**（`installDoc` が
`<harnessDir>/.amadeus-plugin-src/<name>/` への配置を指示、`plugin-projection.ts:620-664`）。
つまり素朴なトークン化で壊れるのは **self-install / dogfood 面のみ**で、consumer 面は正しく解決する。

その他の実測:

- N-1: `plugins/` 配下に `{{HARNESS_DIR}}` は **0 件**。dist 導入バンドル 8 面がソースと byte-identical（`diff -r`）→ 経路A の transform は plugin コーパスに対し**一度も発火していない**
- N-2: `dist/<harness>/<harnessDir>/plugins/` は 8 面すべてで**不在**（`buildHarnessTree` / `checkHarnessTree` の呼び出し元はテストのみ）
- N-4: `.codex/plugins/pr-convergence/stages/pr-convergence.md:180` に `.claude/tools/` が**現に存在**（5 面 × 2 場所 = 10 ファイル）
- N-6: `plugins/` を `t146-core-hygiene` の corpus に足した場合の偽陽性 = **0 件**（carve-out 追加不要）
- N-5: `t146` の `HARNESS_PATH_RE = /\.(claude|kiro|codex)\//` は 7 harnessDir 中 **3 個**しか覆わない（`.opencode` `.cursor` `.kimi-code` `.pi` が素通り）
- N-7: compose の staleness 判定はソース bytes の sha256（`amadeus-plugin-compose.ts:921-972`）→ compose 側に置換を入れるなら digest を置換前/後どちらで取るかが `t416` の決定性テストに直結
- 兄弟 12 行: 患部 `:180` は「ハーネスを固定した」形、他 11 行（`pr-convergence.md:54/:80/:162/:214`, `formal-model-check.md:48`, `tla-authoring.md:65/:68/:110/:113/:116`, `formal-model-check/README.md:111`）は `bun plugins/<name>/tools/…` と**ハーネス接頭辞を落とした**形。consumer では解決しない（DEDUCED、根拠は installDoc が root `plugins/` を作らせないこと）
- 生成物はすべて machine-local（`git ls-files` で `dist/` と self-install `plugins/` の追跡ファイル数 = **0**）

---

## Q1. 是正機構をどこに置くか（U-1 の裁定 — 本 intent の中核）

`self-fix` は設計段（application-design）を実行しないため、この裁定はここで確定させます。

- A. **`:180` をトークン化し、経路B の seeding 2 箇所を transform 経由へ寄せる** — `projectInTemporaryWorkspace:1031` の verbatim `cpSync` と、repo-root `plugins/` を直接ソースにする `collectPluginSources` の経路に置換を通す。consumer 面は経路A で既に正しいため、self-install / dogfood 面だけを塞ぐ最小手当て
- B. **`:180` をトークン化し、compose 本体（`amadeus-plugin-compose.ts:381-412`）に置換器を導入** — どのソース経路から来ても置換される。射程は最大だが N-7 の digest 設計判断が必須で `t416` の決定性テストに影響
- C. **トークンを使わず、composed 位置からの解決を規約化** — plugin prose で harness 相対パスを禁じ、`<harnessDir>/plugins/<name>/` からの相対で書く。置換器を一切増やさない
- D. **ソースは触らずドリフトガードのみ追加** — 患部は残る。再発防止だけ先に入れる
- X. Other (please specify)

[Answer]: A — トークン化し、経路B の seeding 2 箇所（projectInTemporaryWorkspace:1031 の verbatim cpSync と、repo-root plugins/ を直接ソースにする collectPluginSources 経路）を transform 経由へ寄せる。consumer 面は経路A で既に正しいため、self-install / dogfood 面のみを塞ぐ最小手当てとする。N-7 の digest 設計判断には触れない

## Q2. 兄弟 11 行（root-relative なツール参照）を本 intent の範囲に含めるか

- A. **含める** — 患部と同一機構で一括是正。Issue #2790 の記載範囲は超えるが、機構を入れるなら 12 行が同時に射程に入る（機構を入れなければ 12 行すべてが未解決のまま残る）
- B. **含めない** — #2790 の完了条件（`:180` のみ）を厳守し、11 行は別 Issue として起票する
- C. **調査だけ含め、修正は別 Issue** — 本 intent の requirements に所見として記録し、Issue 起票までを行う
- X. Other (please specify)

[Answer]: C — 兄弟 11 行は requirements に所見として記録し、別 Issue の起票までを本 intent で行う。修正は本 intent の範囲外（DEDUCED のままなので実測は別途必要）

## Q3. ドリフトガードの置き場と述語

- A. **`t146-core-hygiene` の corpus を `plugins/` へ拡張し、`HARNESS_PATH_RE` を 7 harnessDir 全部へ拡張** — 偽陽性 0 件を実測済み。ただしトークン下限テスト（core `.md` の 50 件超）と walk scope を分離する必要あり
- B. **`t377-plugin-boundary-guard` に第 2 述語を追加** — corpus は既に `["plugins"]` で正しく、fail-closed な allowlist 機構も持つ。述語だけが `scripts/` 限定
- C. **両方** — core 面（t146 の述語拡張）と plugin 面（t377 の述語追加）を別々に塞ぐ
- D. **ガードは今回入れない** — 修正のみ行う
- X. Other (please specify)

[Answer]: A — t146-core-hygiene の corpus を plugins/ へ拡張し、あわせて HARNESS_PATH_RE を 7 harnessDir 全部へ拡張して N-5 も塞ぐ。トークン下限テスト（core .md の 50 件超）と walk scope は分離する

## Q4. 完了条件（落ちる実証の範囲）

- A. **self-install 面 + consumer 導入バンドル面の両方で落ちる実証** — クロスレビュアー推奨。片方だけの green は他方の退行を隠すため
- B. **self-install 面のみ** — 現に壊れているのはこちらだけなので、実証もここに絞る
- C. **ユニットテストの red→green のみ** — 実ツリーの再生成は行わず、投影関数と compose 関数のレベルで固定する
- X. Other (please specify)

[Answer]: A — self-install 面と consumer 導入バンドル面の両方で落ちる実証を行う。片方だけの green は他方の退行を隠すため
