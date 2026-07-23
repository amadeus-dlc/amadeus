# Business Rules — U5 team-mode-docs

> 上流入力(consumes 全数): requirements(FR-7)、components(C7)、component-methods(C7)、unit-of-work(U5)、unit-of-work-story-map(利用者到達経路)、services(PATH 契約の記述根拠)

## ルール一覧

| ID | ルール | 検証 |
|---|---|---|
| BR-1 | en/ja は同一構成・同一情報量の対とし、言語切替リンクを相互に張る(既存ガイド様式) | t174 系ガード+リンク相互 grep |
| BR-2 | prerequisite 節は3ツールの公式入手先参照+動作確認バージョンを必須(FR-7c 合否基準 = リンク実在) | リンク実在の機械確認 |
| BR-3 | コマンド・パス・doctor 出力文言は U2/U3 の着地物から転記(記憶起草禁止 — compilation-stage-source-first 同型) | 転記元の実測 ref 併記 |
| BR-4 | team.md ノルム本文の複製・移動をしない — Operating Modes の説明は要旨+「チームの memory 層が正本」の案内に留める(O-3) | 複製 grep 0 件 |
| BR-5 | Windows 対象外・チーム機能はオプトインである旨を Overview と Platform support の両方に明記(FR-3d/FR-7a) | 文言実在 assert |
| BR-6 | 3層規約は判定ルール(「利用者が使うものは framework、開発専用は scripts、ドッグフードは contrib」)+昇格作法を含む(FR-7b) | 節構成レビュー |
| BR-7 | memory シードテンプレ(templates 系ファイル)への変更ゼロ(FR-7d)— 実装 PR の diff に該当パスが現れないことを機械確認 | git diff --name-only の該当パス grep 0 件 |
| BR-8 | C4 移動対象パス(scripts/team-up.sh / team-msg.sh / team-up-codex-safety-wait.ts)を参照する**既存 docs の全数棚卸し+新パスへの更新**は U5 が所有する — conductor 独立実測 2026-07-23: docs/guide/team-messaging.md(8出現)+docs/guide/harnesses/codex-cli.md/.ja.md の3文書が現存参照(U3 は scripts/ 削除のみ、docs 更新は本 Unit) | 実装後 grep: 旧パス出現 0 件(allowlist なし) |

## 検証の割付

BR-1/BR-2 は機械ガード(既存 t174 系+リンク grep)、BR-3/BR-4/BR-5/BR-6 は生成後 grep+PR レビュー観点。E2E(docs 手順の実効性)は U4 の happy path がコマンド列を共有することで間接検証。
