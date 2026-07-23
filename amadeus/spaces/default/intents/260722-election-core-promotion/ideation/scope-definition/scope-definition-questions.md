# Scope Definition 質問ファイル — チーム機能のコア昇格

> 判定: 本 intent の質問はユーザー直接回答で確定する(intent-capture ヘッダの判定を継承)。
> 承認: ユーザー直接回答方式を承認(アンカー = WORKFLOW_STARTED 監査行 2026-07-22T22:24:58Z)
> 上流入力(consumes 全数): intent-statement(required)、feasibility-assessment、constraint-register

## Q0. 回答モードの選択

このステージの質問(見積り3〜5問: Must/Should境界、優先順序、MVSの輪郭)をどのモードで回答するか。

- A. Guide me(対話的)
- B. Grill me(1問ずつ深掘り・推奨付き)
- C. I'll edit the file(ファイル直接編集)
- D. Chat(自由議論から抽出)

[Answer]: B — Grill me(2026-07-23 ユーザー回答)

## 質問(グリル進行中 — 動的追記)

### Q1. バリエーション機能の Must / Should 境界

intent-statement の4要素(起動/メッセージング/選挙/docs)が Must であることは確定済み。一方 team-up.sh には実測でバリエーションが多数ある: Codex ランタイム(--codex)、並行チーム(--instance)、会話再開(-c)、チームサイズ(-2/-4/-6)、agmsg の spawn/despawn/actas 等。推奨は「クリーン環境 E2E が保証する最小 UX(Claude 単一チーム、既定サイズ、起動→メッセージ→選挙完走)を Must とし、バリエーションは Should(コードは運ぶが E2E 保証は Must 面のみ)」— 成功定義(Q4=A)の検証面を最小に保ち、初回公式化の質を確保するため。

- A. 最小 UX のみ Must、バリエーションは Should(E2E 保証は Must 面のみ)(推奨)
- B. 現行の全機能を Must(E2E 保証も全面)
- C. 個別に指定する(補足で配分を指示)
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。最小 UX = Must、バリエーション = Should、E2E 保証は Must 面のみ)

### Q2. チームモード運用契約の配布形態 — docs のみか、memory テンプレ同梱か

Team Mode の運用契約(ソロ/チームの判定・品質契約)は現在 team.md(このチームの memory 層)にある。公式化の形として、(a) docs/guide での説明のみ、(b) 配布物の memory シードテンプレ(新規ワークスペースの org.md 等)へ「Operating Modes」節を追加、の2案がある。推奨は (a) — memory 層はユーザー所有の手編集正本であり(promote-self が deliberately 非管理)、テンプレ変更は全新規ユーザーのワークスペース初期状態を変える別次元の変更。まず docs で公式化し、テンプレ化は需要実測後の後続 intent が安全。

- A. docs のみ(memory テンプレは out of scope)(推奨)
- B. org.md シードテンプレへの Operating Modes 節追加まで含める
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。docs のみ、memory シードテンプレは out)

### Q3. proto-Unit の優先順序方針

バックログの並べ方の方針を確定したい。推奨は dependency + risk-first — 前 intent の既習(cid:scope-definition:c3「raw WSJF より dependency と risk-first を優先」)に従い、(1) 全要素が依存する配布骨格(境界ガード+選挙エンジン移動 — 低リスク・依存の根元)を先頭、(2) 未実証リスクが最大の面(bash 起動系の配布+クリーン環境 seam)を次に前倒し、(3) docs と E2E 仕上げを後段に置く形。value-first は本 intent では機能しない(全要素が Must の一体 UX のため価値の差が小さい)。

- A. dependency + risk-first(c3 既習に従う)(推奨)
- B. value-first(価値の大きい要素から)
- C. risk-first 純(未実証リスク最大から)
- X. その他(補足)

[Answer]: A(2026-07-23 ユーザー回答。dependency + risk-first)

### 合意サマリ確認(C-4)

前提の追記: ハードデッドラインは存在しない(ユーザーから期限の言及なし — サマリで確認)。

- A. 確認した — 成果物生成へ進む(推奨)
- B. 修正したい

[Answer]: A(2026-07-23 ユーザー確認。期限なし前提も併せて確定)
