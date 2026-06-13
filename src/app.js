const API_BASE = "https://api.normies.art";
const BOARD_SIZE = 24;
const TOKEN_COUNT = 10000;
const CACHE_VERSION = "v1-original";
const CACHE_KEY = "guessTheNormieCache";
const RECENT_DISCOVERED_KEY = "guessTheNormieRecentDiscovered";
const RECENT_DISCOVERED_LIMIT = 12;

const state = {
  mode: "beginner",
  boardType: "random",
  walletAddress: "",
  walletOwnedCount: 0,
  setupMessage: "",
  emptyWalletAddress: "",
  board: [],
  secret: null,
  remaining: new Set(),
  manuallyHidden: new Set(),
  askedQuestions: new Set(),
  questions: 0,
  hints: 0,
  wrongGuesses: 0,
  lastAnswer: "",
  history: [],
  ended: false,
  endReason: "",
  gameResult: null,
};

const beginnerQuestions = [
  {
    id: "type-human",
    label: "Is your Normie a human?",
    test: (traits) => getTrait(traits, "Type") === "Human",
  },
  {
    id: "type-cat",
    label: "Is your Normie a cat?",
    test: (traits) => getTrait(traits, "Type") === "Cat",
  },
  {
    id: "type-alien",
    label: "Is your Normie an alien?",
    test: (traits) => getTrait(traits, "Type") === "Alien",
  },
  {
    id: "type-agent",
    label: "Is your Normie an agent?",
    test: (traits) => getTrait(traits, "Type") === "Agent",
  },
  {
    id: "glasses",
    label: "Does your Normie wear glasses?",
    test: (traits) => includesAny(getTrait(traits, "Eyes"), ["glasses", "sunglasses", "goggles", "shades"]),
  },
  {
    id: "facial-hair",
    label: "Does your Normie have facial hair?",
    test: (traits) => includesAny(getTrait(traits, "Facial Feature"), ["beard", "mustache", "moustache", "goatee"]),
  },
  {
    id: "headwear",
    label: "Does your Normie wear something on the head?",
    test: (traits) => includesAny(getTrait(traits, "Hair Style"), ["hat", "cap", "beanie", "hood", "crown", "helmet"]),
  },
  {
    id: "accessory",
    label: "Does your Normie have an accessory?",
    test: (traits) => {
      const accessory = getTrait(traits, "Accessory");
      return accessory && !["none", "no accessory", "n/a"].includes(accessory.toLowerCase());
    },
  },
  {
    id: "happy",
    label: "Does your Normie look happy?",
    test: (traits) => includesAny(getTrait(traits, "Expression"), ["happy", "smile", "joy", "laugh", "grin"]),
  },
];

const app = document.querySelector("#app");

renderSetup();

