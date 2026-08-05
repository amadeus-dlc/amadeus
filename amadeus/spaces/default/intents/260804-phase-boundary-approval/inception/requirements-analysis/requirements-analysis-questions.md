# Requirements Analysis Questions — 260804-phase-boundary-approval

ユーザー承認: 2026-08-05T01:00:00Z — Q1〜Q6 の回答(すべて A)をガイド付きモード(AskUserQuestion)で取得し、本ファイルへ転記した。

対象: Issue #2143(phase boundary verification の規約順序と approval guard の非両立)+ Issue #2232(advisory-choice が有効な人間選択を無音不採用にする)— #2232 は 2026-08-05 のユーザー裁定「一緒に直せ」で本 intent スコープに編入済み。

上流入力: `codekb/amadeus/{business-overview,architecture,code-structure}.md`(RE 差分リフレッシュ、observed `b938898f3`)、`re-scans/260804-phase-boundary-approval.md`。

RE の決定的発見(質問の前提):
- 3契約のうち governance protocol は区間内(`f7273b9ab`、#2166)で既に是正済み。残ギャップは「annex 対 guard」。
- 8ハーネス全数実読: skill-bearing 5 annex(claude/codex/kimi/kiro/kiro-ide)はいずれも承認節を持つが phase-check 前提に触れない。**pi の annex(:98-103)だけが `phase_boundary` → artifact → approval の正順を記述済み**。
- #2211 の autonomy `full` は phase boundary を auto-approve するが、ガードは autonomy 非認識で artifact を著述する人間ターンが存在しない(テスト空白 CONFIRMED、実損 UNCONFIRMED)。
- #2232 は4経路(完全一致要求 / AskUserQuestion 非計上 / binding 失効 / 提示→選択の隣接順序要求)を本セッションで実測。

---

## Q1. #2232(advisory-choice)の修正方式

- A. 決定的 CLI 経路を新設する — `amadeus-advisory-choice record --advisory-instance <id> --choice <run-now|defer-with-risk>` を追加し、conductor が AskUserQuestion の回答を受けて呼ぶ。provenance は直近 HUMAN_TURN へ束縛。prompt 完全一致経路は後方互換として残す(推奨)
- B. prompt 照合の緩和のみ — 先頭行一致+失敗理由の stderr 表示を追加
- C. A と B の両方
- D. 診断表示のみ(不採用理由を次回 advisory message へ含める)
- E. 本 intent では扱わない(裁定の取り消し)
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)

## Q2. autonomy `full` × phase boundary の扱い

- A. 本 intent で構造対応 — `full` の auto-approve 時は conductor が phase-check artifact を著述してから approval を report する順序を protocol/annex に明記し、production-path test で固定する(guard 変更なし)(推奨)
- B. テスト空白のみ埋める — 交差の現在挙動(進行不能)を pin する test を追加し、挙動変更は autonomy intent(#2067 Bolt 5)へ委譲
- C. 本 intent では対象外(#2067 へ全部委譲)
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)

## Q3. annex 横展開の範囲

- A. skill-bearing 5 annex(claude/codex/kimi/kiro/kiro-ide)へ pi の正順記述を横展開。cursor/opencode は承認儀式自体が無いため対象外(推奨)
- B. cursor/opencode の commands/amadeus.md にも承認節を新設して7面へ展開
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)

## Q4. annex 間 drift を止める機械検査

- A. 含める — 「phase_boundary → artifact → approval」順序契約の文言存在を skill-bearing annex 全数に対して検査する test を本 intent で追加(推奨)
- B. 含めない — follow-up Issue 化
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)

## Q5. #2143 受け入れ条件の再解釈

- A. protocol 是正(`f7273b9ab`)着地済みを前提に、本 intent の受け入れは「3 phase 境界の production-path test(phase-check 不在から開始)+ annex 同期 + 初回の有効承認が error 化しない導線 + fail-closed 維持 + SKIP 構成対応」とする(推奨)
- B. Issue 原文の受け入れ条件を全て本 intent で満たす(protocol 再改稿も含む)
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)

## Q6. エンジン側の構造対応(#2143 の本丸)

- A. 最小 — エンジン変更なし。`phase_boundary` 付き directive を受けた conductor が gate 提示前に artifact を著述する順序を protocol/annex で強制し、test で pin(推奨)
- B. エンジンが verification move を明示 route — phase 最終 stage の gate 前に「phase-check を著述せよ」という print/run 指示を `next` が emit する(エンジン改修)
- C. guard 側を緩和 — approve が phase-check 不在時に typed error ではなく ask(著述を促す)を返す
- X. Other (please specify)

[Answer]: A(ガイド付き回答、2026-08-05)
