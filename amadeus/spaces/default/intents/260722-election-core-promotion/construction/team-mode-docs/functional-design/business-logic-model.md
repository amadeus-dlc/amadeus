# Business Logic Model — U5 team-mode-docs

> 上流入力(consumes 全数): unit-of-work(U5 定義)、unit-of-work-story-map(FR-7 トレースと価値到達経路)、requirements(FR-7a〜7d)、components(C7)、component-methods(C7 章構成)、services(外部依存の PATH 契約 — prerequisite 節の記述根拠)

## 章構成(FR-7a — component-methods C7 の実装形)

`docs/guide/20-team-mode.md`+`20-team-mode.ja.md`(en/ja 対、既存ガイドの言語切替リンク様式):

1. **Overview** — Team Mode とは(Operating Modes 契約: `AMADEUS_OPERATING_MODE=team` の判定意味論、ソロ/チームの品質契約が同一である旨)
2. **Prerequisites** — bun / herdr / agmsg の3ツール(各公式入手先リンク+動作確認バージョン herdr 0.7.1 / agmsg 1.1.6+PATH 契約 — services の外部依存境界と一致)。インストールは利用者責務(RA Q5)
3. **Setup** — 配布コピーからのチーム起動手順(`bash {{HARNESS_DIR}}/tools/team-up.sh` 形 — U3 確定パスを転記)
4. **Running an election** — `/amadeus-election` スキル+CLI の指令転送ループでの選挙完走手順
5. **Operating Modes contract** — ソロ/チームの判定と品質契約(team.md ノルム本文は移動しない — docs は説明のみ、O-3)
6. **Platform support** — macOS+Linux、Windows はチーム機能対象外の明記

## 3層配置規約(FR-7b)

`docs/harness-engineering/` へ追記: scripts/(開発専用・非配布)/ contrib/(ドッグフード専用・dist 非投影)/ packages/framework/(配布正本)の判定ルール+昇格の作法(移動・P5・境界ガード U1 の存在)。

## 執筆順序と検証

- U2/U3 の着地後に確定パス・doctor 出力文言を転記する(依存順序の一般原則 — unit-of-work-dependency の U2/U3→U5 辺の履行。※iter1 で nfr-design:c7 を引用したが同 cid は断定的インベントリの記述タイミングに関する知見で機序が異なるため誤帰属として撤回)
- 生成後の機械チェック: (a) 既存 docs 参照整合ガード(t174 系)green (b) 言語切替リンクの相互整合 (c) prerequisite 節の3リンク実在(FR-7c 合否基準)(d) 旧 scripts/ パスの docs 全域 grep 0 件(BR-8 — t174 の検査範囲に依存しない独立確認)
- memory シードテンプレへは一切触れない(FR-7d)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:37:24Z
- **Iteration:** 1
- **Scope decision:** none

Major2件(FR-7d の BR/検証エントリ不在 / 既存 docs の scripts/ パス参照棚卸し漏れ — conductor 独立 grep で3文書8+件を裏取り、reviewer のスコープ外読取申告は diary+PM 記録)+Minor1件(nfr-design:c7 の cid 誤帰属)

### Findings

- Major1: FR-7d の検証エントリ(templates diff 0 の機械確認)を BR へ追加
- Major2: 既存 docs 3文書(team-messaging.md 8件+codex-cli en/ja)の旧パス参照 — U5 文書構造表+BR 棚卸しエントリで所有を確定(conductor 独立実測で採用)
- Minor1: nfr-design:c7 誤帰属 → 依存順序の一般根拠へ差し替え

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:39:00Z
- **Iteration:** 2
- **Scope decision:** none

iter1 の3指摘全閉包(BR-7 templates 機械確認 / BR-8 既存 docs 3文書の U5 所有+grep 0 件検証 / c7 誤帰属撤回)。FR-7a〜7d 全数対応成立、二重責任空白解消、新規欠陥なし

### Findings

- None