function renderSetup() {
  const cacheCount = getCachedNormieCount();
  const recentDiscovered = getRecentDiscovered();
  const modeButtonClass = (mode) => (state.mode === mode ? "mode-card active" : "mode-card");

  app.innerHTML = `
    <main class="home shell">
      <header class="home-header">
        <div class="brand">
          <div class="logo">GN</div>
          <div>
            <h1>Guess the Normie</h1>
            <p class="subtitle">Official-trait deduction game for the Normies universe.</p>
          </div>
        </div>
        <nav class="home-nav" aria-label="Home navigation">
          <a href="https://www.normies.art/" target="_blank" rel="noreferrer">Normies</a>
          <a href="https://opensea.io/collection/normies" target="_blank" rel="noreferrer">OpenSea</a>
          <a href="https://x.com/normiesART" target="_blank" rel="noreferrer">Normies X</a>
          <a href="https://x.com/serc1n" target="_blank" rel="noreferrer">Serc X</a>
        </nav>
      </header>

      <section class="home-grid">
        <div class="launch-panel">
          <p class="eyebrow">Start a run</p>
          <h2>Find the hidden Normie.</h2>
          <p class="subtitle">Ask yes/no questions using official API traits. Play a random board or paste a wallet address to bring owned Normies into the run.</p>

          <div class="mode-grid">
            <button class="${modeButtonClass("beginner")}" data-mode="beginner">
              <strong>Beginner</strong>
              Natural questions, trait families, and helpful hints.
            </button>
            <button class="${modeButtonClass("hardcore")}" data-mode="hardcore">
              <strong>Hardcore</strong>
              Exact API traits. Wrong final guess ends the game.
            </button>
          </div>

          <div class="launch-actions">
            <button id="start-game">Start Random Board</button>
          </div>

          <div class="wallet-box">
            <label for="wallet-address">Read-only Wallet Board</label>
            <div class="wallet-row">
              <input id="wallet-address" type="text" value="${escapeHtml(state.walletAddress)}" placeholder="0x..." spellcheck="false" />
              <button id="start-wallet-game">Start Wallet Board</button>
            </div>
            <p class="subtitle">${state.setupMessage || "No connection, no signature. Paste an address and play with its Normies first."}</p>
          </div>
        </div>

        <aside class="status-panel">
          <p class="eyebrow">Prototype status</p>
          <div class="status-list">
            <div><span>Local cache</span><strong>${cacheCount}</strong></div>
            <div><span>Discord auth</span><strong>soon</strong></div>
            <div><span>Daily challenge</span><strong>soon</strong></div>
            <div><span>Best of 3</span><strong>soon</strong></div>
          </div>
          <div class="setup-actions">
            <button id="clear-cache">Clear Local Cache</button>
          </div>
        </aside>
      </section>

      <section class="recent-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Community memory</p>
            <h2>Recently Discovered</h2>
          </div>
          <p class="subtitle">Last ${RECENT_DISCOVERED_LIMIT} secrets found on this browser.</p>
        </div>
        <div class="recent-strip">
          ${
            recentDiscovered.length
              ? recentDiscovered.map(renderRecentNormie).join("")
              : renderRecentPlaceholders()
          }
        </div>
      </section>

      <section class="soon-band">
        <span>Discord Leaderboard</span>
        <span>Verified players only</span>
        <span>Daily Challenge</span>
        <span>Best of 3</span>
        <span>Visit Normies</span>
      </section>

      <footer class="home-footer">
        <span>made with &lt;3 by @LaurentMoulin</span>
        <span>support wallet ---</span>
        <span>ETH ---</span>
        <span>BTC ---</span>
        <span>Normies floor ---</span>
      </footer>
    </main>
    ${state.emptyWalletAddress ? renderEmptyWalletModal() : ""}
  `;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("#start-game").addEventListener("click", startGame);
  document.querySelector("#start-wallet-game").addEventListener("click", startWalletGame);
  document.querySelector("#wallet-address").addEventListener("input", (event) => {
    state.walletAddress = event.target.value.trim();
    state.setupMessage = "";
  });
  document.querySelector("#clear-cache").addEventListener("click", clearNormieCache);

  const tryAnotherWallet = document.querySelector("#try-another-wallet");
  if (tryAnotherWallet) {
    tryAnotherWallet.addEventListener("click", () => {
      state.emptyWalletAddress = "";
      renderSetup();
    });
  }

  const emptyRandom = document.querySelector("#empty-wallet-random");
  if (emptyRandom) emptyRandom.addEventListener("click", startGame);
}

function renderRecentNormie(item) {
  return `
    <article class="recent-normie">
      <img src="${escapeHtml(item.image)}" alt="Normie #${item.tokenId}" loading="lazy" />
      <span>#${item.tokenId}</span>
      <small>${capitalize(item.mode)} ${item.score}</small>
    </article>
  `;
}

function renderRecentPlaceholders() {
  return Array.from({ length: 8 })
    .map(
      () => `
        <article class="recent-normie placeholder">
          <div></div>
          <span>---</span>
          <small>not found yet</small>
        </article>
      `,
    )
    .join("");
}

async function startGame() {
  state.boardType = "random";
  state.walletOwnedCount = 0;
  app.innerHTML = renderLoadingScreen("Building the board...", "Fetching Normies and balancing traits.");

  resetGame();

  try {
    state.board = await buildBalancedBoard();
    await prepareBoardImages(state.board);
    state.secret = state.board[Math.floor(Math.random() * state.board.length)];
    state.remaining = new Set(state.board.map((normie) => normie.id));
    renderGame();
  } catch (error) {
    app.innerHTML = `
      <main class="setup shell">
        <section class="setup-panel">
          <h1>Could not load the board</h1>
          <p class="subtitle">${escapeHtml(error.message)}</p>
          <button id="retry">Try Again</button>
        </section>
      </main>
    `;
    document.querySelector("#retry").addEventListener("click", startGame);
  }
}

