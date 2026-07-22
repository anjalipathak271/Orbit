// Section 5.7 -- these two algorithms are implemented from scratch
// (no library does the ranking/sorting logic for us) as required by the
// assignment. Each includes its time/space complexity.

/**
 * Relevance-ranked search over task titles + descriptions.
 *
 * How it works: break the search query into words ("tokens"). For every
 * task, count how many times each token appears in the title (worth more)
 * and in the description (worth less). Add those up into a single score.
 * Tasks that don't match any token are dropped; the rest are sorted with
 * the highest score first.
 *
 * This is a simplified version of the "TF" (term frequency) part of the
 * classic TF-IDF ranking algorithm used by real search engines.
 *
 * Complexity: let n = number of tasks, m = number of query tokens,
 * L = average length of a task's title+description (in words).
 * Time:  O(n * m * L)  -- for each task, for each query token, scan the text.
 * Space: O(n)          -- one score per task, plus the sorted output array.
 */
export function rankTasksBySearch(tasks, query) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return tasks;

  const TITLE_WEIGHT = 3;
  const DESCRIPTION_WEIGHT = 1;

  const scored = tasks.map((task) => {
    const title = (task.title || "").toLowerCase();
    const description = (task.description || "").toLowerCase();

    let score = 0;
    for (const token of tokens) {
      score += countOccurrences(title, token) * TITLE_WEIGHT;
      score += countOccurrences(description, token) * DESCRIPTION_WEIGHT;
    }

    return { task, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.task);
}

function countOccurrences(text, token) {
  if (!token) return 0;
  let count = 0;
  let index = text.indexOf(token);
  while (index !== -1) {
    count++;
    index = text.indexOf(token, index + token.length);
  }
  return count;
}

/**
 * "Smart priority" ordering: sorts tasks by a weighted score combining
 * priority level, how close (or overdue) the due date is, and status.
 *
 * Scoring:
 *  - priority:  high = 30, medium = 20, low = 10
 *  - due date:  overdue tasks get a large bonus (most urgent);
 *               tasks due soon get a smaller bonus that shrinks the
 *               further away the due date is; no due date = 0 bonus
 *  - status:    "done" tasks are pushed to the very bottom regardless
 *               of priority/due date, since they no longer need attention
 *
 * Complexity: let n = number of tasks.
 * Time:  O(n log n)  -- computing each task's score is O(1), dominated by
 *                       the sort.
 * Space: O(n)         -- the sorted output array.
 */
export function sortTasksBySmartPriority(tasks) {
  const now = Date.now();

  function score(task) {
    if (task.status === "done") return -1000; // sinks to the bottom

    const priorityScore = { high: 30, medium: 20, low: 10 }[task.priority] ?? 15;

    let dueScore = 0;
    if (task.due_date) {
      const daysUntilDue = (new Date(task.due_date).getTime() - now) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 0) {
        dueScore = 20; // overdue -- most urgent
      } else if (daysUntilDue < 7) {
        dueScore = 15 - daysUntilDue; // due soon -- more urgent the closer it is
      }
    }

    return priorityScore + dueScore;
  }

  return [...tasks].sort((a, b) => score(b) - score(a));
}
