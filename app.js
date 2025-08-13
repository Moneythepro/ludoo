/* Ludo PWA — Offline Pass‑and‑Play (2–6 players)
  - Simplified SVG board (circular track of 52 cells) + home rows per player (6 cells)
  - 4 tokens per player supported (choose 1–4 in settings)
  - Rules: Need 6 to leave base; extra turn on 6; three consecutive sixes -> turn ends w/ no move
           Captures send opponent token back to base; safe cells are shared starts
           Exact roll required to enter home. First player to get all tokens home wins.
  - Pass-and-play: one device, tap dice then a highlighted token to move.
*/

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const COLORS = ['p1','p2','p3','p4','p5','p6'];
const PLAYER_NAMES = ['Red','Green','Blue','Yellow','Purple','Teal'];

// Geometry for circular track coordinates (52 cells) + per-player home rows (6 cells)
function genTrack() {
  const out = [];
  const cx = 500, cy = 500, r = 380;
  for (let i=0;i<52;i++){
    const t = (Math.PI*2) * (i/52) - Math.PI/2;
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    out.push({x,y});
  }
  return out;
}
// Positions for homes (base yards) for 6 players (placed around the center)
function homeBaseCenters(){
  const centers = [];
  const cx = 500, cy = 500, r=220;
  for (let i=0;i<6;i++){
    const a = (Math.PI*2)*(i/6) - Math.PI/2;
    centers.push({x: cx + r*Math.cos(a), y: cy + r*Math.sin(a)});
  }
  return centers;
}
// Home rows (6 cells) lead from each player's enter index towards the center
function genHomeRows(track){
  const rows = [];
  const cx=500, cy=500;
  // Define each player's "enter" index (where they leave track into home row)
  const enters = [0, 13, 26, 39, 45, 7]; // spaced fairly
  for (let p=0;p<6;p++){
    const start = track[enters[p]];
    const row = [];
    for (let i=1;i<=6;i++){
      const x = start.x + (cx - start.x) * (i/7);
      const y = start.y + (cy - start.y) * (i/7);
      row.push({x,y});
    }
    rows.push(row); // length 6
  }
  return {rows, enters};
}

const track = genTrack();
const {rows: HOME_ROWS, enters: ENTER_INDEX} = genHomeRows(track);

function drawBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  // 15×15 = 225 cells
  for (let i = 0; i < 225; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    // You can style cells with nth-child in CSS to create colored zones
    board.appendChild(cell);
  }
}

function randInt(n){ return Math.floor(Math.random()*n); }

// --- Game State ---
const state = {
  players: 4,
  tokensPerPlayer: 4,
  current: 0,
  rolled: null,
  sixStreak: 0,
  started: false,
  pieces: [], // per-player arrays of tokens
  winner: null,
};

function newGame(players, tokensPerPlayer){
  state.players = players;
  state.tokensPerPlayer = tokensPerPlayer;
  state.current = 0;
  state.rolled = null;
  state.sixStreak = 0;
  state.started = true;
  state.pieces = [];
  state.winner = null;

  // Each token: {posType: 'base'|'track'|'homeRow'|'home', trackIndex: int, homeIndex:int}
  for (let p=0;p<players;p++){
    const arr = [];
    for (let t=0;t<tokensPerPlayer;t++){
      arr.push({ posType:'base', trackIndex:null, homeIndex:null });
    }
    state.pieces.push(arr);
  }
  render();
  logLine('New game started.');
  updateTurnInfo();
}

function nextPlayer(){
  state.current = (state.current + 1) % state.players;
  state.rolled = null;
  state.sixStreak = 0;
  updateTurnInfo();
}

function updateTurnInfo(){
  const name = PLAYER_NAMES[state.current];
  $('#turnInfo').textContent = `Turn: ${name}`;
  $('#diceValue').textContent = state.rolled ?? '—';
}

function logLine(text){
  const el = document.createElement('div');
  el.className = 'entry';
  el.innerHTML = text;
  $('#log').prepend(el);
}