async function startWalletGame() {
  const address = state.walletAddress.trim();
  if (!isValidEthereumAddress(address)) {
    state.setupMessage = "Enter a valid 0x Ethereum address.";
    renderSetup();
    return;
  }

  app.innerHTML = renderLoadingScreen(
    "Building the wallet board...",
    "Reading owned Normies and filling the board with wild Normies.",
  );

  resetGame();
  state.boardType = "wallet";
  state.walletAddress = address;

  try {
    const tokenIds = await fetchWalletTokenIds(address);
    if (tokenIds.length === 0) {
      state.emptyWalletAddress = address;
      state.boardType = "random";
      renderSetup();
      return;
    }

    state.walletOwnedCount = tokenIds.length;
    state.board = await buildWalletBoard(tokenIds);
    await prepareBoardImages(state.board);
    state.secret = state.board[Math.floor(Math.random() * state.board.length)];
    state.remaining = new Set(state.board.map((normie) => normie.id));
    renderGame();
  } catch (error) {
    state.boardType = "random";
    app.innerHTML = `
      <main class="setup shell">
        <section class="setup-panel">
          <h1>Could not load the wallet board</h1>
          <p class="subtitle">${escapeHtml(error.message)}</p>
          <button id="retry-wallet">Try Again</button>
          <button id="back-setup">Back</button>
        </section>
      </main>
    `;
    document.querySelector("#retry-wallet").addEventListener("click", startWalletGame);
    document.querySelector("#back-setup").addEventListener("click", renderSetup);
  }
}

function renderLoadingScreen(title, subtitle) {
  return `
    <main class="setup shell">
      <section class="setup-panel loading-panel">
        <div class="logo-loader" aria-hidden="true">
          ${renderLogoPixels()}
        </div>
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </section>
    </main>
  `;
}

function renderLogoPixels() {
  const logoRows = [
    "000000000",
    "000000000",
    "000111110",
    "000100010",
    "001100010",
    "001001010",
    "001001010",
    "001001010",
    "000000000",
  ];
  let order = 0;
  return logoRows
    .flatMap((row) =>
      [...row].map((cell) => {
        const isLit = cell === "1";
        const style = isLit ? ` style="--i:${order++}"` : "";
        return `<span class="${isLit ? "lit" : ""}"${style}></span>`;
      }),
    )
    .join("");
}

function resetGame() {
  state.board = [];
  state.secret = null;
  state.remaining = new Set();
  state.manuallyHidden = new Set();
  state.askedQuestions = new Set();
  state.questions = 0;
  state.hints = 0;
  state.wrongGuesses = 0;
  state.lastAnswer = "";
  state.history = [];
  state.ended = false;
  state.endReason = "";
  state.gameResult = null;
}

async function buildBalancedBoard() {
  // Try fresh API Normies first; fall back to cached originals if the API is limited.
  const pool = await buildCandidatePool(42);
  return selectBalancedSubset(pool);
}

async function buildWalletBoard(tokenIds) {
  const owned = [];
  const seen = new Set();

  for (const id of shuffle(tokenIds).slice(0, Math.max(BOARD_SIZE, tokenIds.length))) {
    const normie = await fetchNormie(id);
    if (!normie || seen.has(normie.id)) continue;
    seen.add(normie.id);
    owned.push(normie);
    if (owned.length >= BOARD_SIZE && tokenIds.length >= BOARD_SIZE) break;
  }

  const selectedOwned = owned.length > BOARD_SIZE ? selectBalancedSubset(owned) : owned.slice(0, BOARD_SIZE);
  const selectedIds = new Set(selectedOwned.map((normie) => normie.id));

  if (selectedOwned.length >= BOARD_SIZE) return selectedOwned.slice(0, BOARD_SIZE);

  const fillerPool = (await buildCandidatePool(42)).filter((normie) => !selectedIds.has(normie.id));
  return selectBalancedSubset([...selectedOwned, ...fillerPool]);
}

function selectBalancedSubset(pool) {
  const selected = [];

  for (const normie of pool) {
    if (selected.length >= BOARD_SIZE) break;
    if (selected.length < 8 || improvesBalance(selected, normie)) {
      selected.push(normie);
    }
  }

  for (const normie of pool) {
    if (selected.length >= BOARD_SIZE) break;
    if (!selected.some((item) => item.id === normie.id)) {
      selected.push(normie);
    }
  }

  if (selected.length < BOARD_SIZE) {
    throw new Error("Not enough Normies are available yet. The API may be rate-limited; wait a minute or try again after more Normies are cached.");
  }

  return shuffle(selected.slice(0, BOARD_SIZE));
}

