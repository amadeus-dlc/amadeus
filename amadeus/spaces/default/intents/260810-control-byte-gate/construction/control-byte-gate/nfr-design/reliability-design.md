# Reliability Design — control-byte-gate(Issue #2814)

上流入力(consumes 全数): business-logic-model.md(処理フロー7段と in-process seam — 本設計の対象面)。条件解決で除外された consumes: nfr-requirements 系5成果物(performance/security/scalability/reliability/tech-stack)— self-feature スコープで nfr-requirements ステージが SKIP のため不在(設計上の期待どおり)。NFR の正本は requirements.md の NFR-1〜4 を用いる。

## 信頼性設計(NFR-3 fail-closed の3面)

- 列挙段: git spawn 失敗 → 即 exit 1 + 原因メッセージ(BR-1)。部分列挙で続行しない。
- 読取段: 個別ファイル読取失敗 → readErrors 集計 → exit 1(BR-5)。無音 skip の禁止(t55 型 fail-open の否定)。
- 判定段: 純関数(例外経路なし)。内部例外は未捕捉のまま非 0 exit で loud(BR-7)。

## 決定性と再現性(NFR-1)+ 失敗の可読性(NFR-2)

- 同一ツリー → 同一 verdict・同一出力順(BR-8 — 時刻/env/ネットワーク非依存、列挙順は git ls-files の決定的順序)。
- CI flake 耐性: リトライ機構は持たない — 決定的検査に flake 源が構造的に存在しない(spawn 失敗等の環境異常は fail-closed で可視化され、re-run で回復)。

## 回復手順

- 検出時(真陽性): 該当バイトをエスケープ表記へ修正して再 push。
- stale allowlist: エントリ削除または path 更新。
- 誤検出主張(偽陽性疑い): allowlist 追加は reason 必須の PR レビュー経由 — 無審査の緩和経路を設けない。
