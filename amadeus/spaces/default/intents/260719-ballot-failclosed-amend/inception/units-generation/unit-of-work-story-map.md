# Unit of Work Story Map — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## 利用者ジャーニー × Unit 対応

| ジャーニー(利用者=投票メンバー/leader) | 現状の痛み | U1 着地後 | 対応 FR |
| --- | --- | --- | --- |
| ballot を作って vote する | 誤 timestamp(`__NOW__` 級)が受理され、選挙終盤の verify で初めて停止 | 受理段で `vote: invalid-timestamp` exit 1 — 即時検出・即時修正 | FR-1/FR-2 |
| 受理済み ballot の内容を訂正する | CLI に経路がなく store 手是正+ユーザー承認が必要(E-CCCRA 実事故) | 同じ vote verb で `kind:"amend"`+ref を提出 — correction trail 維持で CLI 内完結 | FR-3 |
| 開票・検証・record 化する(leader) | amend が存在し得なかった(存在すれば二重計上) | per-voter 最新1票で解決された母集団が tally/verify/render/verifySelf の全消費面で一貫 | FR-4 |
| 既存選挙の記録を読む | — | 挙動不変(保存済み 12+ 選挙の load/verify 完全互換 — glob 全数 sweep で実証) | FR-2/NFR-3 |

## ストーリー順(U1 内の実装順ガイド — delivery-planning への入力)

1. FR-1(invalid-timestamp)+落ちる実証 — 独立で最小の価値(事故クラスの即時封鎖)。
2. FR-3(amend parse/write+unknown-ref)— FR-1 と同一ラダー編集のため連続実装。
3. FR-4(resolveBallots+適用点 #1〜#3・#5)— FR-3 が生む共存状態の集計正しさ。
4. FR-2 sweep+FR-5 検証統合 — 締め工程。
