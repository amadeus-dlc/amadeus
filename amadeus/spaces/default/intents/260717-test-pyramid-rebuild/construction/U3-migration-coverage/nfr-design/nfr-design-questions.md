上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# U3 NFR Design 質問

**人間承認:** 2026-07-17T18:44:04Z — Q1・Q2・Q3 ともユーザーが `1` を選択。

この承認はNFR設計方針の承認であり、将来生成されるEvidence実データの承認ではない。具体的な `EvidencePayload` の生成後、そのdigestを明示した別の直接HUMAN_TURNを得て初めて `ApprovalProof` を構成する。

## 既決事項

- NFR Requirements の人間回答 A/A/A、4つの final state、独立した `reviewQueue` / `migrationQueue`、coverage の `PathState` / `CiParticipation` 2軸は変更しない。
- per-tier path名、follow-up Issue番号、容量・時間閾値は PENDING / Out のままとし、本ステージで発明しない。
- 現行 combined coverage は `EXISTING + EXECUTED`、unit/integration/smoke binding は `PENDING + EXECUTED`、e2e binding は `PENDING + NOT EXECUTED`、補助 tier は `N/A + N/A` とする。

## Q1: CandidateEvidence の意味判断をどの単位で承認しますか

`CandidateEvidence` の disposition は人間の意味判断を含み、記録後の決定表だけが純粋・決定的です。一方、上流 schema は、誰がどの単位でその判断を承認したかをまだ閉じていません。

A. **同一 schemaVersion・observedRef の EvidenceSet 全体を一括承認する（推奨）** — Git/audit の人間承認参照を envelope に1件だけ結び、各 Candidate/Signal へ重複させない。
B. CandidateEvidence ごとに承認する — file単位の追跡は細かいが、最大163件の承認情報と操作が必要になる。
C. SignalEvidence ごとに承認する — 最も細かいが、約254 signal分へ承認情報を重複させる。
D. 明示承認を置かず Git commit の存在だけを信頼する — 軽量だが、人間が disposition を確認した事実を区別できない。
X. **Other** — 別の承認単位を指定する。

[Answer]: A — 同一 schemaVersion・observedRef の EvidenceSet 全体を一括承認し、Git/audit の人間承認参照を envelope に1件だけ結ぶ。（ユーザー回答: `1`）

## Q2: 1候補の入力不正を計画全体へどう波及させますか

上流は evidence の欠落・重複・ref不一致を `classification-review` ではなく input failure とし、1件でもあれば完全な計画として成功させないと定めています。ただし、正常候補の partial queue を返すかは未決です。

A. **計画全体を atomic な `invalid-input` とし、診断だけ返す（推奨）** — actionable な review/migration queue は返さず、不正入力の修正後に全体を再評価する。
B. 全体を不完全とし、正常候補の queue を non-authoritative な partial 結果として返す — 診断には使えるが、消費側に実行禁止の追加契約が必要になる。
C. 不正候補だけを隔離し、正常候補の queue を actionable として返す — 進行できるが、fail-closed と計画閉包条件を弱める。
D. 不正候補を `classification-review` へ変換する — queue は保てるが、構造的不正と妥当な未判定を混同する。
X. **Other** — 別の blast radius を指定する。

[Answer]: A — 計画全体を atomic な `invalid-input` とし、診断だけを返す。actionable な queue は返さず、修正後に全体を再評価する。（ユーザー回答: `1`）

## Q3: 設計生成前の確認

Q1・Q2 の決定を U3 NFR Design へ反映する。EvidenceSet は同一 schemaVersion・observedRef 単位で人間承認し、入力不正時は atomic `invalid-input` と診断だけを返す。承認済み A/A/A、4状態・2 queue、coverage 2軸、PENDING / Out の境界は変更しない。この内容で5成果物を生成するか。

A. **確認して進む（推奨）**
B. **修正する**
X. **Other** — 追加・変更内容を指定する。

[Answer]: A — 確認して進む。（ユーザー回答: `1`）
