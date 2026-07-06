# Business Logic Model — guide-ops

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象と各章の内容

| ファイル | 内容 | 対応要求 |
|---|---|---|
| `docs/guide/06-agents.md` + `.ja.md` | agent とは何か（stage の lead / support persona、conductor が読む flat file、subagent 委譲との関係）、14 agents の役割分類（domain 11 / reviewer 2 / composer 1 = `.agents/amadeus/agents/` 実在）、reviewer（gate 前の独立レビュー、NOT-READY → 修正 → 再レビューの流れ）と composer（`/amadeus compose` のディスパッチ先）の位置づけ。stage との対応は lifecycle 契約へ委譲 | FR-1 |
| `docs/guide/07-interaction-modes.md` + `.ja.md` | 利用者が画面で選ぶ実 4 択（Guide me / Grill me / I'll edit the file / Chat）を正として書く。Grill me = amadeus-grilling ブリッジ（一問ずつ + 推奨回答）への委譲。questions ファイルの形式（`[Answer]:`、A〜E + X (Other)、ファイルが常に正）。protocol 契約層（stage-protocol の 3 モード + harness 側の Grill me 挿入）は 1 文の補足。gate（Approve / Request Changes）との関係 | FR-2 |
| `docs/guide/12-cli-commands.md` + `.ja.md` | `/amadeus` のコマンド体系を `amadeus-utility.ts help` の実出力（help-output.txt、全 50 行）で実在の 4 節（Scopes / Utilities / Other / Examples）に沿って分割掲載。read-only 系（--status / intent / space / doctor）とワークフロー系（scope 名 / compose / --stage <slug> --single）の使い分け。エンジン内部（orchestrate next / report）は 02 章へ委譲 | FR-3 |
| `docs/guide/index.md` + `.ja.md`（3 行ずつ） | 予定一覧テーブル（4 列: # / Working title / Tracking issue / Status）から該当 3 行を削除し、既執筆章の上部テーブル（3 列: # / Chapter / Status）へ実リンク行として移す（00〜02 の前例と同じ着地） | FR-4 |

## 実測素材（NFR-1）

| 素材 | 採取元 | 状態 |
|---|---|---|
| `amadeus-utility.ts help` 実出力（全 50 行 = Scopes / Utilities / Other / Examples の 4 節） | 隔離 workspace guide-ws2（#577 修正後 main で導入） | 再採取済み（help-output.txt。初回採取は tee | head の SIGPIPE で 29 行に無言截断されていたことを reviewer が検出 → pipe を挟まないリダイレクトで全文再採取） |
| agents 一覧（14 ファイル） | 同 workspace の `.agents/amadeus/agents/` ls | 採取済み（agents-listing.txt） |
| questions ファイル形式・4 択の文言 | `skills/amadeus/references/question-rendering.md`、`stage-protocol.md`（ファイル引用であり実行出力ではない — 引用は要旨のみで転載しない） | 実体参照で執筆 |

## 検証の流れ

1. 丸コピー検査（NFR-2）: stage reviewer が上流対応章（06-agents / 07-interaction-modes / 12-cli-commands）と突き合わせ、逐語一致 0 件（固有名・コマンド名・path 除く）。
2. リンク機械検査（NFR-5）: 新設 6 + index 対で broken 0 件。
3. Codex 初見読者レビュー ≥ 1 回（NFR-4）。
4. validator + `npm run test:all`（C-3）。rename-leftovers の tree-wide 検査対象になることを前提に、`aidlc` 言及が必要な場合は出典付き（allow 設計整合）で書く。
