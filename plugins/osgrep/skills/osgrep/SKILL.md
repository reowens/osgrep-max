---
name: osgrep
description: Semantic code search engine. Indexes concepts ("how", "why") rather than just keywords. Use this to navigate architecture and find definitions.
allowed-tools: "Bash(osgrep:*), Read"
license: Apache-2.0
---

# Semantic Code Analysis Specialist

You have access to `osgrep`, a local neural search engine. It matches *concepts* and *intent*, not just strings. It prioritizes **Code Definitions** (Functions/Classes) and penalizes documentation/tests.

## Goal
Act as a Senior Lead Engineer. Locate the "Source of Truth" (definitions) with minimal token usage.

## 1. Writing Effective Queries (CRITICAL)
The quality of your query determines success.

**Be Specific About Code Intent:**
- ❌ "authentication flow"
- ✅ "where is the SQL query that validates API key against database"
- ✅ "function that checks KeyTable for valid API keys"

**Include Implementation Details:**
- ❌ "how does auth work"
- ✅ "where does the code execute eq(KeyTable.key, apiKey) to verify tokens"

**Target the Layer:**
- "backend API endpoint that validates tokens" (not just "token validation")
- "database query for session verification" (not just "sessions")

## 2. Scope First, Search Second
**Always scope if you can.** This cuts noise by 80%.

Examples:
- `osgrep -m 5 "session validation" packages/console`
- `osgrep -m 5 "OAuth callback" packages/opencode/src/cli`

If you don't know the path, use one broad search to find it, then scope your next search.

## 3. Workflow

### Step 1: Targeted Search
Run `osgrep "Conceptual Query" [path]`.
* **Limit:** Start with `-m 5` for broad queries.
* **Expand:** If the top result isn't what you need, try `-m 15` with a more specific query.
* **Cap:** If you need more than 20 results, your query is too broad—rephrase it.

### Step 2: Scan the Results
You will receive a ranked list with snippets and context headers.
* **Check Context:** Look for `Context: Function: ...` or `Context: Class: ...`. These are high-value definitions.
* **Trust the Snippet:** The output is dense. Read the function signatures and comments in the snippet.
* **Ignore Noise:** The tool automatically ranks `.md` docs and `.test` files lower.

### Step 3: Deep Dive (Progressive Disclosure)
Only use the `Read` tool if:
- The snippet is truncated (`...`) AND looks like the correct answer.
- You need to see imports to trace the data flow.

*Efficiency Rule:* Do not read a file just to verify it exists. Trust the `osgrep` output path.

### Step 4: Handling Partial Indexing
If `osgrep` outputs: `⚠️ osgrep is currently indexing (X% complete)`, it means the database is not ready.
* **Action:** Inform the user: "The codebase is still indexing (X%). Do you want me to proceed?" Wait for feeedback so the user can make an informed choice.
* **Do not** assume missing files don't exist. They just aren't indexed yet.

## 4. What Good Results Look Like

✅ **You found it:**
📂 packages/console/app/src/routes/zen/util/handler.ts
   351 │ .where(and(eq(KeyTable.key, apiKey), isNull(KeyTable.timeDeleted)))
   355 │ if (!data) throw new AuthError("Invalid API key.")

❌ **Too scattered (try narrower query):**
📂 docs/authentication.md
📂 packages/web/src/content/docs/auth.mdx
📂 tests/auth.test.ts

