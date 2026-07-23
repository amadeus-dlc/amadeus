# Doctor In-Process Seam 差分スキャン

## スキャンメタデータ

- Issue: [#857](https://github.com/amadeus-dlc/amadeus/issues/857)
- Base: `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Observed: `abb5576d2fc162d69dd8ac8b87402e927609f279`
- Date: `2026-07-23`
- Focus: `handleDoctor` in-process seam and patch coverage

## 確定した観測

- `handleDoctor` は既に export されている。
- monkeypatch 型 in-process テストは6ファイル104ケース成功、LCOV 437/771行 hit である。旧「全行0」は失効した。
- spawn 契約 t37/t83/t210 は41ケース成功だが、LCOV 1/771行 hit である。spawn 盲点は存続する。
- `handleDoctor` はおよそ830–2200行の約1,371行、utility 全体は5,205行である。
- CI は Bun 1.3.13、TypeScript 6.0.3、Biome、lizard、dist/self-install、test、project coverage、patch coverage を含む。フレームワーク版は0.1.4である。

## 未解消の境界問題

- 正式な戻り値 seam がない。
- `process.exit`、stdout、env の monkeypatch がテスト間で重複する。
- `worktreeBaseDir → resolveMainCheckout` が session cwd に依存する。
- stage graph/harness の検査が env と cache に結合する。

## 維持する契約

stdout の診断と集計、終了コード0/1、audit 追記、stale lock cleanup、spawn CLI/cwd 契約を維持する。in-process seam の導入はこれらの外部挙動を変更しない。

## 推奨する最小境界

`runUtilityMain → 薄い CLI wrapper → doctor core → checks/dependencies` とする。全 check の純関数化は Issue #857 のスコープ外である。Functional Design では `runDoctor(): number` と `{ results, output, exitCode }` のどちらを正式契約にするか決定する。
