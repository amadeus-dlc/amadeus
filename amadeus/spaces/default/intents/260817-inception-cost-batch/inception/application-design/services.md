# Services — インセプション固定費バッチ(#3181 + #2415)

上流入力: `requirements.md` / `components.md`。本 intent はデプロイされる常駐サービスを持たない(CLI フレームワーク)。ここでの「サービス」はワークフロー内のオーケストレーション面を指す。

## オーケストレーション(誰がいつ何を呼ぶか)

| 時点 | 実行者 | 動作 | 失敗時 |
|---|---|---|---|
| インセプション冒頭(issue-first intent) | conductor | `issue-evidence fetch --issues <...>` を1回実行(intent-capture 実行時、または SKIP スコープでは RE/RA の Step 2 前) | loud fail(exit 非0)を可視記録し、Request 自由文 fallback で続行(FR-EVD-5)。リトライは任意・冪等 |
| RE Step 2(スキャン) | Developer scan subagent | 除外クラス適用後の差分を読む。Focus は issue-evidence から導出(存在時) | 除外述語の適用前に既知非ゼロ区間で正件数を確認(FR-EXC-5) |
| RA Step 2(読取) | conductor(inline) | issue-evidence を一次入力として読み、確定事実を再導出せず引用 | 不在時(non-issue-first / fetch 失敗)は従来どおり Request 自由文 |
| 効果測定(後続 intent) | conductor | FR-MEAS-1 の同一手法で RE+RA active を再実測 | — |

- 通信は全て同期・ローカル(CLI 実行)。イベント駆動・非同期面は導入しない。
- fetch は conductor の1回実行に固定(orchestration)— stage 側が暗黙に再取得する choreography は採らない(取得時刻 provenance を一意に保つ)。

## サービス契約(gateway)

- evidence adapter は gateway の既存契約に従う: gh 唯一境界・readiness 事前検査・redaction 要約・token 非保持。
- 追加 API 消費は GitHub REST の read 2種(issue GET / comments GET --paginate)のみ。rate-limit 失敗は他 gateway 操作と同じ分類で loud fail。

## ライフサイクル・スケール特性

- issue-evidence.md は intent record と同寿命(record checkpoint で本線へコミット)。サイズ上限は実測ベースで問題なし: 本 intent の実例で Issue 本文+クロスレビュー2件 ≈ 20-40KB/Issue。バッチ(2-5 Issue)でも record 慣行の範囲内。
- 除外クラス宣言は契約 prose(コンパイル時に stage graph へ乗る)— 実行時状態を持たない。
