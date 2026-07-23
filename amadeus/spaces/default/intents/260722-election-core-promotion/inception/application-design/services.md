# Services — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## サービス構成

本 intent はデプロイ可能なサービス(常駐プロセス・API サーバ等)を新設しない。全コンポーネントは CLI ツール・テスト・ドキュメントであり、既存の配布単位(npm パッケージ+self-install ツリー)に乗る。

| 実行単位 | 種別 | 起動形態 |
|---|---|---|
| amadeus-election CLI(C2) | 単発 CLI(bun 直接実行) | 利用者/スキルが verb ごとに起動、常駐なし |
| team-up.sh(C4) | 単発 bash(herdr セッションを起動して終了) | 利用者が起動。常駐するのは herdr 側(外部 prerequisite) |
| doctor advisory(C5) | 既存 /amadeus --doctor 内の検査 | 既存ユーティリティに同乗 |
| 境界ガード / E2E(C1/C6) | テスト | 既存 tests/run-tests.sh ランナーに同乗 |

## 外部サービス境界(architecture.md の外部依存実測に対応)

- **herdr**(外部 prerequisite): team-up.sh からの CLI 呼び出し面(workspace create / pane split / attach / ready 待ち — team-up.sh:426/:444/:453/:155-161)。契約は PATH 上の実行可能性のみ(T-6)
- **agmsg**(外部 prerequisite): team-msg.sh の send/history 委譲(:95-113)と選挙 transport の send.sh spawn(election.ts:293)。同上
- どちらも amadeus 側でプロセス管理・死活監視は行わない(利用者環境の責務 — RA Q5 裁定と整合)

## AWS / クラウド面

N/A(feasibility-assessment の根拠付き N/A を継承 — 本設計でも新規クラウド資源なし)。
