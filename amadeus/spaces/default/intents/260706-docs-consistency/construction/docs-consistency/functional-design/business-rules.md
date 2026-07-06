# Business Rules — docs-consistency

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 退役と参照の規則

- BR-1: rollout-plan の削除は互換 stub・アーカイブなしで行う（backward-compatibility ルール）。歴史的経緯は git 履歴参照で足り、到達点の記録は skill-language-policy の 1 段落に限定する（新文書を作らない、重複させない）。
- BR-2: 参照元更新は削除より先に行い、削除後の横断 grep（record 外 0 件）で完全性を検証する。
- BR-3: 到達点の記録は実測（42 skill、日本語残存 3 件の内訳）に基づく事実だけを書き、将来の英語化方針は skill-language-policy の既存規範に委ねる（本 Intent で方針を追加しない）。

## Operation 記述の規則

- BR-4: 実行可否の説明は 2 層構造（lifecycle 契約層 = scope-grid の CONDITIONAL 採用 / workspace steering 層 = default space の対象外判断）で統一し、どの文書でも「Amadeus が Operation を持たない・実行しない」という契約層の断定に戻さない。
- BR-5: boundary 文書の理由節（成果物契約・gate・validator・PR 境界）は steering 判断の根拠として維持し、削除しない。補正は Decision 節の断定文と冒頭の位置づけ注記に限る（Right-Sizing。文書退役まで広げない = Q3）。
- BR-6: 歴史的判断の記述は「#394 時点の判断」であることを明示する形（過去形 + 明示注記）で残し、明示のない現在形の断定は残さない。補正は文字列回避方式とする — 書き換え後の文は NFR-1(3) の対象 5 文字列を一切含まない言い回しにし（過去形化でも当該文字列を保持しない）、検証を文脈判定なしの単純横断 grep = 0 件で機械化する（business-logic-model B002-6 の文例に従う）。
- BR-7: docs/amadeus の変更は英語正 + `.ja.md` 併置で両言語同内容、見出し文言不変（docs/guide のアンカー保護）。steering（operation.md）は日本語のまま（memory/ は日本語資産）。
- BR-8: scopes.md のステージ数表は code-generation で scope-grid から再実測し、実測値を正とする（文書記載の数字を鵜呑みにしない）。
- BR-9: Operation 運用そのもの（steering の対象外判断）は変更しない。変更するのは記述の根拠と説明だけである。
