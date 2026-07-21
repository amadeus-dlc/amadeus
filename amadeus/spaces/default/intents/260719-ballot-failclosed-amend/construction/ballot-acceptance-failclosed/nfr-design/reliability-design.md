# Reliability Design — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(R-1〜R-4 の実現)

- **R-1(原子性)**: 書込は既存 writeStoreFile(tmp+rename)経路のみ — unknown-ref 照合は appendBallot 内の読取フェーズ(dup 判定直後)に挿入し、書込フェーズへ到達する前に fail(部分書込の構造的排除)。
- **R-2(loud 失敗)**: 新エラー2種(invalid-timestamp / unknown-ref)は既存 fail 経路(vote: 分類 / storeFail)に載せるだけ — 新しい出力チャネル・ログ機構を作らない(stdout-directive-stderr-advisory の既存契約維持)。
- **R-3(corpus 互換)**: sweep は読取専用(検証述語の適用のみ)— leader store への書込ゼロ。
- **R-4(late 決定性)**: BR-4b どおり classifyLate 非解決 — 実装では resolveBallots を classifyLate 経路に**呼ばない**ことをテストで固定(誤配線の防止)。

## テスト層の配置(NFR-2、fs-tests-integration-first+E-SMF-ND 追補)

- unit(t234): 純関数のみ(Ballot.parse 分類・resolveBallots)— fixture はメモリ内リテラル、実 FS なし。
- integration(t235/t236): 実 FS(store/CLI 疎通)— in-process 駆動で lcov 有効(in-process=計測の軸、integration=配置の軸の独立を維持)。
- 落ちる実証(BR-6)と閉包テストの実行順は code-generation-plan で確定する。
