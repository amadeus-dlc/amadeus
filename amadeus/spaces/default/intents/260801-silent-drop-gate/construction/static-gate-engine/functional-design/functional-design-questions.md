# Functional Design Questions — static-gate-engine

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。U1、FR-01〜09／15、NFR-01／02／04〜08 と SC-01／02／04／07 を対象にし、短命 Bun CLI、immutable snapshot、pinned ast-grep、TypeScript semantic classification、shrink-only ledgerを維持する。

## Interaction Mode

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — 完全走査、semantic soundness、ratchet反例を一問ずつ深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me（2026-08-02T04:33:36Z、ユーザー回答「1」）

## Q1. Snapshot authority

ast-grep candidateとTypeScript semantic判定が参照するsource bytesをどう固定しますか。

- A. 単一immutable `SourceSnapshot` を正本にする（推奨）— 元sourceを一度だけ読み、read-only mirrorとTypeScript overlayを同じbytesから構築し、前後digestとcoverage receiptを照合する
- B. ast-grepとTypeScriptがそれぞれ元filesystemを読む
- C. ast-grep結果のlocationだけを保持し、semantic判定時に元sourceを再読する
- D. 速度優先で変更検知を省略する
- X. Other (please specify)

[Answer]: A — 単一immutable `SourceSnapshot` を正本にする（2026-08-02T04:36:13Z、Guide me、ユーザー回答「1」）

## Q2. Semantic path verdict

Result／戻り値消費をcontrol-flow pathごとにどう判定しますか。

- A. 全pathのterminalを閉集合で証明する（推奨）— return／throw／許可union narrowing／明示検査のみを消費とし、1 pathでもdropならfinding、symbol／union／path解決不能は `RULE_INVALID`
- B. 代表pathが消費していればPassにする
- C. method名／変数名のheuristicだけで判定する
- D. 解決不能candidateをfinding 0件として無視する
- X. Other (please specify)

[Answer]: A — 全pathのterminalを閉集合で証明する（2026-08-02T04:36:30Z、Guide me、ユーザー回答「1」）

## Q3. Evidence and ledger boundary

初回censusからcommitted baselineまでの書込み境界をどうしますか。

- A. read-only checkとnew-output-only evidence commandを分離（推奨）— raw census、human classification＋approval、approved evidence、baseline candidateを別成果物にし、通常checkはcanonical ledgerを更新しない
- B. 通常checkが検出結果をbaselineへ自動追記する
- C. 修正前censusをそのままcommitted baselineにする
- D. classification／approval receiptなしでcandidateを昇格する
- X. Other (please specify)

[Answer]: A — read-only checkとnew-output-only evidence commandを分離（2026-08-02T04:37:17Z、Guide me、ユーザー回答「1」）

## Ambiguity Analysis

snapshot authority、semantic path completeness、infrastructure error、evidence approval、ledger ratchet、byte determinismを検査した。ast-grepとTypeScriptは同一immutable snapshotを参照し、全pathのterminalを閉集合で判定する。解決不能は `RULE_INVALID` としてfail-closedになるため、finding 0件への偽装はない。通常checkはcanonical ledgerを更新せず、raw censusからhuman classification／approval、approved evidence、baseline candidateへ一方向に進む。不明点は残っていない。

## Functional Design Plan Approval

- A. Approve Plan（推奨）— `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を生成する。UIはないため `frontend-components.md` は生成しない
- B. Revise Plan — 修正内容を指定する
- X. Other (please specify)

[Answer]: A — Approve Plan（2026-08-02T04:37:42Z、Guide me、ユーザー回答「1」）