async function fetchWalletTokenIds(address) {
  let payload;
  try {
    const response = await fetch(`${API_BASE}/holders/${address}`);
    if (!response.ok) throw new Error("Wallet lookup failed.");
    payload = await response.json();
  } catch {
    throw new Error("Could not read this wallet from the Normies API.");
  }

  if (!Array.isArray(payload.tokenIds)) {
    throw new Error("Wallet lookup returned an unexpected format.");
  }

  return payload.tokenIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id >= 0 && id < TOKEN_COUNT);
}

function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function renderEmptyWalletModal() {
  return `
    <div class="end-screen">
      <section class="end-card">
        <h2>No Normies found</h2>
        <p>This wallet does not hold any Normies yet.</p>
        <p class="subtitle">You definitely should grab one :)</p>
        <div class="actions" style="margin-top: 16px;">
          <button id="empty-wallet-random">Start Random Board</button>
          <button id="try-another-wallet">Try Another Wallet</button>
        </div>
      </section>
    </div>
  `;
}

async function buildCandidatePool(size) {
  const pool = [];
  const seen = new Set();
  let attempts = 0;

  while (pool.length < size && attempts < size * 3) {
    attempts += 1;
    const id = Math.floor(Math.random() * TOKEN_COUNT);
    if (seen.has(id)) continue;
    seen.add(id);

    const normie = await fetchNormieFromApi(id);
    if (normie) pool.push(normie);
  }

  if (pool.length >= BOARD_SIZE) return pool;

  for (const normie of shuffle(getCachedNormies())) {
    if (pool.length >= size) break;
    if (seen.has(normie.id)) continue;
    seen.add(normie.id);
    pool.push(normie);
  }

  return pool;
}

async function fetchNormie(id) {
  // Original traits/images are stable enough for localStorage caching.
  const cached = readCachedNormie(id);
  if (cached) return cached;
  return fetchNormieFromApi(id);
}

async function fetchNormieFromApi(id) {
  let traitPayload;
  try {
    const response = await fetch(`${API_BASE}/normie/${id}/traits`);
    if (!response.ok) return null;
    traitPayload = await response.json();
  } catch {
    return null;
  }

  const traits = normalizeTraits(traitPayload.attributes || []);

  const normie = {
    id,
    name: `Normie #${id}`,
    image: `${API_BASE}/normie/${id}/original/image.svg`,
    fallbackImage: `${API_BASE}/normie/${id}/original/image.png`,
    traits,
  };

  writeCachedNormie(normie);
  return normie;
}

async function prepareBoardImages(board) {
  await Promise.all(board.map(prepareNormieImage));
}

async function prepareNormieImage(normie) {
  if (await canLoadImage(normie.image)) return;
  if (normie.fallbackImage && (await canLoadImage(normie.fallbackImage))) {
    normie.image = normie.fallbackImage;
    writeCachedNormie(normie);
  }
}

function canLoadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      resolve(false);
    }, 6000);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    image.src = src;
  });
}

function readNormieCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    if (cache.version !== CACHE_VERSION || !cache.normies) return { version: CACHE_VERSION, normies: {} };
    return cache;
  } catch {
    return { version: CACHE_VERSION, normies: {} };
  }
}

function writeNormieCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function readCachedNormie(id) {
  const cache = readNormieCache();
  const normie = cache.normies[String(id)];
  if (!normie) return null;
  return normalizeCachedNormie(normie);
}

function writeCachedNormie(normie) {
  const cache = readNormieCache();
  cache.normies[String(normie.id)] = {
    ...normie,
    cachedAt: new Date().toISOString(),
  };
  writeNormieCache(cache);
}

function getCachedNormieCount() {
  return Object.keys(readNormieCache().normies).length;
}

function getCachedNormies() {
  return Object.values(readNormieCache().normies).map(normalizeCachedNormie);
}

function normalizeCachedNormie(normie) {
  return {
    ...normie,
    fallbackImage: normie.fallbackImage || `${API_BASE}/normie/${normie.id}/original/image.png`,
  };
}

