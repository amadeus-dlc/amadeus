# Security Requirements — u002-kanban-sync-cli

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

認証は gh CLI の既存ログインに全面依存する（C03 = 依存は gh CLI のみ、の帰結）。トークンを自前で保存・出力しないこと、およびエラーメッセージに秘匿値を含めないことは、C03 から導かれる本 Unit の追加要求としてここで定める（出典は本文書）。
送信先は GitHub（既にコードがある場所）だけであり、Intent record の状態を他へ送らない（market-research Q2 = A）。
scope 不足時は書き込み前に停止する（FR-4.1）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
