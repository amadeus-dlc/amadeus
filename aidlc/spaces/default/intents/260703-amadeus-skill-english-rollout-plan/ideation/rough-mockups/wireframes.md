# Wireframes：Amadeus skill 英語化実施計画

この Intent は UI を対象にしない。

そのため、「Wireframes」は #399 親 Issue と #395、#400、#401、#402 の完了証拠を追跡するシステム相互作用図として扱う。

## Issue 完了追跡の相互作用

Maintainer は #399 の計画 Intent を承認する。

Amadeus DLC 成果物は、子 Issue の順序、依存関係、完了証拠を記録する。

GitHub は PR merge または Issue close の状態を提供する。

Agent は、GitHub 上の状態を確認し、Amadeus DLC 成果物の追跡情報へ反映する。

```mermaid
flowchart TD
  maintainer["Maintainer"]
  intent["#399 計画 Intent"]
  artifacts["Amadeus DLC 成果物"]
  issue395["#395 方針確定"]
  issue400["#400 小さい土台 PR"]
  issue401["#401 AI-DLC v2 差分対応順序"]
  issue402["#402 残り展開単位"]
  github["GitHub Issue と PR"]
  evidence["完了証拠"]

  maintainer -->|承認する| intent
  intent -->|順序と依存関係を定義する| artifacts
  artifacts --> issue395
  issue395 -->|完了後に着手可能| issue400
  issue400 -->|完了後に着手可能| issue401
  issue401 -->|完了後に着手可能| issue402
  issue395 --> github
  issue400 --> github
  issue401 --> github
  issue402 --> github
  github -->|PR merge または Issue close| evidence
  evidence -->|追跡状態を更新する| artifacts
```

## 完了証拠の扱い

完了証拠は、対応 PR の merge または明示的な Issue close とする。

#401 は、#391、#392、#393、#394 の扱いが追跡できることを追加の確認点として持つ。

```mermaid
flowchart LR
  issue["対象 Issue"]
  pr["対応 PR"]
  merged["PR merge"]
  closed["Issue close"]
  done["完了扱い"]
  child["#391〜#394 の扱い"]

  issue --> pr
  pr --> merged
  issue --> closed
  merged --> done
  closed --> done
  issue -->|#401 の場合| child
  child --> done
```
