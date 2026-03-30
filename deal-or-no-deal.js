(function () {
  var CASE_COUNT = 26;
  var AMOUNTS = [
    0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
    1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000,
    500000, 750000, 1000000
  ];
  var PICKS_PER_ROUND = [6, 5, 4, 3, 2, 2, 1, 1, 1];

  var el = {
    appWrap: document.getElementById("appWrap"),
    introText: document.getElementById("introText"),
    btnNewGame: document.getElementById("btnNewGame"),
    gameArea: document.getElementById("gameArea"),
    statusBar: document.getElementById("statusBar"),
    boxGrid: document.getElementById("boxGrid"),
    ladder: document.getElementById("ladder"),
    overlay: document.getElementById("overlay"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    offerAmount: document.getElementById("offerAmount"),
    modalActions: document.getElementById("modalActions")
  };

  var state = {
    values: {},
    playerCase: null,
    opened: {},
    roundIndex: 0,
    picksThisRound: 0,
    gameOver: true,
    revealPlayerCaseValue: false
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function formatMoney(n) {
    if (n < 1) {
      return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  function bankerOffer(remaining) {
    if (remaining.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < remaining.length; i++) sum += remaining[i];
    var mean = sum / remaining.length;
    var round = state.roundIndex;
    var progress = round / Math.max(PICKS_PER_ROUND.length, 1);
    var generosity = 0.35 + progress * 0.45;
    var noise = 0.88 + Math.random() * 0.2;
    var offer = Math.round(mean * generosity * noise);
    return Math.max(offer, 1);
  }

  function remainingAmounts() {
    var out = [];
    for (var num = 1; num <= CASE_COUNT; num++) {
      if (state.opened[num]) continue;
      if (num === state.playerCase) continue;
      out.push(state.values[num]);
    }
    return out;
  }

  function valuesStillInPlay() {
    var out = [];
    for (var num = 1; num <= CASE_COUNT; num++) {
      if (state.opened[num]) continue;
      out.push(state.values[num]);
    }
    return out;
  }

  function allRemainingForLadder() {
    var out = [];
    for (var num = 1; num <= CASE_COUNT; num++) {
      if (state.opened[num]) continue;
      out.push(state.values[num]);
    }
    return out.sort(function (a, b) { return a - b; });
  }

  function updateLadder() {
    el.ladder.innerHTML = "";
    var amounts = AMOUNTS.slice().sort(function (a, b) { return a - b; });
    var still = {};
    var rem = allRemainingForLadder();
    for (var r = 0; r < rem.length; r++) still[rem[r]] = true;
    for (var i = 0; i < amounts.length; i++) {
      var li = document.createElement("li");
      li.textContent = formatMoney(amounts[i]);
      if (!still[amounts[i]]) li.className = "eliminated";
      el.ladder.appendChild(li);
    }
  }

  function updateStatus() {
    el.statusBar.innerHTML = "";
    if (state.gameOver) return;
    var need = PICKS_PER_ROUND[state.roundIndex];
    if (need === undefined) need = 0;
    var left = need - state.picksThisRound;
    var span1 = document.createElement("span");
    if (state.playerCase === null) {
      span1.textContent = "Choose your case - it stays closed until the end.";
    } else if (left > 0) {
      span1.innerHTML = "Open <strong>" + left + "</strong> more case" + (left === 1 ? "" : "s") + " this round.";
    } else {
      span1.textContent = "Waiting for banker...";
    }
    el.statusBar.appendChild(span1);
  }

  function renderBoxes() {
    el.boxGrid.innerHTML = "";
    for (var n = 1; n <= CASE_COUNT; n++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box-btn";
      btn.setAttribute("data-case", String(n));
      btn.textContent = String(n);
      if (state.opened[n]) {
        btn.disabled = true;
        btn.classList.add("opened");
        btn.textContent = formatMoney(state.values[n]);
      } else if (n === state.playerCase) {
        btn.disabled = true;
        btn.classList.add("player-pick");
        if (state.revealPlayerCaseValue) {
          btn.textContent = formatMoney(state.values[n]);
          btn.classList.add("revealed-contents");
        }
      }
      el.boxGrid.appendChild(btn);
    }
  }

  function closeOverlay() {
    el.overlay.classList.remove("visible");
    el.offerAmount.classList.add("hidden");
    el.modalActions.innerHTML = "";
  }

  function showModal(title, bodyHtml, actions) {
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = bodyHtml;
    el.modalActions.innerHTML = "";
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      var b = document.createElement("button");
      b.type = "button";
      b.className = a.className || "btn btn-primary";
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      el.modalActions.appendChild(b);
    }
    el.overlay.classList.add("visible");
  }

  function endGameWinnings(amount, message, caseCompareAmount) {
    state.gameOver = true;
    state.revealPlayerCaseValue = true;
    el.offerAmount.classList.add("hidden");
    for (var k = 1; k <= CASE_COUNT; k++) {
      if (!state.opened[k] && k !== state.playerCase) state.opened[k] = true;
    }
    renderBoxes();
    updateLadder();
    updateStatus();
    var body;
    if (typeof caseCompareAmount === "number") {
      var caseVal = caseCompareAmount;
      var diff = amount - caseVal;
      var absDiff = Math.abs(diff);
      var compareLine = "";
      if (diff > 0) {
        compareLine = "<p class=\"deal-compare-note\">You came out <strong>ahead</strong> by taking the deal - " + formatMoney(absDiff) + " more than your case.</p>";
      } else if (diff < 0) {
        compareLine = "<p class=\"deal-compare-note\">Your case was worth <strong>" + formatMoney(absDiff) + "</strong> more than the offer.</p>";
      } else {
        compareLine = "<p class=\"deal-compare-note\">The offer matched your case exactly.</p>";
      }
      body =
        "<p>" + message + "</p>" +
        "<div class=\"deal-compare\">" +
        "<p class=\"deal-compare-row\"><span class=\"deal-compare-label\">You took (deal)</span> <span class=\"deal-compare-amount\">" + formatMoney(amount) + "</span></p>" +
        "<p class=\"deal-compare-row\"><span class=\"deal-compare-label\">Your case had</span> <span class=\"deal-compare-amount secondary\">" + formatMoney(caseVal) + "</span></p>" +
        "</div>" +
        compareLine;
    } else {
      body = "<p>" + message + "</p><p class=\"offer-amount game-over-win\">" + formatMoney(amount) + "</p>";
    }
    showModal("Game over", body, [
      {
        label: "Play again",
        className: "btn btn-secondary",
        onClick: function () {
          closeOverlay();
          startNewGame();
        }
      }
    ]);
  }

  function afterPick() {
    renderBoxes();
    updateLadder();
    var need = PICKS_PER_ROUND[state.roundIndex];
    if (state.picksThisRound >= need) {
      state.picksThisRound = 0;
      var rem = remainingAmounts();
      if (rem.length === 0) {
        finishNoDeal();
        return;
      }
      var offer = bankerOffer(valuesStillInPlay());
      promptDeal(offer);
    } else {
      updateStatus();
    }
  }

  function finishNoDeal() {
    var last = null;
    for (var n = 1; n <= CASE_COUNT; n++) {
      if (!state.opened[n] && n !== state.playerCase) {
        last = n;
        break;
      }
    }
    if (last !== null) {
      state.opened[last] = true;
    }
    var won = state.values[state.playerCase];
    closeOverlay();
    endGameWinnings(won, "No deal - your case held:");
  }

  function promptDeal(offer) {
    updateStatus();
    var inPlay = valuesStillInPlay().length;
    var body = "<p>The banker offers you <strong>" + formatMoney(offer) + "</strong> for your case.</p><p>There are still " +
      inPlay + " cases in play.</p>";
    el.offerAmount.textContent = formatMoney(offer);
    el.offerAmount.classList.remove("hidden");
    showModal("Banker's offer", body, [
      {
        label: "Deal",
        className: "btn btn-secondary",
        onClick: function () {
          closeOverlay();
          var inCase = state.values[state.playerCase];
          endGameWinnings(offer, "It's a deal! Here's what you took versus your case:", inCase);
        }
      },
      {
        label: "No deal",
        className: "btn btn-primary",
        onClick: function () {
          closeOverlay();
          state.roundIndex++;
          updateStatus();
        }
      }
    ]);
  }

  function onBoxClick(caseNum) {
    if (state.gameOver) return;
    if (state.playerCase === null) {
      state.playerCase = caseNum;
      renderBoxes();
      updateStatus();
      return;
    }
    var need = PICKS_PER_ROUND[state.roundIndex];
    if (state.picksThisRound >= need) return;
    if (caseNum === state.playerCase) return;
    if (state.opened[caseNum]) return;
    state.opened[caseNum] = true;
    state.picksThisRound++;
    afterPick();
  }

  function startNewGame() {
    closeOverlay();
    var shuffled = shuffle(AMOUNTS);
    state.values = {};
    for (var i = 0; i < CASE_COUNT; i++) {
      state.values[i + 1] = shuffled[i];
    }
    state.playerCase = null;
    state.opened = {};
    state.roundIndex = 0;
    state.picksThisRound = 0;
    state.gameOver = false;
    state.revealPlayerCaseValue = false;
    el.gameArea.classList.remove("hidden");
    el.introText.classList.add("hidden");
    el.appWrap.classList.add("game-active");
    renderBoxes();
    updateLadder();
    updateStatus();
  }

  el.boxGrid.addEventListener("click", function (e) {
    var t = e.target;
    if (t.nodeName !== "BUTTON") return;
    var n = parseInt(t.getAttribute("data-case"), 10);
    if (!n) return;
    onBoxClick(n);
  });

  el.btnNewGame.addEventListener("click", function () {
    startNewGame();
  });
})();
