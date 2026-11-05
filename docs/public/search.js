const DUCKDB = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm";
const MAX_RESULTS = 20;

const overlay = document.querySelector("#search-overlay");
const button = document.querySelector("#search-button");
const textbox = document.querySelector("#search-textbox");
const input = textbox.querySelector("input");
const status = document.querySelector("#search-status");
const list = document.querySelector("#search-results");

let engine;
let latest = 0;

function loadEngine() {
  engine ??= (async () => {
    const duckdb = await import(DUCKDB);
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" }),
    );
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);

    const [conn, index] = await Promise.all([
      db.connect(),
      fetch("/search-index.json").then((res) => {
        if (!res.ok) throw new Error(`search-index.json: ${res.status}`);
        return res.arrayBuffer();
      }),
    ]);
    await db.registerFileBuffer("search-index.json", new Uint8Array(index));
    // One statement per query: a later statement can't see a table an earlier
    // one in the same query creates.
    await conn.query(`LOAD fts`);
    await conn.query(`CREATE TABLE sections AS SELECT * FROM read_json('search-index.json')`);
    await conn.query(`
      PRAGMA create_fts_index('sections', 'id', 'page', 'heading', 'body',
        stemmer = 'porter', stopwords = 'english', ignore = '[^a-z0-9]+')
    `);
    // Every word on the site with its stem, for prefix and typo matching
    await conn.query(`
      CREATE TABLE words AS
        SELECT DISTINCT word, stem(word, 'porter') AS term
        FROM (
          SELECT unnest(regexp_split_to_array(
            lower(strip_accents(page || ' ' || heading || ' ' || body)), '[^a-z0-9]+'
          )) AS word
          FROM sections
        )
        WHERE length(word) > 1
    `);
    return conn;
  })();
  engine.catch(() => (engine = undefined));
  return engine;
}

/** Lowercase words, limited to the characters the index keeps. */
function tokenize(query) {
  return [...new Set(query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/))]
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * Returns the best sections for the query, and every site word the query
 * matched, for highlighting. Tokens only contain [a-z0-9], so they're safe to
 * put in the SQL text.
 */
async function search(conn, tokens) {
  const values = tokens.map((t) => `('${t}')`).join(", ");
  const expansions = await conn.query(`
    WITH tokens(token) AS (VALUES ${values})
    SELECT t.token, w.word, d.termid,
      CASE
        WHEN w.word = t.token OR w.term = stem(t.token, 'porter') THEN 1.0
        WHEN starts_with(w.word, t.token) THEN 0.75
        WHEN damerau_levenshtein(w.word, t.token) = 1 THEN 0.5
        ELSE 0.3
      END::DOUBLE AS weight -- a DECIMAL reaches JS as its unscaled integer
    FROM tokens t
    JOIN words w ON
      w.word = t.token
      OR w.term = stem(t.token, 'porter')
      OR (length(t.token) >= 3 AND starts_with(w.word, t.token))
      OR (length(t.token) >= 4 AND damerau_levenshtein(w.word, t.token)
        <= CASE WHEN length(t.token) >= 8 THEN 2 ELSE 1 END)
    JOIN fts_main_sections.dict d ON d.term = w.term
  `);
  const rows = expansions.toArray().map((r) => r.toJSON());
  const words = [...new Set(rows.map((r) => r.word))];
  if (!rows.length) return { results: [], words };

  // Highest weight per token and term
  const terms = new Map();
  for (const { token, termid, weight } of rows) {
    const key = `${token} ${termid}`;
    if (!terms.has(key) || terms.get(key).weight < weight) {
      terms.set(key, { token, termid: Number(termid), weight });
    }
  }
  const termValues = [...terms.values()]
    .map(({ token, termid, weight }) => `('${token}', ${termid}, ${weight}::DOUBLE)`)
    .join(", ");

  // BM25 with k1 = 1.2 and b = 0.75. Matches in a heading count three times,
  // and in a page title twice. Sections matching more of the query's words
  // rank first; BM25 orders sections that match the same number.
  //
  // A page's intro (the section under its h1) is boosted, so a page outranks
  // its own subsections. The boost is x1.5 plus up to x1.5 for how much of the
  // query the page title matches, then doubled when the query covers the whole
  // title. A title match counts at the match's weight, so a prefix or typo
  // boosts less than an exact word. A page whose title is exactly the query
  // (every word matching exactly, nothing left over) ranks above other
  // sections that match as many words, so "forms" finds Forms before Discard
  // Form even though Forms is short.
  const result = await conn.query(`
    WITH q(token, termid, weight) AS (VALUES ${termValues}),
    tf AS (
      SELECT t.docid, q.token, q.termid, any_value(q.weight) AS weight,
        sum(CASE f.field WHEN 'heading' THEN 3 WHEN 'page' THEN 2 ELSE 1 END) AS tf,
        max(CASE f.field WHEN 'page' THEN q.weight ELSE 0 END) AS title_weight
      FROM fts_main_sections.terms t
      JOIN q USING (termid)
      JOIN fts_main_sections.fields f USING (fieldid)
      GROUP BY ALL
    ),
    scored AS (
      SELECT tf.docid, tf.token,
        max(tf.weight
          * ln((s.num_docs - d.df + 0.5) / (d.df + 0.5) + 1)
          * tf.tf * 2.2 / (tf.tf + 1.2 * (0.25 + 0.75 * docs.len / s.avgdl))) AS score,
        max(tf.title_weight) AS title_weight
      FROM tf
      JOIN fts_main_sections.dict d USING (termid)
      JOIN fts_main_sections.docs docs USING (docid)
      CROSS JOIN fts_main_sections.stats s
      GROUP BY ALL
    ),
    ranked AS (
      SELECT docid, count(*) AS matched, sum(score) AS score,
        sum(title_weight) / ${tokens.length} AS title_match
      FROM scored GROUP BY docid
    )
    SELECT s.url, s.page, s.heading, s.body
    FROM (
      SELECT ranked.*, s.id,
        len(regexp_split_to_array(trim(regexp_replace(lower(s.page), '[^a-z0-9]+', ' ', 'g')), ' ')) AS title_words
      FROM ranked
      JOIN fts_main_sections.docs docs USING (docid)
      JOIN sections s ON s.id = docs.name
    ) r
    JOIN sections s USING (id)
    ORDER BY matched DESC,
      s.intro AND title_match = 1 AND ${tokens.length} >= title_words DESC,
      score * CASE WHEN s.intro THEN
        (1.5 + 1.5 * title_match) * (1 + least(1, title_match * ${tokens.length} / title_words))
      ELSE 1 END DESC
    LIMIT ${MAX_RESULTS}
  `);
  return { results: result.toArray().map((r) => r.toJSON()), words };
}

