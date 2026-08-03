# Code Summary — u2-installer-asset

## 実装結果

- `ASSET_INTRO_VERSION = "0.1.8"` を単一定数として追加した。現行package/tagの `0.1.7` / `v0.1.7` に対する次patchであり、`0.1.8-beta.1` は境界未満、`0.1.8` 以上はasset必須となるSemVer順序をテストで固定した。
- `ResolvedVersion.archiveSource()` を判別union化した。旧版は従来のcodeload URLをbyte不変で返し、新版は `amadeus-dist-v<version>.tar.gz` と同Releaseの`SHA256SUMS` URLを返す。
- Fetcherは新版でarchiveとchecksumを各1回取得し、一時file上のarchiveをstreaming SHA-256で照合してから展開する。期待tar名はSHA256SUMS内のexact 1行だけを認め、malformed、対象欠落、duplicate、不一致を展開前に拒否する。
- asset 404、checksum 404、checksum不一致をそれぞれ `asset-missing`、`checksum-unavailable`、`checksum-mismatch` の非transient typed errorとして追加した。すべてcodeloadへfallbackしない。
- payload locateを `wrapper/dist/<harness>` → `wrapper/<harness>` の2段へ拡張した。`dist` が存在するのにdirectoryでない場合や、対応harnessが0件の場合はfail closedとした。
- HTTP allowlistを既存2 hostへ `github.com` / `release-assets.githubusercontent.com` を加えたexact 4 hostへ拡張した。初回URL・redirectの両方でHTTPSを要求し、HTTP downgradeは接続前に拒否する。
- u1の`buildDistAssets`を直接利用するintegration testを追加し、正規tarとSHA256SUMSから代表harnessを取得できることを実証した。既存install/upgrade integrationのfake HTTPも新版checksum契約へ再接地した。

## TDD実測

| Slice | RED | GREEN |
|---|---|---|
| 版境界 | `archiveSource is not a function` 3件 | 8 pass / 0 fail |
| asset取得 | checksum取得・root locate未実装で1件失敗 | archive + SHA256SUMS + root harness成功 |
| asset欠落 | expected `asset-missing`, received `http` | typed error + request 1回 +無fallback |
| checksum欠落 | expected `checksum-unavailable`, received `http` | 展開前停止 |
| checksum不一致 | expected `checksum-mismatch`, received `payload-invalid` | 専用typed error +展開前停止 |
| host境界 | `github.com` 起点を拒否 | exact 2 host redirect成功 |
| HTTPS境界 | HTTP redirect先へ5回接続 | redirect先へ接続せず停止 |
| locate安全性 | fileである`dist`を無視してrootへfallback | `ENOTDIR`をfail closed |

## 検証結果

| 区分 | コマンド | 結果 |
|---|---|---|
| Focused | `bun test tests/unit/setup-fetcher.test.ts tests/unit/setup-http.test.ts tests/unit/setup-resolved-version.test.ts tests/integration/setup-release-asset-fetch.test.ts` | 33 pass / 0 fail（最終追加後） |
| setup回帰 | `bun test tests/unit/setup-*.test.ts tests/integration/setup-*.test.ts` | 325 pass / 0 fail / 3395 expect |
| TypeScript | `bun run typecheck` | exit 0 |
| Full lint | `bun run lint` | exit 0。既存baseline由来392 warnings / 23 infos |
| Changed-file lint | `bunx @biomejs/biome check <変更16ファイル>` | exit 0、診断0（Fetcher complexityを分割後） |
| Coverage registry | `bun tests/gen-coverage-registry.ts --check` | exit 0、fresh / guards green / ratchet held |
| Package drift | `bun scripts/package.ts --check` | exit 0、7 harness全件OK |
| Promote drift | `bun run promote:self:check` | exit 0、5 self-install face全件OK |
| Diff | `git diff --check` | exit 0 |

初回のsetup回帰では、既存1.x/2.x fixtureが新版なのにarchive byte列を`SHA256SUMS`応答として返す古い前提により13件失敗した。productionを緩めず、fixtureへu1互換checksum応答を追加し、該当3 files 17/17 Greenと全setup 325/325 Greenを確認した。

## 設計整合と残課題

- 機能上の設計逸脱はない。checksumは転送破損検出、改竄耐性はHTTPS + exact host allowlistというADR-A9の役割分担を維持した。
- `gh release view v0.1.7 --repo amadeus-dlc/amadeus --json assets` はasset 0件だった。自リポ実assetの `github.com → release-assets.githubusercontent.com` redirect再実測と、draft/prereleaseからの実installは、u1 assetを外部Releaseへ添付する人間承認後にBolt 1 E2Eとして実施する必要がある。
- `dist/`、state、audit shardは変更・stage・commitしていない。