function clearNormieCache() {
  localStorage.removeItem(CACHE_KEY);
  renderSetup();
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function improvesBalance(board, candidate) {
  const type = getTrait(candidate.traits, "Type") || "Unknown";
  const gender = getTrait(candidate.traits, "Gender") || "Unknown";
  const typeCounts = countTrait(board, "Type");
  const genderCounts = countTrait(board, "Gender");
  const maxType = Math.ceil(BOARD_SIZE * 0.55);
  const maxGender = Math.ceil(BOARD_SIZE * 0.5);

  if ((typeCounts[type] || 0) >= maxType) return false;
  if ((genderCounts[gender] || 0) >= maxGender) return false;
  return true;
}

function normalizeTraits(attributes) {
  const traits = {};
  for (const item of attributes) {
    const key = item.trait_type || item.type || item.key || item.name;
    const value = item.value;
    if (key && value !== undefined && value !== null) {
      traits[key] = String(value);
    }
  }
  return traits;
}

function renderGame() {
  const questionPanel = state.mode === "beginner" ? renderBeginnerQuestions() : renderHardcoreQuestions();
  const endScreen = state.ended ? renderEndScreen() : "";
  const activeCount = getActiveNormies().length;
  const boardLabel =
    state.boardType === "wallet"
      ? `Wallet board - ${Math.min(state.walletOwnedCount, BOARD_SIZE)} owned Normies`
      : "Random board";

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="logo">GN</div>
          <div>
            <h1>Guess the Normie</h1>
            <p class="subtitle">${capitalize(state.mode)} mode - ${boardLabel}</p>
          </div>
        </div>
        <button id="new-game">New Game</button>
      </header>

      <section class="game">
        <div class="board">
          ${state.board.map(renderCard).join("")}
        </div>

        <aside class="side">
          <section class="panel">
            <h2>Run</h2>
            <div class="stats">
              <div class="stat"><span>Left</span><strong>${activeCount}</strong></div>
              <div class="stat"><span>Questions</span><strong>${state.questions}</strong></div>
              <div class="stat"><span>Hints</span><strong>${state.hints}</strong></div>
              <div class="stat"><span>Score</span><strong>${calculateScore()}</strong></div>
            </div>
            <p class="result">${state.lastAnswer}</p>
          </section>

          ${questionPanel}

          <section class="panel">
            <h2>Hint</h2>
            <p class="subtitle hint-cost">Each hint costs 150 points.</p>
            <div class="actions">
              <button id="hint-question">Suggest a strong question (-150)</button>
              <button id="hint-distribution">Show trait distribution (-150)</button>
            </div>
          </section>

          <section class="panel">
            <h2>History</h2>
            <div class="history">
              ${state.history.length ? state.history.map((item) => `<div>${escapeHtml(item)}</div>`).join("") : `<p class="subtitle">No questions yet.</p>`}
            </div>
          </section>
        </aside>
      </section>
    </main>
    ${endScreen}
  `;

  document.querySelector("#new-game").addEventListener("click", renderSetup);
  document.querySelector("#hint-question").addEventListener("click", suggestQuestion);
  document.querySelector("#hint-distribution").addEventListener("click", showDistribution);

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => askBeginnerQuestion(button.dataset.question));
  });

  const askExact = document.querySelector("#ask-exact");
  if (askExact) askExact.addEventListener("click", askHardcoreQuestion);

  document.querySelectorAll("[data-guess]").forEach((button) => {
    button.addEventListener("click", () => makeGuess(Number(button.dataset.guess)));
  });

  document.querySelectorAll("[data-toggle-hidden]").forEach((button) => {
    button.addEventListener("click", () => toggleManualHidden(Number(button.dataset.toggleHidden)));
  });

  const playAgain = document.querySelector("#play-again");
  if (playAgain) playAgain.addEventListener("click", state.boardType === "wallet" ? startWalletGame : startGame);

  const newSetup = document.querySelector("#new-setup");
  if (newSetup) newSetup.addEventListener("click", renderSetup);
}

function renderCard(normie) {
  const answerEliminated = !state.remaining.has(normie.id);
  const manuallyHidden = state.manuallyHidden.has(normie.id);
  const eliminated = answerEliminated || manuallyHidden;
  const canRestore = manuallyHidden && !answerEliminated;
  return `
    <article class="card ${eliminated ? "eliminated" : ""} ${manuallyHidden ? "manual" : ""}">
      ${renderNormieImage(normie)}
      <div class="token">
        <span>#${normie.id}</span>
        <button data-toggle-hidden="${normie.id}" ${state.ended || answerEliminated ? "disabled" : ""}>${canRestore ? "Restore" : "Hide"}</button>
        <button data-guess="${normie.id}" ${state.ended || eliminated ? "disabled" : ""}>Guess</button>
      </div>
    </article>
  `;
}

function renderBeginnerQuestions() {
  const ranked = getBeginnerQuestionPool().slice(0, 5);
  return `
    <section class="panel">
      <h2>Questions</h2>
      <div class="question-list">
        ${
          ranked.length
            ? ranked.map((question) => `<button data-question="${escapeHtml(question.id)}">${escapeHtml(question.label)}</button>`).join("")
            : `<p class="subtitle">No strong beginner question left. Use a hint, hide cards manually, or make a guess.</p>`
        }
      </div>
    </section>
  `;
}

function renderHardcoreQuestions() {
  const categories = getCategories();
  const firstCategory = categories[0] || "";
  const values = getValuesForCategory(firstCategory);

  return `
    <section class="panel">
      <h2>Exact Trait Question</h2>
      <div class="picker">
        <select id="category-select">
          ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
        </select>
        <select id="value-select">
          ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
        </select>
        <button id="ask-exact">Ask Exact Trait</button>
      </div>
    </section>
  `;
}

function askBeginnerQuestion(id) {
  const question = getBeginnerQuestionPool().find((item) => item.id === id);
  if (!question) return;
  applyQuestion(question.id, question.label, question.test);
}

function askHardcoreQuestion() {
  const category = document.querySelector("#category-select").value;
  const value = document.querySelector("#value-select").value;
  applyQuestion(`exact:${category}:${value}`, `${category} = ${value}?`, (traits) => getTrait(traits, category) === value);
}

function applyQuestion(id, label, test) {
  if (state.ended) return;

  const answer = test(state.secret.traits);
  state.askedQuestions.add(id);
  state.questions += 1;

  for (const normie of state.board) {
    if (!state.remaining.has(normie.id)) continue;
    if (test(normie.traits) !== answer) {
      state.remaining.delete(normie.id);
    }
  }

  state.lastAnswer = answer ? `<span class="ok">Yes.</span>` : `<span class="danger">No.</span>`;
  state.history.unshift(`${label} ${answer ? "Yes" : "No"} - ${getActiveNormies().length} left`);

  const active = getActiveNormies();
  if (active.length === 1) {
    const onlyId = active[0].id;
    makeGuess(onlyId);
    return;
  }

  renderGame();
}

function makeGuess(id) {
  if (state.ended) return;

  if (id === state.secret.id) {
    state.ended = true;
    state.endReason = "You found the Normie.";
    saveLocalScore();
    renderGame();
    return;
  }

  state.wrongGuesses += 1;
  state.history.unshift(`Wrong guess: #${id}`);

  if (state.mode === "hardcore") {
    state.ended = true;
    state.endReason = "Wrong guess. Hardcore run over.";
    saveLocalScore();
  } else {
    state.remaining.delete(id);
    state.lastAnswer = `<span class="danger">Wrong guess. Keep going.</span>`;
  }

  renderGame();
}

function toggleManualHidden(id) {
  if (state.ended || !state.remaining.has(id)) return;

  if (state.manuallyHidden.has(id)) {
    state.manuallyHidden.delete(id);
    state.history.unshift(`Restored #${id}`);
    state.lastAnswer = `#${id} is back on the board.`;
  } else {
    state.manuallyHidden.add(id);
    state.history.unshift(`Manually hidden #${id}`);
    state.lastAnswer = `#${id} hidden manually.`;
  }

  renderGame();
}

function suggestQuestion() {
  if (state.ended) return;
  state.hints += 1;

  if (state.mode === "beginner") {
    const best = getBeginnerQuestionPool()[0];
    state.lastAnswer = best ? `Hint: try "${escapeHtml(best.label)}"` : "Hint: no strong beginner question left.";
  } else {
    const best = findBestExactQuestion();
    state.lastAnswer = best ? `Hint: try ${escapeHtml(best.category)} = ${escapeHtml(best.value)}` : "Hint: no strong exact trait found.";
  }

  renderGame();
}

function showDistribution() {
  if (state.ended) return;
  state.hints += 1;
  const category = findBestDistributionCategory();

  if (!category) {
    state.lastAnswer = "No useful trait distribution found.";
    renderGame();
    return;
  }

  const counts = countTrait(getActiveNormies(), category);
  const text = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => `${escapeHtml(value)}: ${count}`)
    .join(" - ");
  state.lastAnswer = `${escapeHtml(category)}: ${text}`;
  renderGame();
}