/** Appends text to an element, wrapping the matched words in <mark>. */
function appendHighlighted(el, text, pattern) {
  let last = 0;
  for (const match of pattern ? text.matchAll(pattern) : []) {
    el.append(text.slice(last, match.index));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    el.append(mark);
    last = match.index + match[0].length;
  }
  el.append(text.slice(last));
}

/** About 160 characters of the body, starting a little before the first match. */
function snippet(body, pattern) {
  const first = pattern ? body.search(pattern) : -1;
  if (first < 60) return body.length > 160 ? `${body.slice(0, 160)}…` : body;
  const start = body.lastIndexOf(" ", first - 40) + 1;
  const text = body.slice(start, start + 160);
  return `…${text}${start + 160 < body.length ? "…" : ""}`;
}

function render(results, words) {
  // Words are [a-z0-9] only, so they need no escaping
  const pattern = words.length
    ? new RegExp(`\\b(?:${words.sort((a, b) => b.length - a.length).join("|")})`, "gi")
    : null;
  list.replaceChildren(
    ...results.map(({ url, page, heading, body }) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url;
      a.dataset.overlay = "hide";
      const title = document.createElement("span");
      title.className = "search-result-title";
      const pageEl = document.createElement("span");
      pageEl.className = "search-result-page";
      appendHighlighted(pageEl, page, pattern);
      title.append(pageEl);
      if (heading) {
        title.append(" › ");
        appendHighlighted(title, heading, pattern);
      }
      a.append(title);
      if (body) {
        const text = document.createElement("span");
        text.className = "search-result-snippet";
        appendHighlighted(text, snippet(body, pattern), pattern);
        a.append(text);
      }
      li.append(a);
      return li;
    }),
  );
}

async function run(query) {
  const id = ++latest;
  const tokens = tokenize(query);
  if (!tokens.length) {
    list.replaceChildren();
    status.textContent = engine ? "" : "Loading search…";
    return;
  }
  try {
    if (!engine) status.textContent = "Loading search…";
    const conn = await loadEngine();
    const { results, words } = await search(conn, tokens);
    if (id !== latest) return;
    render(results, words);
    status.textContent = results.length
      ? `${results.length}${results.length === MAX_RESULTS ? "+" : ""} results`
      : `No results for “${query.trim()}”`;
  } catch (error) {
    if (id !== latest) return;
    console.error(error);
    list.replaceChildren();
    status.textContent = "Search couldn't load. Check your connection and try again.";
  }
}

function preload() {
  if (!input.value.trim()) status.textContent = engine ? "" : "Loading search…";
  loadEngine()
    .then(() => {
      if (!input.value.trim()) status.textContent = "";
    })
    .catch(() => {
      status.textContent = "Search couldn't load. Check your connection and try again.";
    });
}

button.addEventListener("click", preload);

document.addEventListener("keydown", async (event) => {
  if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey) {
    event.preventDefault();
    await customElements.whenDefined("orb-overlay");
    if (!overlay.open) {
      preload();
      overlay.show();
    }
  }
});

overlay.addEventListener("orbPresent", () => {
  input.focus();
  input.select();
});

textbox.addEventListener("orbValueChange", (event) => run(event.detail));

// Arrow keys move between the field and the results; Enter in the field opens
// the first result.
const links = () => [...list.querySelectorAll("a")];
input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    links()[0]?.focus();
  } else if (event.key === "Enter" && !event.isComposing) {
    links()[0]?.click();
  }
});
list.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const all = links();
  const index = all.indexOf(document.activeElement);
  const next = index + (event.key === "ArrowDown" ? 1 : -1);
  if (next < 0) input.focus();
  else all[Math.min(next, all.length - 1)].focus();
});
