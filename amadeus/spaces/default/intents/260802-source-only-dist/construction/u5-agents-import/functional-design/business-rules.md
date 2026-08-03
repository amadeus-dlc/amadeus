# Business Rules — u5-agents-import

上流入力(consumes 全数): requirements(FR-3.1/3.3)、component-methods(C4 契約)、components(C4)、unit-of-work(u5 = FR-3.1/3.3 対応)、unit-of-work-story-map(Slice 2)、services(外部依存なし)。

## ルール一覧

- **BR-U5-1(追跡ファイル不触)**: promote-self は AGENTS.md / CLAUDE.md(追跡ファイル)へ一切書き込まない。`composeRootAgents` と CLAUDE.md 合成の expected 登録(promote-self.ts:422-437)を撤去(NFR-2 の必要条件)
- **BR-U5-2(AGENTS.md の構成)**: 追跡 AGENTS.md = 手書き部 + import 行のみ。生成 suffix は未追跡 `.agents/rules/amadeus-codex-suffix.md` へ(build が生成)。切替 PR で「旧合成結果 = 新(手書き+import 解決後)」の意味的同等を diff 実証(一回限りの切替検証 — 以後の回帰保証は BR-U5-5 の import 行ピンへ委譲)
- **BR-U5-3(PROJECT_INSTRUCTIONS 正本移設)**: 定数(promote-self.ts:65-74)の正本を packages/framework/harness/claude/ 配下のデータへ移設し、スクリプト内ハードコードを解消(FR-3.3)
- **BR-U5-4(CLAUDE.md 凍結+整合テスト)**: **申告 — 本項は ADR-A6 / C4 の明示範囲(AGENTS.md)を超える拡張適用の設計判断である**。根拠: FR-3.1 の一般原則(build は追跡ファイルを書き換えない)から CLAUDE.md 合成(promote-self.ts:422-432)の撤去は必然導出であり、撤去後に正本(project-instructions)との乖離を検出する機構が無ければ fail-open になるため、ADR-A7 の整合テストパターンを**対象を CLAUDE.md に変えて**借用する(借用元との相違 = 対象が allowlist でなく指示ファイル、期待値が正本 byte 連結)。root CLAUDE.md は手書き正本として凍結し、core 正本+ `.claude/CLAUDE.md` との構成一致を整合テストで強制(落ちる実証: 故意の1行乖離で赤)
- **BR-U5-5(import 行の固定)**: AGENTS.md の import 行集合(amadeus.md / amadeus-codex-suffix.md)は整合テストでピン(欠落・重複とも赤)
- **BR-U5-6a(u6 との交差 — upstream 訂正の申告)**: u6 は `preserved`(promote-self.ts:101-114)を、本 Unit は :65-99 / :422-437 を編集する — unit-of-work.md の「u3〜u7 相互独立」宣言は本件で**同一ファイル交差の見落とし**であり、FD 段の実測で訂正する(申告 — delivery-planning の bolt-plan は既に Bolt 4(u6)→ Bolt 5(u5)の直列化を採用済みで実運用と整合)。c6 直列化(u6 先行 → 本 Unit は着地後に実 diff で再接地)を維持する
- **BR-U5-6b(u8 との交差 — unit-of-work.md の明示要求)**: u8(C8)は promote-self の `--check` 意味論を変更する。本 Unit と同一ファイルだが、DAG 上 u8 は u2〜u7 全完了後のため実行順で自然に直列化される — それでも着手時に c6 非交差判定(先行着地分の実 diff 確認)を行う

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U5-1 | FR-3.1(build は追跡ファイルを書き換えない)/ 受け入れ「生成後 git status クリーン」 |
| BR-U5-2/5 | FR-3.3(AGENTS.md import 参照方式)/ 受け入れ「AGENTS.md は import 参照方式で追跡ファイル不変(G2)」 |
| BR-U5-3 | FR-3.3(PROJECT_INSTRUCTIONS 正本移設) |
| BR-U5-4 | FR-3.3 + G8 型整合テスト(落ちる実証必須) |
