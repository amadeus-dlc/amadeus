# Scope Definition — 明確化質問(260717-standing-delegation-gran)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全3問 選挙不要(既決導出)— 各問の根拠種別は下記1問1行。
申告: e4 → leader(agmsg 送信 2026-07-17T02:0xZ — agmsg 一次記録)
leader 承認: 2026-07-17T02:04:13Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
回答の記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`(C-1〜C-10 — SQ1 の写像元)

## SQ1: In/Out の構成はどう導出するか

- A: intent-statement 成功基準1〜7+Out of Scope+feasibility C-1〜C-10 からの機械導出(新規判断なし)
- B: 新規のスコープ判断を追加する
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T02:04:13Z)
根拠種別: 既決導出 — 上流2成果物の転記・写像のみ(IC/FS で裁定済みの範囲)

## SQ2: バックログの粒度は

- A: 単一 intent 完結(単一 Bolt 見立て)— 分割は units-generation の判断に委ねる
- B: この段で複数 intent へ分割する
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T02:04:13Z)
根拠種別: 既決導出 — 変更理由が単一機構(受理検証器+verb)に凝集(#922 前例の単一 Unit 判断と同型)。最終分割判定は units-generation の責務

## SQ3: 既存 delegate フロー併存の Forbidden 照合は

- A: 併存は要件由来のフォールバック必須経路であり「要求されない後方互換レイヤー」に非該当 — scope-document に明文化(実装は単一検証器の分岐)
- B: 互換レイヤーとして扱い削除対象にする
- X: その他

[Answer]: A — 既決導出(leader 承認 2026-07-17T02:04:13Z)
根拠種別: 既決導出 — Forbidden 条文の「requirements/NFR に明示された場合にのみ実装し根拠を成果物に残す」の適用(成功基準1/2/4 が明示根拠)
