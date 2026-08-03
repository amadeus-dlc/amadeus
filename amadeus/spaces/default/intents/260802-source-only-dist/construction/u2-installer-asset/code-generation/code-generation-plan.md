# Code Generation Plan — u2-installer-asset

## 実装前提

- 変更種別は `self-feature`。対象は installer の配布元選択、checksum 検証、payload locate、HTTP trust boundary と直接対応するテストだけに限定する。
- `packages/setup/package.json` と最新 Git tag はともに `0.1.7` / `v0.1.7`。本変更を含む最初のリリースを次patchの `0.1.8` とし、`ASSET_INTRO_VERSION` は `0.1.8` に固定する。
- `>= 0.1.8` は Release Asset を必須とし、asset / `SHA256SUMS` の欠落、checksum 不一致、不正な checksum 書式では codeload へ降格しない。`< 0.1.8` は既存 codeload URL と1 requestの挙動を維持する。
- asset fixtureの統合検証は u1 の正本 `buildDistAssets` を直接呼び出して生成し、wrapper・tar・`SHA256SUMS` を別実装で模倣しない。
- `dist/` は手編集・再生成・stage対象にしない。state / audit shard は既存dirty差分のままcommit対象外に保つ。

## 実装手順

- [x] **Step 1 — 版境界のRed/Green**: `ResolvedVersion` の公開seamで `0.1.7`、`0.1.8`、`0.1.8-beta.1`、後続prereleaseを固定し、`ArchiveSource` 判別unionとasset/codeload URL生成を実装する。Trace: FR-2.1/2.2、BR-U2-1/5、ADR-A1。
- [x] **Step 2 — verified asset経路のRed/Green**: archiveと`SHA256SUMS`を一時領域へstreaming取得し、期待tar名のexact 1行とSHA-256を検証した後だけ展開する。Trace: FR-2.1/2.5、BR-U2-2/7、ADR-A9。
- [x] **Step 3 — fail-closed 3面のRed/Green**: asset 404、`SHA256SUMS` 404、checksum不一致を非transient typed errorへ写像し、展開前停止とcodeloadへの無降格を固定する。Trace: NFR-3、reliability-design、frontend-components。
- [x] **Step 4 — locate 2段fallbackのRed/Green**: 単一wrapper解決後に `wrapper/dist/<harness>`、次に `wrapper/<harness>` の2段だけを探索する。`dist` が存在するがdirectoryでない場合はfallbackせず停止する。Trace: BR-U2-3、ADR-A2、security-design。
- [x] **Step 5 — HTTP trust boundaryのRed/Green**: allowlistへ `github.com` と `release-assets.githubusercontent.com` を追加し、初回URLと各redirectで HTTPS + exact host を再検査する。wildcardとHTTP downgradeを許可しない。Trace: FR-2.3、BR-U2-4、ADR-A4。
- [x] **Step 6 — u1→u2統合点を閉じる**: `buildDistAssets` が生成した実tar/`SHA256SUMS`をfake HTTP境界からinstallerへ渡し、代表harnessをlocateできるintegration testを追加する。既存1.x integration fixtureにはu1互換`SHA256SUMS`応答を追加する。Trace: Slice 1、unit-of-work-dependency u1→u2。
- [x] **Step 7 — 回帰・品質guardを通す**: 全setup Unit/Integration、typecheck、lint、coverage registry、package/promote drift、`git diff --check`を実行する。変更ファイルのBiome警告は0件にする。
- [x] **Step 8 — 成果物とcommitを閉じる**: 実測結果、設計判断、未実施の外部draft Release E2Eを`code-summary.md`へ記録し、production/test/本成果物だけをpath指定stageしてConventional Commitを作る。

## Test Strategy

| 層 | seam | 主な検証 |
|---|---|---|
| Unit | `ResolvedVersion` | 境界未満、境界、境界prerelease、後続version、URL exact一致 |
| Unit | `Fetcher` | asset+checksum成功、404 2面、不一致、malformed/対象欠落/duplicate、展開前停止、旧版追加request 0 |
| Unit | `Http` | GitHub 2 hostのredirect、HTTP downgrade拒否、既存API/codeload非退行 |
| Integration | u1 `buildDistAssets` → u2 `createFetcher` | 正規asset形式とSHA256SUMSを消費し、wrapper直下のharnessをlocate |
| Regression | setup Unit/Integration全件 | install/upgrade/resolver/manifest/pack契約の維持 |
| Static / drift | TypeScript、Biome、coverage、package、promote | 型・規約・生成投影の非退行 |

## 外部検証境界

- `v0.1.7` Release はasset 0件であり、自リポ実assetのredirect先をread-onlyで再実測できない。
- draft/prereleaseへu1 assetを添付して実ネットワークinstallする検証は外部状態変更と人間承認を要するため、このdelegated Unitでは実行しない。Bolt 1のwalking skeleton出荷判定へ引き渡す。
