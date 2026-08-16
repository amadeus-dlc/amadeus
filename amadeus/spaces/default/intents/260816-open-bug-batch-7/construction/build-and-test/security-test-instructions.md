# Security Test Instructions — 260816-open-bug-batch-7

## 判定: 適用可能な NFR が存在しない(既存ガードの維持確認のみ)

requirements.md にセキュリティの数値目標・新規認可面はない。関連する既存契約の維持は以下で担保済み:

- no-silent-drop の fail-closed 挙動(改竄・欠損 → 型付き診断 + 非 0)は events 経路の既存検査 + 退役後の negative test で維持(nsd unit の DoD、落ちる実証つき)
- §12a reviewer read-only allowlist(`tools: read, grep, find, ls`)の `.pi` 面への配布が本 intent の成果そのもの(t2363 で機械述語化)
- 認証情報・シークレットの新規取り扱いなし

ノルムに従い、目標なきセキュリティベンチマークは生成しない。本判定を覆す条件: 認可・入力検証の新規面を持つ変更が加わった場合。
