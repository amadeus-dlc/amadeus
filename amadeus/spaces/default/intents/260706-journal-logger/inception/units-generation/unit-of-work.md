# Unit of Work — 260706-journal-logger（Issue #557）

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)（FR-1〜FR-5、NFR-1〜3）。

## Unit 一覧

| Unit ID | 名称 | 責務 | 対応 FR | 配備モデル | 規模 |
|---|---|---|---|---|---|
| u001-journal-logger | journal 契約と logger 導入 | 契約 doc・validator 検査（TDD）・手順書 + 役割 prompt・#556 移行・チェックリストの全納品と検証 | FR-1〜FR-5 | 埋め込み（単独デプロイなし。workspace 成果物 + validator 拡張 + 文書。配布は既存 promote / installer 経路のまま） | M（文書 4 種に加え validator の TDD サイクル（eval RED → 実装 → promote）と #556 実データ移行を含む複数納品面のため、純 docs の S 前例より一段上と判定。単一 worktree 直列で完了） |

## 単一 Unit の根拠

- FR 間に強い内容依存がある: FR-1（契約 = 形式定義）が FR-2（validator 検査対象）と FR-4（移行エントリの形式）を確定し、FR-3（ack 形式）も契約を参照する。分割すると形式定義の二重管理が生じる。
- 変更対象（journal/ 新設、validator、手順書、eval）に他 Intent との接触がない（engineer3 非接触確定）。
- 規模 M で単一 worktree 直列に収まる。

## Unit 境界

- 含む: FR-1〜FR-5 と検証（NFR-1）。
- 含まない: scope-document のスコープ外 5 項目。

## 実装上の制約（unit レベル）

- 追記専用（NFR-2 = 生成後エントリの書き換え禁止、昇格スタンプ追記のみ）。
- 変更対象は journal/ 新設・validator（skills + 昇格先）・手順書類・eval に限定（NFR-3）。
- constraint-register C-1〜C-7（実 spawn は人間操作、定着決定権なし、promote 経由ほか）に従う。
- 接触面: engineer3 の非接触確定（#525+#527+#560 は validator に一切触れない）。audit の記録 = intent-capture 宛 DECISION_RECORDED（2026-07-06T08:49:18Z、ディスパッチ付帯指示）と gate 承認 decision（2026-07-06T08:51:43Z、非接触確定の確認を含む）。原文は agmsg 回答（08:49 台受信）。
