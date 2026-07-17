# Tech Stack Decisions — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)、application-design decisions.md(ADR-2/ADR-3)。

## 決定

- TS-U3-1: U1 の TS-U1-1〜5 を全継承。アダプタも Bun 直接実行 TS(依存ゼロ)
- TS-U3-2: .mdc エントリの frontmatter は Cursor 仕様(description/alwaysApply)のみ使用 — 独自フィールドを発明しない(外部仕様変動時の破損面を最小化、R-2)
- TS-U3-3: stdin parse は JSON.parse + 構造ガード(既習4点様式のうち読み面 — amadeus-lib の JSON ロード様式と同型、意味論照合は functional-design で実施済み)

## 代替検討

アダプタを既存 codex アダプタの共通化で実装する案は**棄却** — 2ハーネスの envelope 差(Codex=Bash 直piping / Cursor=写像表要)を1ファイルに同居させると分岐が増え、harness 固有物は各 harness dir に閉じる境界(C-T1)に反する。同型実装+意味論照合コメント(照合手法のノルム化は E-CS3 裁定済み・PR #1018 で persist 審議中 — マージ後は cid:application-design:citation-semantics-check 参照へ差し替え可)が正。
