# Decisions(ADR)— 260720-leader-store-sync

上流入力(consumes 全数): requirements, components, services, architecture, component-inventory, team-practices — ADR-1/2 は architecture.md 同定節と component-inventory.md の既存 tool 台帳、ADR-3 は team-practices.md が参照する norm-changes-via-pr の live 層に依拠

## ADR-1: PR 生成 idiom は GhRunner port(tool 内)を正とし、ci.yml precedent からはブランチ命名類推のみ借用する

- Context: RA Open Questions の申し送り(ci.yml:319-327 の CI shell precedent vs amadeus-mirror.ts の GhRunner idiom)。
- Decision: tool 実装は GhRunner port(テストシーム・exit 契約・no-shell が既習)を採用。ci.yml からは決定的ブランチ命名(`sync/leader-<UTCdate>-<seq>`、metrics/snapshot-<sha12> の類推)を借用。**auto-merge(gh pr merge --auto)は不採用** — C-4(no-AI-merge: sync PR は人間承認マージ)との意図的相違として明示(citation-semantics-check)。
- Consequences: gh 認証はローカル keyring(CI app-token と異なる)— tool は leader ローカル実行専用。CI からの自動実行は本 intent スコープ外。
- Alternatives Rejected: (a) ci.yml へのジョブ追加(leader ローカルの選挙 store は CI から見えない・W-1 系境界越え) (b) shell script 化(テストシーム喪失・mirror.ts 既習様式からの逸脱)。

## ADR-2: auditShardName は packages/ を import せず規則を自己完結実装し、ドリフト検知テストで守る

- Context: scripts/ は配布外で、packages/framework/core の内部実装は scripts/ 向けの安定 API として設計されていない — import はレイヤ越境の結合(core 側リファクタが scripts/ を無警告で壊す)と配布境界の混線を招く(reviewer 指摘で精密化 — no-canonical-direct-execution は「canonical パスでの CLI 直実行」の cid であり本件の直接根拠ではない。関連被引用としてのみ残す)。
- Decision: `shardBasename`(M2)として合成規則(host 正規化48字+`-`+cloneId 12hex+`.md`)を純関数で再実装し、**packages 側 `auditShardName` との一致をドリフト検知テスト(両実装へ同一入力→同一出力)で固定**する。
- Consequences: 規則変更時はテストが赤くなり同期を強制(count-comment-sync 系の機械版)。
- Alternatives Rejected: (a) packages import(上記混線) (b) シャード名のハードコード(clone-id は per-clone 可変で不成立)。

## ADR-3: 「persist 済み norm 差分」は同期対象から除外し、norm PR 経路(既存)へ委譲する

- Context: Issue #1281 は norm 差分の滞留も挙げるが、norm 変更は norm-changes-via-pr(2名レビュー+ユーザー承認)の既存経路が正本で、sync PR への同乗は経路の二重化を作る。
- Decision: tool の抽出対象は elections/ 全量+自クローンシャードの2クラスに限定。norm 差分は StatusProbe(C5)の計測・警告表示のみ(運搬は既存 norm PR 経路)。
- Consequences: 本決定は scope-document M-1 の実文(「elections/ 全量+clone-id→auditShardName 導出の自シャード」— norm 差分を含まない、:15 実測)と整合する。norm 差分は intent-statement の問題定義には含まれるが、運搬は既存 norm PR 経路が正本であり、tool は StatusProbe の計測・警告のみを担う(components C1 の「persist 済み norm 差分」記載は計測対象の意味に限定 — 起草時の曖昧さを本 ADR で確定)。
- Alternatives Rejected: norm 差分の sync PR 同乗(norm-changes-via-pr と衝突 — レビュー水準の低下)。

## ADR-4: 閾値定数

- `SYNC_ELECTION_THRESHOLD = 10`(仮値 — units/実装で本日実測(選挙 30+件/約12h)から中央値調整可、E-LSSRA2 留保の根拠付き named constant)。`SYNC_SPLIT_FILE_LIMIT = 300`(FR-4 分割提案閾値 — #1280 の531ファイルを2分割相当に収める根拠。同じく named constant)。
