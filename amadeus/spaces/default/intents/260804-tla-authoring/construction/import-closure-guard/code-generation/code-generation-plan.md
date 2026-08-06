# Code Generation Plan — U6 import-closure-guard(バッチ 1)

上流入力(consumes 全数): U6 の nfr-design(security-design.md)、`component-methods.md` §C8、`decisions.md` ADR-4、`unit-of-work.md` U6 定義、`requirements.md` FR-011/NFR-005/NFR-006。

## 実装ステップ(TDD vertical slice)

1. pure guard: `resolveImportClosure(entrypoints, readFile)`(相対 import の再帰閉包、POSIX 正規化 + repo ルート境界判定、unreadable 全数列挙)+ `checkManifestClosure`(missingFromManifest / missingFromOwnedPaths)— 失敗テスト先行(t440/t441)
2. FS アダプタ: symlink の realpath 解決を注入 readFile 実装が所有(境界外 → null → unreadable)— nfr-design の 2 層責務確定どおり
3. projection 組込: `scripts/plugin-projection.ts` で closure failure → build fail-closed 停止(欠落全数列挙)— integration(t442)、symlink 脱出 fixture(t443)
4. manifest 修復: plugin.json へ `tla-model-receipt.ts` / `tla-module-deps.ts` を登録(関連エントリ隣挿入)。落ちる実証: 修復前欠落 red → 修復後 green、module 除去 → 赤(注入 → 実測 → 復元 1 セット)
5. 検証: typecheck / lint / full CI + `bun run build` 再現性

## 品質規約

例外機構(allowlist / skip)を持たない fail-closed 設計。bare specifier は閉包対象外。
