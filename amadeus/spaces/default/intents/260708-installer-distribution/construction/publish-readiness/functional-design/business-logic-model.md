# Business Logic Model — publish-readiness

> ステージ: functional-design (3.1) / Unit: publish-readiness / 作成: 2026-07-08
> 上流入力: `../../../inception/units-generation/unit-of-work.md`(U4)、`../../../inception/requirements-analysis/requirements.md`(FR-001/015/017/018)、`../../../inception/application-design/decisions.md`(ADR-002/003)・`services.md`(npm レジストリは publish 時のみ)、`domain-entities.md`

## ワークフロー 1: pack 契約テスト(FR-018 — integration 層)

```
test "npm pack --dry-run はファイルリスト契約を満たす":
  raw = exec("npm pack --dry-run --json", cwd: packages/setup)   # 実ツール実行(シミュレーション禁止 — 是正事項 c4)
  report = PackReport.parse(raw)
  assert report.type == "ok"                                     # Result の正準形状で絞り込み
  verdict = PackContract.current().isSatisfiedBy(report.value)
  assert verdict.type == "satisfied"                             # missing / unexpected は詳細付きで失敗

test "package.json files は PackContract と同期している(ドリフトテスト — BR-P02)":
  filesField = readJson("packages/setup/package.json").files
  assert deepEqual(sorted(filesField), sorted(PackContract.current().declaredInFiles()))

test "契約違反を注入すると赤くなる(落ちる実証 — team.md Mandated)":
  # 実装時に1度、files フィールドから LICENSE を外した状態で上記テストが missing を検出することを実証し、
  # その記録を PR に残す(検証劇場の防止)。恒常テストとしては unexpected 検出(ソース .ts 混入)ケースを含める
```

- 実行層: `tests/integration/` に配置し `tests/run-tests.sh` の既存 CI プロファイルへ自動包含(新規 CI ジョブは作らない — 再利用棚卸し)
- 前提: ビルド済み `dist/cli.js` が存在すること — U1 提供の遅延ビルドヘルパー `tests/lib/setup-lazy-build.ts` の `ensureSetupCliBuilt()` で先行実行する(U1 infrastructure-design で確定した共有契約。U4 が独自のビルドロジックを持たない)

## ワークフロー 2: publish 手順書(FR-015 — docs 成果物の章立て)

手順書(配置: `docs/guide/publishing-setup.md`)は以下の章立てで書く:

1. **前提確認**: npm org `amadeus-dlc` スコープの確保(R1)、`vX.Y.Z` タグの実在(CON-007/ASM-006)、**npm アカウントの 2FA(auth-and-writes)有効化**(SEC-P02)
2. **バージョンバンプ**: `packages/setup/package.json` の独立 semver(FR-017)。バンプは publish する PR で実施
3. **ビルドと検証**: `bun build`(ADR-002)→ `bun run typecheck` / `lint` → pack 契約テストを含む CI プロファイル → **`AMADEUS_SETUP_E2E_NETWORK=1` を設定して実ネットワーク E2E を実行**し、codeload アーカイブ形状の前提(単一トップレベルラッパー — U2 infrastructure-design)が現行 GitHub と一致することを確認(この変数の設定者はリリース手順のみ — 未設定なら `test.skipIf` でスキップ)
4. **ローカル最終確認**: `npm pack --dry-run` の目視、`npm pack` tarball のローカルインストール検証(`bun link` 代替可)
5. **手動 publish**: `npm publish --access public`(安定版)/ `npm publish --tag next`(プレリリース `X.Y.Z-rc.N` — `latest` を汚さない)。**注記: 現状 provenance なし**(SEC-P03 — CI 公開へ移行する際の再検討ポイント)
6. **公開後検証**: `npx @amadeus-dlc/setup@<version> --help` の実行確認、npm ページのメタデータ(license/repository)確認
7. **ロールバック指針**: publish 後の不具合は deprecate+パッチ版(unpublish は原則不使用 — npm 規約)

## ワークフロー 3: メタデータ是正(FR-001、I1/I2)

```
packages/setup/package.json: license "(MIT OR Apache-2.0)" / repository.url https://github.com/amadeus-dlc/amadeus
                             / files: PackContract.declaredInFiles() とドリフトテストで同期 / bin: { "amadeus-setup": "dist/cli.js" }
root package.json:           license "MIT-0" → "(MIT OR Apache-2.0)" / repository.url 旧 awslabs → amadeus-dlc/amadeus(I1/I2 是正)
```

- **PR 分割とバンプの具体シーケンス(CON-006 との整合)**:
  1. **U4 の PR** = `packages/setup` のメタデータ+pack 契約テスト+ドリフトテスト+publish 手順書。framework のユーザー可視変更を含まないため CON-006 のバンプ対象外
  2. **root package.json の I1/I2 是正は U5 の PR に移管**する。U5 は README 刷新+CHANGELOG+framework 版バンプを行う「ユーザー可視 PR」であり(project.md Mandated: 同一コミットでバンプ)、root メタデータ是正はそこへ自然に同乗する。team.md の「複数ユニットを単一 PR に束ねない」とは矛盾しない(是正の実施 Unit を U5 に一本化するだけで、U4 の成果物には含めない)
  3. publish の実行自体は両 PR マージ後・タグ発行後の手動作業(手順書ワークフロー2)
