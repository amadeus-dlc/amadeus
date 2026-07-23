# 逸脱裁定候補 — CG(260723-fixture-shard-pollution)

起草: conductor e4、2026-07-23T04:08Z 頃。builder 申告2点(code-summary.md 申告節の verbatim を一次資料とする)の裁定用。

## 逸脱1: projectDir 配送方式(plan の emit() 引数貫通 → module-scoped)

**申告 verbatim(code-summary より)**: 「plan の『emit() に projectDir 引数を足し全 error 発行サイトへ貫通』案は、変更行のうち 56 箇所超が到達困難な内部不変量エラー経路(INIT_JUMP_ERROR/"Internal:…"等)で既存テスト未被覆となり codecov patch ゲート(NFR-4)と非両立であることを lcov で実測しました。そこで観測可能な契約(ERROR_LOGGED が呼び出し元 projectDir に記録)と plan の pd フロー(ハンドラ→emit→recordEngineError)を保ちつつ変更行を被覆済み少数に限定する module-scoped 方式を採用しました(既存 _engineErrorInProgress 再入ガードと同じ idiom)」

- **A案: 承認(現実装維持)** — FR-1 字義(recordEngineError の projectDir 引数化+argv フォールバック降格)は充足済み。NFR-4(patch 未カバー0)と両立する唯一の実測済み形。既存 idiom(module スコープ再入ガード)と整合。帰結: plan.md へ追記整合のみ
- **B案: emit() 引数貫通へやり直し** — plan 原文に忠実だが、未到達56行超を coverage-patch-allowlist へ登録するか waiver 諮問が必要(NFR-4 と衝突、allowlist-line-pin-stale の管理面も増える)。帰結: 再実装+全検証再実行+allowlist PR 同乗
- **C案: その他(票コメント指定)**

## 逸脱2: t-learnings-persist-seam の assert 更新

**申告 verbatim**: 「旧バグ挙動を pin していた assert を修正後挙動へ更新(FR-1b の必須帰結、申告)」— _cloneId 単一値前提の assert が Map 化(FR-1b)で必然的に変わる。

- **A案: 承認** — 旧 assert は欠陥挙動の pin であり、修正後挙動への更新はバグ修正の定義そのもの。帰結: なし(実施済みの追認)
- **B案: 旧 assert 併存の互換テスト追加** — org.md Forbidden(要求されない互換レイヤー)に抵触見込み。非推奨
- **C案: その他**

conductor 所見: 両逸脱とも A 推奨(逸脱1 は NFR-4 との要件間衝突の実測解消、逸脱2 は必須帰結)。ただし裁定は選挙に委ねる。
