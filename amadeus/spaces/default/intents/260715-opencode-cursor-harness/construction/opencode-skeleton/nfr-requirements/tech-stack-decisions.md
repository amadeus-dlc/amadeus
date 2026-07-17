# Tech Stack Decisions — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(NFR「別 OS」)、application-design の decisions.md(ADR-1/ADR-4)、team-practices(Code Style 変更なし)。

## 決定

- TS-U1-1: TypeScript/ESM + Bun 直接実行(既存スタックそのまま — 新規依存ゼロ。runtime dependency 追加は Forbidden)
- TS-U1-2: パス結合は node:path(join)のみ — 文字列連結によるパス構築禁止(別 OS 対応、requirements NFR チェックリスト)
- TS-U1-3: Bun 実装差の既知パターンを実装時に適用 — readFileSync(dir) の macOS/Linux 実装差(EISDIR throw/空文字返却)を踏まえ、テスト注入はポータブルな ENOENT(不在パス)で行う、spawn の env 明示(bun-readfilesync-dir-platform-divergence / bun-spawn-env-snapshot)
- TS-U1-4: functional-domain-modeling-ts は「新規ドメイン型を作らない」判断側で適用(domain-entities の既決 — 過剰ラップ回避)
- TS-U1-5: lint は Biome(フォーマッタ無効)、型検査 tsc --noEmit — 実行ビット不要(project.md 既決の適用)

## 代替検討

新規スタック要素は導入しないため代替比較は N/A(唯一の判断は TS-U1-4 で、代替=ラッパー型導入は domain-entities.md の Alternatives 相当節で棄却済み)。
