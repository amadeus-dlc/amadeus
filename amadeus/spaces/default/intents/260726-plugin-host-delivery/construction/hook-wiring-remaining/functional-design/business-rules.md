# Business Rules — U4 hook-wiring-remaining

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U4-1(呼び出し 1 点)**: 各面の配線はフック側への HookInvocation 追加 1 点のみ。合成・判定ロジックをフック側に置かない(requirements FR-3b「フックは compose 入口を呼ぶだけ」。検証: フック diff の行数・内容検分+CLI 経由結果と engine 直呼び結果の同一性)
- **BR-U4-2(マトリクス駆動)**: 配線対象面・挿入位置は U1 マトリクスの composeTrigger セル(measured のみ)からの転記。deferred セルの面へは配線しない(external-seam-vocab-measurement。検証: 配線面リストと U1 列挙の機械照合)
- **BR-U4-3(実起動)**: 対応面の検証は native hook の実起動テスト。配線実在のみの検査は不合格(FR-3b 合否。実起動不能な面は文書化された手動 fallback E2E で代替し期待値として固定 — 暗黙成功禁止)
- **BR-U4-4(degrade 必須 — fail-closed)**: DegradeContract は **(a) clazz == manual-only の面、または (b) composeTrigger セルが deferred(未実測)のまま U4 に到達した面**の両方に必ず作る(判定 2 軸の閉包 — 「配線なし かつ degrade なし」の沈黙欠落を構造的に不能にする。FR-1 silent skip 禁止/FR-5 可観測。検証: 全面について「配線あり XOR DegradeContract あり」の全数 assert+doctor 出力への advisory 行出現の文字列 assert — U5 BR-U5-2(a) と共有)。(b) の面は後日 composeTrigger が measured へ昇格した時点で配線へ移行し DegradeContract を除去する(components.md C4 の「対応面」集合の更新として扱う)
- **BR-U4-5(失敗時継続)**: フック起動失敗は stderr 1 行警告+セッション継続(U2 HookInvocation.failureMode の逐語継承。検証: compose 失敗 fixture でのセッション起動成功+警告出力 assert)
- **BR-U4-6(起動レイテンシ)**: 各面の配線は no-op 高速路(--if-stale)を必ず通す — 全面で NFR-2 の実測対象になる(検証: build-and-test の起動時間実測に全対応面を含める)
- **BR-U4-7(dist 同期)**: フック配線の正本変更は同一変更で全ハーネス dist / self-install を再生成し drift ガード green(project.md Mandated)

## 検証への trace

BR-U4-3 が本 Unit の中核合否(t188 Harness matrix 相当 — U7 適合テストの trigger 面と共有)。BR-U4-4 の doctor 出現 assert は U5 実装後に統合。数値・面数はコマンド出力転記のみ(count-free — 面数を BR に焼き込まない)。
