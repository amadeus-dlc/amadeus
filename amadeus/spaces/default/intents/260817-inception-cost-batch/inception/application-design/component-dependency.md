# Component Dependency — インセプション固定費バッチ(#3181 + #2415)

上流入力: `components.md`(C1〜C7)、`requirements.md`(制約: 共有ファイル直列化)。

## 依存マトリクス

| 依存元 \ 依存先 | C1 adapter | C2 verb | C3 path | C4 RA契約 | C5 RE契約 | C6 IC契約 | C7 tests |
|---|---|---|---|---|---|---|---|
| C1 adapter | — | | | | | | |
| C2 verb | 呼出 | — | 呼出 | | | | |
| C3 path | | | — | | | | |
| C4 RA契約 | | artifact 受動読取 | | — | | artifact 依存 | |
| C5 RE契約 | | artifact 受動読取 | | | — | artifact 依存 | |
| C6 IC契約 | | 手順参照(fetch 実行確認) | | | | — | |
| C7 tests | | 実行 | 参照 | 逐語照合 | 逐語照合 | | — |

- 「artifact 依存」= C6 が宣言する issue-evidence を consume(graph compile 上の依存)。「artifact 受動読取」= C2 の生成物を存在時に読むだけで、C2 の実行を指示・確認しない(fetch 実行確認の手順責務は C6 のみが持つ — component-methods.md と整合)。
- 「逐語照合」= C7 の drift 検査が契約 markdown の pathspec 逐語と `RE_SCAN_EXCLUDED_PATHSPECS` の一致を pin。
- 循環依存なし(C1←C2←C7 の一方向、契約群は artifact 宣言で疎結合)。

## 通信・データフロー

- 全て同期(CLI 実行と file read)。gh への通信は C1 に閉じる。
- データフロー: GitHub → C1(DTO parse)→ C2(様式化)→ issue-evidence.md → C4/C5 の stage 実行時 read。
- RE スキャン入力は「git 差分 − 除外クラス(C5 宣言)」。base 解決(re-scans 読取)はこのフローの外(除外の影響を受けない)。

## 共有資源と競合

- **U1/U2 の共有ファイル = C5(reverse-engineering.md)のみ**。触る節は異なる(U1: frontmatter consumes+Focus 導出 / U2: Step 2 走査対象+除外宣言)が、同一ファイルのため **Bolt 直列**(U1 → U2 の順、delivery-planning で固定)。
- 台帳同期(実装時の周辺義務): 契約変更は全ハーネス dist 再生成(NFR-3)。テスト新設は `tests/.coverage-registry.json` regen 同梱(bt-ledger 第3クラス)。`amadeus-utility.ts` / `amadeus-lib.ts` の行移動は `.coverage-patch-allowlist.json` の意味的セレクタ再アンカー。
- record 同梱 PR は `intents.json` で他 intent と構造的に競合 — 直列着地(serial-landing-rebase-shape)。