function getBeginnerQuestionPool() {
  // Beginner starts with human-friendly questions, then falls back to exact traits.
  return rankQuestions([...beginnerQuestions, ...buildDynamicBeginnerQuestions()])
    .filter((question) => !state.askedQuestions.has(question.id))
    .filter((question) => splitScore(question.test) > 0);
}

function buildDynamicBeginnerQuestions() {
  const questions = [];
  for (const category of getCategories()) {
    for (const value of getValuesForCategory(category)) {
      const id = `dynamic:${category}:${value}`;
      questions.push({
        id,
        label: formatDynamicQuestion(category, value),
        test: (traits) => getTrait(traits, category) === value,
      });
    }
  }
  return questions;
}

function formatDynamicQuestion(category, value) {
  if (category === "Type") return `Is your Normie a ${value}?`;
  if (category === "Gender") return `Is your Normie ${value}?`;
  if (category === "Age") return `Is your Normie ${value}?`;
  if (category === "Accessory") return `Does your Normie have ${withArticle(value)}?`;
  if (category === "Eyes") return `Does your Normie have ${value}?`;
  if (category === "Expression") return `Is your Normie ${value}?`;
  if (category === "Facial Feature") return `Does your Normie have ${withArticle(value)}?`;
  if (category === "Hair Style") return `Does your Normie have ${value}?`;
  return `Does your Normie have ${value} in ${category}?`;
}

