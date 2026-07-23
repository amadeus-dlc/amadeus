# Unit Dependency — チーム機能のコア昇格

上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements。

依存は component-dependency.md の C 依存(C1→C3、C2→C3、C2/C4→C6、C4→C5、C2/C4/C5→C7)の Unit 面への**純粋な転写**(UG 新規の依存辺なし — iter1 Critical1 の U3→U1 辺は残置検査の重複不変量化により除去済み)。C3 が U2 に、C5 が U3 に凝集されたため辺は Unit 粒度へ縮約される。

```yaml
units:
  - name: boundary-guard
    depends_on: []
  - name: election-promotion
    depends_on: [boundary-guard]
  - name: team-launcher-promotion
    depends_on: []
  - name: clean-env-e2e
    depends_on: [election-promotion, team-launcher-promotion]
  - name: team-mode-docs
    depends_on: [election-promotion, team-launcher-promotion]
```

## 依存の根拠

| edge | 根拠 |
|---|---|
| election-promotion → boundary-guard | C1→C3 の Unit 面転写: FR-5b の落ちる実証順序(ガードの fixture 赤が先、U2 の SKILL 書き換えで live green) |
| clean-env-e2e → election-promotion, team-launcher-promotion | E2E の被検体(配布コピーの選挙 CLI+team-up.sh)が両方揃ってから(C2/C4→C6 の転写) |
| team-mode-docs → election-promotion, team-launcher-promotion | docs は確定した配布パス・コマンド・doctor 出力を記載(C2/C4/C5→C7 の転写。C5 は U3 に含まれる) |

## 並行性

- U2 と U3 は編集面がファイル単位で非交差(選挙5+skills+manifest/emit vs team 3+doctor 面。共有台帳なし — 残置検査は U1 内の generic 不変量で両 Unit はガードのファイルに触れない)— U2 は U1 着地後、U3 は独立に並行実装可(cid:c6 — 着手前に実 diff で非交差を再評価)
- U4 と U5 も相互非交差(tests/e2e/ vs docs/)— U2/U3 着地後に並行可
- U1 の live enforcement は U2 と同一 Bolt(unit-of-work.md U1 の重要制約 — delivery-planning で拘束)
