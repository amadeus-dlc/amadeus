# Security Test Instructions

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md

## 選定根拠(比例選定)

requirements.md の承認済み要件に新規攻撃面・認証・外部サービス操作が存在しないことを確認した上での比例選定(cid:build-and-test:c3 — 実測明記がある場合のみ検査を比例選定)。code-summary.md の変更ファイル一覧を攻撃面評価の入力とする。

## 実測済みの安全性確認

- 既存 trust 機構(plugin compose の trust grant / digest 検証 / O_NOFOLLOW 再検証)への非接触: 正本+scripts の変更行 grep(`git diff ... | grep -icE "trust|digest|grant"`)= **0 hit**
- ホストルート統一(FR-7)は書込先を狭める方向(プロジェクトルート → ハーネスディレクトリ配下)でパス走査面の拡大なし。`pruneEmptyAncestors` は root 不可侵・非空停止・`rmdirSync`(非空を構造的に拒否)の安全側述語(code-generation-plan.md Step 2 の設計どおり)
- E2E はネットワーク不要・シークレット不要(NFR-1 オフライン決定性)
- 依存追加なし(`bun.lock` 差分 0)

## スコープ外(根拠付き)

リポジトリ全体の dependency audit は本 intent の対象変更と別判定(cid:build-and-test:c1-doctor-seam — 対象 tests green と既存 advisory を混同しない)。