function withArticle(value) {
  const lower = value.toLowerCase();
  if (lower === "none" || lower.startsWith("no ")) return value;
  return /^[aeiou]/.test(lower) ? `an ${value}` : `a ${value}`;
}

function rankQuestions(questions) {
  return [...questions].sort((a, b) => splitScore(b.test) - splitScore(a.test));
}

function splitScore(test) {
  const remaining = getActiveNormies();
  const yes = remaining.filter((normie) => test(normie.traits)).length;
  const no = remaining.length - yes;
  if (yes === 0 || no === 0) return -1;
  return Math.min(yes, no);
}

function findBestExactQuestion() {
  let best = null;
  for (const category of getCategories()) {
    for (const value of getValuesForCategory(category)) {
      if (state.askedQuestions.has(`exact:${category}:${value}`)) continue;
      const score = splitScore((traits) => getTrait(traits, category) === value);
      if (!best || score > best.score) best = { category, value, score };
    }
  }
  return best;
}

function findBestDistributionCategory() {
  let best = null;
  for (const category of getCategories()) {
    const counts = Object.values(countTrait(getActiveNormies(), category));
    if (counts.length < 2) continue;
    const largest = Math.max(...counts);
    const score = state.remaining.size - largest;
    if (!best || score > best.score) best = { category, score };
  }
  return best?.category || null;
}

function getRemainingNormies() {
  return state.board.filter((normie) => state.remaining.has(normie.id));
}

function getActiveNormies() {
  return state.board.filter((normie) => state.remaining.has(normie.id) && !state.manuallyHidden.has(normie.id));
}

function getCategories() {
  const categories = new Set();
  for (const normie of getActiveNormies()) {
    Object.keys(normie.traits).forEach((key) => categories.add(key));
  }
  return [...categories].sort();
}

function getValuesForCategory(category) {
  const values = new Set();
  for (const normie of getActiveNormies()) {
    const value = getTrait(normie.traits, category);
    if (value) values.add(value);
  }
  return [...values].sort();
}

