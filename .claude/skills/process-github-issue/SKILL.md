---
name: process-github-issue
description: GitHub Issues のタスクを自動処理するスキル。「イシューを処理して」「次の issue をやって」「GitHub の issue を対応して」といったリクエストで使用する。
---

# process-github-issue

GitHub Issues のオープンなイシューを自動選択し、すべての作業をサブエージェントに委任するワークフロースキルです。

## ワークフロー概要

メインセッションはサブエージェントを起動するだけ。以下のすべての処理はサブエージェントが担う:

```
イシュー取得 → processing ラベル付与 → worktree 作成 → 実装・コミット → PR 作成 → worktree 削除
```

---

## サブエージェントへの指示

Agent ツールでサブエージェントを起動し、以下の指示をそのまま渡す:

```
以下のワークフローに従って GitHub Issue を1件処理してください。

## Step 1: イシューの取得

対象: open かつ `processing` ラベルなし、番号が最も小さいもの

gh issue list \
  --state open \
  --limit 1 \
  --json number,title,body,labels \
  --jq '[.[] | select(.labels | map(.name) | contains(["processing"]) | not)] | sort_by(.number) | first'

対象イシューが存在しない場合は「処理対象のイシューがありません」と報告して終了する。

## Step 2: processing ラベルの付与

並行処理防止のため、他の操作より先にラベルを付与する:

gh issue edit <issue-number> --add-label "processing"

## Step 3: ブランチと worktree の作成

ブランチ名の規則: `issue-<number>-<slug>`
- slug: イシュータイトルから生成（英小文字・数字・ハイフンのみ、連続ハイフンを1つに、最大 40 文字）
- 例: issue-42-add-user-authentication

# リモートリポジトリの最新情報を取得
git fetch origin

# ブランチを origin/main から作成
git branch issue-<number>-<slug> origin/main

# worktree を作成
git worktree add .claude/worktrees/issue-<number> issue-<number>-<slug>

## Step 4: 実装

worktree 内（.claude/worktrees/issue-<number>）で作業する。
イシューの内容に従って実装し、変更をコミットする。

### git 操作の注意事項

worktree 内での git 操作は `git -C` オプションを使用し、`cd` を使わずに行うこと:

```
# 良い例: git -C でパスを指定
git -C .claude/worktrees/issue-<number> add <file>
git -C .claude/worktrees/issue-<number> commit -m "..."

# 悪い例: cd && git の組み合わせ（sandbox モードで確認が増える）
cd .claude/worktrees/issue-<number> && git add <file>
```

また、必要な場合を除き `&&` によるコマンドの連結も避けること。

コミットメッセージの末尾には必ず以下を含めること:

Closes #<issue-number>

## Step 5: PR の作成

gh pr create \
  --title "<PRタイトル>" \
  --body "## 概要

<変更内容の説明>

## 関連イシュー

Closes #<issue-number>" \
  --head issue-<number>-<slug>

PR タイトルと説明はイシューの内容と実装内容を踏まえて適切に作成すること。

## Step 6: worktree の削除

git worktree remove .claude/worktrees/issue-<number>

ブランチは削除しない（PR のために残す）。

## エラーハンドリング

いずれかのステップで失敗した場合:
1. `processing` ラベルを外す: gh issue edit <number> --remove-label "processing"
2. worktree が作成済みなら削除: git worktree remove --force .claude/worktrees/issue-<number>
3. ブランチが作成済みでも削除しない
4. エラー内容と残存状態を報告する
```
