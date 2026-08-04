# ビルド手順 — Piハーネス正式対応

## 根拠と前提

全8 Unitの`code-generation-plan.md`と`code-summary.md`を入力とし、Bun 1.3.13以上、TypeScript 6、Pi Coding Agent 0.83.0以上を対象にする。常駐service、database、provider credentialはビルドに不要である。`dist/`は手編集せず、`packages/framework/core/`と`packages/framework/harness/pi/`から正規生成する。

## 依存関係と環境

1. repository rootで`mise trust`を実行する。
2. `bun install --frozen-lockfile`でlockfileどおりに依存関係を解決する。
3. live RPCを明示的に検証するときだけ、利用者管理のprovider設定と`AMADEUS_PI_RPC_LIVE=1`を使う。通常のビルド・決定的テストでは設定しない。
4. macOS/Linuxを正式対象とし、native Windowsはnegative compatibility結果を期待する。

## ビルドと検証コマンド

```bash
bun scripts/package.ts
bun scripts/package.ts --check
bun run typecheck
bun run lint
bun run promote:self:check
```

成功条件は、全8 harnessのpackage checkが一致し、TypeScript errorが0件、Biomeがexit 0、self-promotion driftが0件である。Biomeの既知complexity warningはexit 0のbaselineとして記録し、新規errorと区別する。

## トラブルシューティング

- `bun`が見つからない場合は、Bun 1.3.13以上がPATHにあることを確認する。
- package drift時は正規generatorを再実行し、authored sourceとの不一致を修正する。`dist/`を直接修正しない。
- cold compile timeoutは対象test fileを`bun test --timeout 120000 <file>`で単独再実行し、実failureと区別する。
- live providerが未設定ならtyped skipが正しい。formal greenへ昇格させない。