function countTrait(board, category) {
  const counts = {};
  for (const normie of board) {
    const value = getTrait(normie.traits, category) || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function getTrait(traits, key) {
  return traits[key] || "";
}

function includesAny(value, needles) {
  const lower = String(value || "").toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function calculateScore() {
  return getScoreBreakdown().score;
}

function getScoreBreakdown() {
  const questionPenalty = state.mode === "hardcore" ? 45 : 60;
  const questionCost = state.questions * questionPenalty;
  const hintCost = state.hints * 150;
  const wrongGuessCost = state.wrongGuesses * 300;
  const rawScore = 1000 - questionCost - hintCost - wrongGuessCost;

  return {
    base: 1000,
    questionPenalty,
    questionCost,
    hintPenalty: 150,
    hintCost,
    wrongGuessPenalty: 300,
    wrongGuessCost,
    rawScore,
    score: Math.max(0, Math.min(1000, Math.round(rawScore))),
  };
}

function saveLocalScore() {
  const result = buildGameResult();
  state.gameResult = result;
  if (result.outcome === "win") saveRecentDiscovered(result);

  const scores = JSON.parse(localStorage.getItem("guessTheNormieScores") || "[]");
  scores.push(result);
  localStorage.setItem("guessTheNormieScores", JSON.stringify(scores.slice(-50)));
}

function getRecentDiscovered() {
  try {
    const items = JSON.parse(localStorage.getItem(RECENT_DISCOVERED_KEY) || "[]");
    return Array.isArray(items) ? items.slice(0, RECENT_DISCOVERED_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRecentDiscovered(result) {
  const item = {
    tokenId: result.secretTokenId,
    image: state.secret.image,
    fallbackImage: state.secret.fallbackImage,
    mode: result.mode,
    boardType: result.boardType,
    score: result.score,
    discoveredAt: result.finishedAt,
  };
  const withoutDuplicate = getRecentDiscovered().filter((recent) => recent.tokenId !== item.tokenId);
  localStorage.setItem(
    RECENT_DISCOVERED_KEY,
    JSON.stringify([item, ...withoutDuplicate].slice(0, RECENT_DISCOVERED_LIMIT)),
  );
}

function buildGameResult() {
  const scoreBreakdown = getScoreBreakdown();
  const boardTokenIds = state.board.map((normie) => normie.id);
  const walletOwnedInBoard =
    state.boardType === "wallet" ? Math.min(state.walletOwnedCount, BOARD_SIZE) : 0;

  return {
    mode: state.mode,
    boardType: state.boardType,
    outcome: state.endReason.includes("found") ? "win" : "loss",
    score: scoreBreakdown.score,
    scoreBreakdown,
    questions: state.questions,
    hints: state.hints,
    wrongGuesses: state.wrongGuesses,
    secretTokenId: state.secret.id,
    boardTokenIds,
    walletAddress: state.boardType === "wallet" ? state.walletAddress : "",
    walletOwnedCount: state.boardType === "wallet" ? state.walletOwnedCount : 0,
    walletOwnedInBoard,
    wildCount: BOARD_SIZE - walletOwnedInBoard,
    finishedAt: new Date().toISOString(),
  };
}

function renderEndScreen() {
  const result = state.gameResult || buildGameResult();
  const scores = JSON.parse(localStorage.getItem("guessTheNormieScores") || "[]");
  const best = scores
    .filter((score) => score.mode === result.mode && score.boardType === result.boardType)
    .sort((a, b) => b.score - a.score)[0];
  const breakdown = result.scoreBreakdown;
  const boardLabel =
    result.boardType === "wallet"
      ? `Wallet - ${result.walletOwnedInBoard} owned / ${result.wildCount} wild`
      : "Random";
  const boardBadge = result.boardType === "wallet" ? "Wallet Board" : "Random Board";
  const outcomeBadge = result.outcome === "win" ? "Victory" : "Game Over";

  return `
    <div class="end-screen">
      <section class="end-card">
        <div class="end-layout">
          <div class="secret-reveal">
            ${renderNormieImage(state.secret)}
            <span>Secret #${result.secretTokenId}</span>
          </div>
          <div>
            <h2>${escapeHtml(state.endReason)}</h2>
            <p class="score-label">Final Score</p>
            <p class="end-score">${result.score}</p>
            <p class="subtitle">${capitalize(result.mode)} - ${boardLabel}</p>
          </div>
        </div>

        <div class="score-breakdown">
          <div><span>Base</span><strong>${breakdown.base}</strong></div>
          <div><span>Questions (${result.questions} x ${breakdown.questionPenalty})</span><strong>${formatCost(breakdown.questionCost)}</strong></div>
          <div><span>Hints (${result.hints} x ${breakdown.hintPenalty})</span><strong>${formatCost(breakdown.hintCost)}</strong></div>
          <div><span>Wrong guesses (${result.wrongGuesses} x ${breakdown.wrongGuessPenalty})</span><strong>${formatCost(breakdown.wrongGuessCost)}</strong></div>
        </div>

        <div class="result-meta">
          <span>${boardBadge}</span>
          <span>${outcomeBadge}</span>
          <span>Best ${capitalize(result.mode)} ${capitalize(result.boardType)}: ${best ? best.score : result.score}</span>
        </div>

        <div class="actions end-actions">
          <button id="play-again">Play Again</button>
          <button id="new-setup">New Setup</button>
        </div>
      </section>
    </div>
  `;
}

function renderNormieImage(normie) {
  const fallback = normie.fallbackImage ? ` data-fallback-src="${escapeHtml(normie.fallbackImage)}"` : "";
  return `<img src="${escapeHtml(normie.image)}" alt="${escapeHtml(normie.name)}"${fallback} />`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCost(value) {
  return value === 0 ? "0" : `-${value}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("change", (event) => {
  if (event.target.id !== "category-select") return;
  const valueSelect = document.querySelector("#value-select");
  valueSelect.innerHTML = getValuesForCategory(event.target.value)
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
});

document.addEventListener(
  "error",
  (event) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    const fallback = event.target.dataset.fallbackSrc;
    if (!fallback) return;
    event.target.dataset.fallbackSrc = "";
    event.target.src = fallback;
  },
  true
);
