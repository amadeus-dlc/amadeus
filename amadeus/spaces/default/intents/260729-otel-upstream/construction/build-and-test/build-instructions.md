# ビルド手順(build-instructions)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 全 unit の `construction/*/code-generation/` 配下2成果物を § 対象と検証コマンドの導出元として参照した。

## 前提

- **bun**(1.3.13 で実測)のみ。Node/npm 不要、runtime dependency 追加なし(Bun-only 前提)
- 依存導入: `bun install`(lockfile: `bun.lock`)

## ビルド(生成物同期)

本リポジトリのビルドは「dist / self-install ツリーの再生成」である(code-summary.md 各 unit の配布面契約):

```
bun scripts/package.ts        # dist/<harness> 7ツリー再生成
bun run promote:self          # プロジェクトローカル self-install 同期
```

## 検証(ドリフトガード)

```
bun run typecheck             # tsc --noEmit ×2 tsconfig
bun run lint                  # Biome(formatter 無効)
bun run dist:check            # dist 7ツリー一致
bun run promote:self:check    # self-install 一致
```

## トラブルシュート

- `dist:check` DIFFERS → 正本(`packages/framework/core|harness`)を編集し再生成する。dist 直編集は禁止
- kiro/kiro-ide の DIFFERS → 7ハーネス全再生成が必要(bt-dist-regen-seven-harnesses)

## 実測

着地コミット `5d912e0dd` にて上記4検証すべて exit 0(build-test-results.md 参照)。
