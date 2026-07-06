# Build vs Buy — 260706-installer-versioning（Issue #543）

上流入力: [competitive-analysis.md](competitive-analysis.md)

## 判断

**Build（インストーラ自身に実装する）** を採る。

## 理由

1. 既存パッケージマネージャ（dpkg / rpm / pacman / Homebrew）は OS・配布基盤に結び付いており、「git リポジトリから任意 workspace へ skill 群をコピーする」本配布形態には適用できない。
2. インストーラは Bun + TypeScript の単一スクリプト（scripts/amadeus-install.ts、#451）として確立済みで、MANIFEST export・ハッシュ計算（repo に md5 / sha256 の実装慣行あり）・JSON 書き出しはいずれも標準 API で足りる。外部依存の追加は #451 確定（オフライン動作）に反する。
3. 買う（依存する）価値があるのは「戦略の設計」だけであり、それは先行事例の型（competitive-analysis.md）を借用することで既に得ている。

## 借用するもの

- 3-way 判定表（dpkg の一般形）。
- 改変時戦略の型（rpmnew 併置型 / rpmsave 退避型）。
- 導入先 manifest = ハッシュ DB の単一ファイル化（lockfile 文化）。
