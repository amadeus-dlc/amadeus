# Stakeholder Map — Team Mode 起動経路の堅牢化（#1476 / #1478）

## 直接の利害関係者

| ステークホルダー | 関心事 | 本 intent での影響 |
|---|---|---|
| Team Mode の利用者（本リポジトリのユーザー） | `team-up.sh` を叩いてから実際にチームへアタッチできるまでの時間。メンバー間メッセージが確実に届くこと | 起動時間がさらに短縮される（#1478）。一方 #1476 で検証が再有効化されると待機が復活しうるため、待機設計が利用者体験を直接左右する |
| チームメンバー（leader / engineer-1〜6） | agmsg monitor が確実に起動し、leader からの配信を取りこぼさないこと | #1476 が成功すれば #1384 の取りこぼしが検出・再送されるようになる。actas モードは role 単位の排他受信になるため、受信範囲が変わらないことの確認が要る |
| 本リポジトリの保守者 | 到達不能コードを残さないこと。テストが実挙動を検証すること | 検証機構が実際に働くようになるか、別指標へ切り替わる。テストのスタブ構造が解消される |

## 上流依存（変更対象外・read-only）

| 依存 | 所在 | 本 intent での関わり |
|---|---|---|
| agmsg スキル | `~/.agents/skills/agmsg/`（repo 外） | `watch.sh` / `delivery.sh` / `spawn.sh` / `lib/actas-lock.sh` / `session-start.sh` の実挙動に依存する。**本 intent では変更しない** — 外部 seam として実測のうえ利用する |
| herdr | 外部 CLI | pane 生成・送信。本 intent では変更しない |
| git | worktree 作成 | #1478 の並列化が `.git` の内部ロックに依存する |

## 影響しうる周辺機能（feasibility で実測）

| 機能 | 所在 | 懸念 |
|---|---|---|
| `despawn.sh` | agmsg | actas 登録されたロールの停止経路が変わらないか |
| `team-msg.sh` | 配布物 | 送信時の from ロール解決が actas 移行で変わらないか |
| `session-end.sh` | agmsg | `:194` で死んだセッションの sentinel を削除する。actas sentinel の生成が始まると削除経路が実際に走るようになる |
| role resume（`-c`） | `team-up.sh` | actas 排他ロックが前セッションのロックを保持している場合の再開挙動 |
| Codex 経路 | `team-up.sh` `codex_member_cmd` | 既に `$agmsg actas $role` を使用。claude 経路が同形になることで両経路が揃う（#1388 の同型ギャップとは別問題） |

## 意思決定者

ソロモード（`AMADEUS_OPERATING_MODE` 未設定）につき、設計判断・スコープ判断・マージ承認はすべてユーザー本人が行う。エージェント選挙・定足数・クロスレビュー2名の規則は適用しない。

## 本 intent が代弁しない立場

- **他ハーネス（Codex / Cursor / OpenCode / Kiro）の利用者**: 配布物としては11コピーを同期するが、Team Mode の実行経路は claude runtime を前提とする。Codex 経路の同型ギャップは #1388 が別途扱う。
- **agmsg の他利用者**: 本 intent は agmsg を変更しないため、agmsg 側の利用者への影響はない。