function rollDice(){
  if (!state.started || state.winner!==null) return;
  if (state.rolled !== null) { logLine('Already rolled. Move a token.'); return; }
  const n = 1 + randInt(6);
  state.rolled = n;
  $('#diceValue').textContent = n;
  if (n === 6){
    state.sixStreak++;
    if (state.sixStreak >= 3){
      logLine('<strong>Three sixes!</strong> Turn ends.');
      state.rolled = null;
      state.sixStreak = 0;
      nextPlayer();
      return;
    }
  } else {
    state.sixStreak = 0;
  }
  render(); // highlight movable tokens
}

function startIndexForPlayer(p){
  const starts = [0, 8, 17, 26, 34, 43];
  return starts[p];
}
function enterIndexForPlayer(p){
  return ENTER_INDEX[p];
}
function isSafe(trackIndex){
  const safes = [0, 8, 17, 26, 34, 43];
  return safes.includes((trackIndex+52)%52);
}

// Compute legal moves for a token
function legalMove(p, ti, die){
  const token = state.pieces[p][ti];
  if (token.posType==='home') return null;
  // In base
  if (token.posType==='base'){
    if (die === 6){
      const start = startIndexForPlayer(p);
      // If occupied by our own tokens? Allowed; stack on same cell (Ludo King allows stacking)
      return { type:'enter', toTrack:start };
    } else return null;
  }
  // On track
  if (token.posType==='track'){
    let idx = token.trackIndex;
    let to = (idx + die) % 52;
    // Check if we should enter home row
    // We enter when passing the player's enter index — only if exact distance lands on home row
    const enterIdx = enterIndexForPlayer(p);
    // Count steps one by one to detect passing enter
    let steps = die;
    let pos = idx;
    while (steps>0){
      const next = (pos+1) % 52;
      if (next === enterIdx){
        // remaining steps go into home row
        const remaining = steps-1;
        if (remaining > 6) return null; // overshoot beyond home
        if (remaining === 0) {
          // land exactly on enter cell (still track)
          return { type:'moveTrack', toTrack:next };
        } else {
          // move into home row
          const targetHome = remaining-1; // homeIndex 0..5
          return { type:'enterHome', toHome:targetHome };
        }
      }
      pos = next; steps--;
    }
    // regular track move
    return { type:'moveTrack', toTrack:to };
  }
  // In home row
  if (token.posType==='homeRow'){
    const target = token.homeIndex + die;
    if (target < 6) return { type:'advanceHome', toHome: target };
    if (target === 6) return { type:'toHome' };
    return null;
  }
  return null;
}

function anyMovable(){
  const die = state.rolled;
  const p = state.current;
  for (let ti=0; ti<state.pieces[p].length; ti++){
    if (legalMove(p, ti, die)) return true;
  }
  return false;
}

function performMove(p, ti, move){
  const token = state.pieces[p][ti];
  if (move.type==='enter'){
    token.posType='track'; token.trackIndex=move.toTrack; token.homeIndex=null;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> enters the track.`);
    captureIfAny(p, ti); // entering can capture if enemy on start unless it's safe (start is safe; so no capture)
  } else if (move.type==='moveTrack'){
    token.trackIndex = move.toTrack;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> moved a token on the track.`);
    captureIfAny(p, ti);
  } else if (move.type==='enterHome'){
    token.posType='homeRow'; token.homeIndex=move.toHome; token.trackIndex=null;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> entered home row.`);
  } else if (move.type==='advanceHome'){
    token.homeIndex = move.toHome;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> advanced in home row.`);
  } else if (move.type==='toHome'){
    token.posType='home'; token.homeIndex=null; token.trackIndex=null;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> brought a token HOME!`);
  }
}

function captureIfAny(p, ti){
  const token = state.pieces[p][ti];
  if (token.posType!=='track') return;
  const idx = token.trackIndex;
  if (isSafe(idx)) return; // no capture on safe
  for (let op=0; op<state.players; op++){
    if (op===p) continue;
    for (let t2=0;t2<state.pieces[op].length;t2++){
      const other = state.pieces[op][t2];
      if (other.posType==='track' && other.trackIndex===idx){
        // capture (send to base)
        other.posType='base'; other.trackIndex=null; other.homeIndex=null;
        logLine(`<strong>${PLAYER_NAMES[p]}</strong> captured <strong>${PLAYER_NAMES[op]}</strong>!`);
      }
    }
  }
}

function checkWin(p){
  const allHome = state.pieces[p].every(t => t.posType==='home');
  if (allHome){
    state.winner = p;
    logLine(`<strong>${PLAYER_NAMES[p]}</strong> WINS!`);
    alert(`${PLAYER_NAMES[p]} wins!`);
  }
}

function onTokenClick(e){
  if (!state.started || state.winner!==null) return;
  const die = state.rolled;
  if (die===null) { logLine('Roll first.'); return; }
  const el = e.currentTarget;
  const p = +el.getAttribute('data-p');
  const ti = +el.getAttribute('data-ti');
  if (p !== state.current) return; // not your turn
  const mv = legalMove(p, ti, die);
  if (!mv){ logLine('That token cannot move with this roll.'); return; }
  performMove(p, ti, mv);
  // Decide if player gets another turn
  if (die === 6 && mv.type!=='toHome'){ // allow extra turn on 6 except when exactly finishing? choose simple: still extra
    state.rolled = null;
    updateTurnInfo();
    render();
    checkWin(p);
    return;
  }
  // end turn
  state.rolled = null;
  updateTurnInfo();
  render();
  checkWin(p);
  if (state.winner===null) nextPlayer();
}

function render(){
  drawBoardIfNeeded();
  // Render tokens
  const g = $('#tokens');
  g.innerHTML = '';
  for (let p=0;p<state.players;p++){
    for (let ti=0; ti<state.pieces[p].length; ti++){
      const t = state.pieces[p][ti];
      let x=0, y=0;
      if (t.posType==='base'){
        const base = HOME_BASES[p][ti];
        x=base.x; y=base.y;
      } else if (t.posType==='track'){
        const pt = track[t.trackIndex];
        // offset stacks slightly
        const offx = (ti%2)*8 - 4;
        const offy = (Math.floor(ti/2))*8 - 4;
        x=pt.x+offx; y=pt.y+offy;
      } else if (t.posType==='homeRow'){
        const pt = HOME_ROWS[p][t.homeIndex];
        x=pt.x; y=pt.y;
      } else if (t.posType==='home'){
        // place neatly in the inner circle for winners
        const center = {x:500, y:500};
        const angle = (p/state.players)*Math.PI*2 + (ti*0.25);
        x = center.x + 40*Math.cos(angle);
        y = center.y + 40*Math.sin(angle);
      }
      const use = document.createElementNS('http://www.w3.org/2000/svg','use');
      use.setAttributeNS('http://www.w3.org/1999/xlink','href','#token');
      use.setAttribute('transform',`translate(${x},${y})`);
      use.classList.add('token', COLORS[p]);
      use.classList.add(`p${p+1}`);
      use.setAttribute('data-p', String(p));
      use.setAttribute('data-ti', String(ti));
      // highlight if movable
      if (state.rolled!==null && legalMove(p, ti, state.rolled)){
        use.classList.add('canMove');
      }
      use.addEventListener('click', onTokenClick);
      $('#tokens').appendChild(use);
    }
  }
}

let drewBoard= false;
let HOME_BASES = null;
function drawBoardIfNeeded(){
  if (drewBoard) return;
  drawBoard();
  // Build base positions for tokens: 3x3 grid around each base center
  const centers = homeBaseCenters();
  HOME_BASES = centers.map((c)=>{
    const spots = [];
    const offsets = [
      [-22,-22], [0,-22], [22,-22],
      [-22,  0], [0,  0], [22,  0],
      [-22, 22], [0, 22], [22, 22],
    ];
    for (let i=0; i<9; i++){
      spots.push({x:c.x + offsets[i][0], y:c.y + offsets[i][1]});
    }
    return spots;
  });
  drewBoard = true;
}

// UI hookups
$('#btnStart').addEventListener('click', ()=>{
  const players = +$('#playerCount').value;
  const tpp = +$('#tokensPerPlayer').value;
  newGame(players, tpp);
});
$('#btnNew').addEventListener('click', ()=>{
  newGame(state.players, state.tokensPerPlayer);
});
$('#btnRoll').addEventListener('click', rollDice);

// Install prompt
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e; $('#btnInstall').disabled=false;
});
$('#btnInstall').addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

// Start a default game on load
window.addEventListener('load', ()=>{
  newGame(4,4);
});
