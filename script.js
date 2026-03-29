const menu = document.querySelector('#menu');
const gameScrn = document.querySelector('#gameScreen');
const nameB = document.querySelector('#playerNameInput');
const nameLabel = document.querySelector('#userName');
const startBtn = document.querySelector('#gameB');
const rulesBtn = document.querySelector('#ruleB');
const rulesPnl = document.querySelector('#ruleT');
const rulesCl = document.querySelector('#ruleC');
const timer = document.querySelector('#timerDisplay');
const lineB = document.querySelector('#currentLineDisplay');
const drawBtn = document.querySelector('#drawCardBtn');
const skipBtn = document.querySelector('#skipTurnBtn');
const endBtn2 = document.querySelector('#endGameBtn2');
const cardB = document.querySelector('#cardDisplay');
const alertB = document.querySelector('#customAlert');
const alertTxt = document.querySelector('#alertMessage');
const alertOk = document.querySelector('#alertOk');

function showMessage(text) {
    alertTxt.textContent = text;
    alertB.style.display = 'flex';
}
alertOk.addEventListener('click', function() {
    alertB.style.display = 'none';
});

const saved = localStorage.getItem('playerName');
if (saved !== null && saved !== '') {
    nameB.value = saved;
}

rulesPnl.style.display = 'none';
rulesBtn.addEventListener('click', function() {
    rulesPnl.style.display = 'block';
});
rulesCl.addEventListener('click', function() {
    rulesPnl.style.display = 'none';
});

let stations = [];
let lines = [];
let canvas, ctx;
const CELL = 60;

let lineOrd = [];
let lineInd = 0;
let card = null;
let usedCrd = 0;
let sumFP = 0;
let visitsTrn = 0;
const slider = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25];
let lineSegments = [[], [], [], []];
let endpnts = new Set();
let startStationUsed = 0; 
let timerId = null;

function drawDanube() {
    ctx.strokeStyle = 'rgba(0, 251, 255, 1)';  
    ctx.lineWidth = 7;      
    ctx.lineCap = 'round';
    ctx.beginPath()
    ctx.moveTo(360,0)
    ctx.lineTo(360,60)
    ctx.lineTo(360,120)
    ctx.lineTo(360,180)
    ctx.lineTo(300,240)
    ctx.lineTo(300,300)
    ctx.lineTo(300,360)
    ctx.lineTo(300,420)
    ctx.lineTo(360,480)
    ctx.lineTo(420,540)
    ctx.lineTo(420,600)
    ctx.stroke()    
}

function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, 600);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(600, i * CELL);
        ctx.stroke();
    }
}

function drawStations() {
    stations.forEach(function(s) {
        const x = s.x * CELL + CELL / 2;
        const y = s.y * CELL + CELL / 2;

        if (s.train === true) {
            ctx.fillStyle = '#ffcc00';
        } else {
            ctx.fillStyle = '#fff';
        }
        ctx.strokeStyle = '#4b0e64';
        ctx.lineWidth = 3;
        ctx.beginPath(); 
        ctx.arc(x, y, 18, 0, Math.PI * 2); 
        ctx.fill(); 
        ctx.stroke();
        ctx.fillStyle = '#4b0e64';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.type, x, y);

        if (s.type === '?') {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 4;
            ctx.beginPath(); 
            ctx.arc(x, y, 18, 0, Math.PI * 2); 
            ctx.stroke();
        }
        if (s.train === true) {
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 5;
            ctx.beginPath(); 
            ctx.arc(x, y, 18, 0, Math.PI * 2); 
            ctx.stroke();
        }
    });
}

function drawStartRing() {
    lines.forEach(function(l) {
        const s = stations.find(function(st) { 
            return st.id === l.start; 
        });
        if (s === undefined) {
            return;
        }
        const x = s.x * CELL + CELL / 2;
        const y = s.y * CELL + CELL / 2;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = l.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(l.name, x, y - 35);
    });
}

function drawSegments() {
    for (let i = 0; i < 4; i++) {
        const color = lines[i].color;
        lineSegments[i].forEach(function(seg) {
            const firstSt = stations.find(function(s) { return s.id === seg.from; });
            const secondSt = stations.find(function(s) { return s.id === seg.to; });
            if (firstSt !== undefined && secondSt !== undefined) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(firstSt.x * CELL + CELL / 2, firstSt.y * CELL + CELL / 2);
                ctx.lineTo(secondSt.x * CELL + CELL / 2, secondSt.y * CELL + CELL / 2);
                ctx.stroke();
            }
        });
    }
}

function currentLine() {
    const lineId = lineOrd[lineInd];
    const l = lines[lineId];
    lineB.textContent = 'Building: ' + l.name;
    lineB.style.color = l.color;
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDanube();
    drawGrid();
    drawStations();
    drawStartRing();
    drawSegments();
    currentLine();
}

function loadData() {
    fetch('stations.json')
        .then(r => {
            if (!r.ok) throw new Error('stations.json not found');
            return r.json();
        })
        .then(stationData => {
            stations = stationData;
            return fetch('lines.json');
        })
        .then(r => {
            if (!r.ok) throw new Error('lines.json not found');
            return r.json();
        })
        .then(lineData => {
            lines = lineData;
            canvas = document.querySelector('#gameBoard');
            ctx = canvas.getContext('2d');

            lineOrd = [0,1,2,3].sort(() => Math.random() - 0.5);
            endpnts = new Set(); 
            startStationUsed = 0;

            redraw();
            updateScores();
        })
        .catch(err => {
            console.error('Load error:', err);
            showMessage('Failed to load game data!');
        });
}

function startTimer() {
    let sec = 0;
    timerId = setInterval(function() {
        sec++;
        const mnt = String(Math.floor(sec / 60)).padStart(2, '0');
        const scnd = String(sec % 60).padStart(2, '0');
        timer.textContent = mnt + ':' + scnd;
    }, 1000);
}

const DECK = ['A', 'B', 'C', 'D', 'Joker'];
drawBtn.addEventListener('click', function() {
    card = DECK[Math.floor(Math.random() * DECK.length)];
    cardB.textContent = card;
    usedCrd++;                    
    checkRoundEnd();              
    waitForClick();
});

let beginnerSt = null;

function waitForClick() {
    canvas.addEventListener('click', onCanvasClick);
}
function stopClick() {
    canvas.removeEventListener('click', onCanvasClick);
}

function updateScores() {
    const lineId = lineOrd[lineInd];
    const currentFP = roundScore(lineId);  
    const PP = railwayPointsGetter();
    const junctions = junctionCalculation();
    const junctionScore = 2 * junctions.csp2 + 5 * junctions.csp3 + 9 * junctions.csp4;

    const total = sumFP + currentFP + PP + junctionScore;

    document.querySelector('#roundScore').textContent = currentFP;
    document.querySelector('#railwayScore').textContent = PP;
    document.querySelector('#totalScore').textContent = total;
}

function checkRoundEnd() {
    if (usedCrd >= 8) {
        const lineId = lineOrd[lineInd];
        const FP = roundScore(lineId);
        sumFP += FP; 

        showMessage('Round over! You have drawn 8 cards.');
        updateScores();
        usedCrd = 0;
        startStationUsed = 0; 
        card = null;
        cardB.textContent = 'No card drawn';
        stopClick();
        roundReset();
    }
}

function roundReset() {
    lineInd++;
    if (lineInd < 4) {
        const nextLineId = lineOrd[lineInd];
        endpnts = new Set(); 
        startStationUsed = 0; 
        redraw();
        updateScores();
    } else {
        const total = document.querySelector('#totalScore').textContent;
        showMessage('game over! Final Score: ' + total);
    }
}

function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.floor(mx / CELL);
    const row = Math.floor(my / CELL);
    const station = stations.find(function(s) { return s.x === col && s.y === row; });
    if (station === undefined) {
        return;
    }

    if (beginnerSt === null) {
        const lineId = lineOrd[lineInd];
        const startStation = lines[lineId].start;
        
        const isEndpoint = endpnts.has(station.id);
        const isStartStation = (station.id === startStation);
        const canUseStart = (isStartStation && startStationUsed < 2);
        
        if (!isEndpoint && !canUseStart) {
            if (isStartStation && startStationUsed >= 2) {
                showMessage('Invalid move');
            } else {
                showMessage('Must start from an endpoint or the starting station');
            }
            return;
        }
        beginnerSt = station;
        tempRng(station);
    } else {
        if (beginnerSt.id === station.id) {
            redraw(); 
            beginnerSt = null; 
            return;
        }

        if (segmentValidation(beginnerSt, station) === false) {
            showMessage('Invalid move!');
            redraw(); 
            beginnerSt = null; 
            return;
        }

        const lineId = lineOrd[lineInd];
        drawSegment(beginnerSt, station, lines[lineId].color);
        lineSegments[lineId].push({ from: beginnerSt.id, to: station.id });

        const startStat = lines[lineId].start;
        if (beginnerSt.id === startStat) {
            startStationUsed++;
        } else {
            endpnts.delete(beginnerSt.id);
        }
        endpnts.add(station.id);

        const visited = new Set();
        visited.add(lines[lineId].start);
        lineSegments[lineId].forEach(seg => {
            visited.add(seg.from);
            visited.add(seg.to);
        });
        
        if (beginnerSt.train === true && !visitedBefore(beginnerSt.id, lineId)) {
            visitsTrn++;
        }
        if (station.train === true && !visitedBefore(station.id, lineId)) {
            visitsTrn++;
        }
       
        beginnerSt = null;
        stopClick();
        updateScores();
        redraw();
    }
}

function visitedBefore(stationId, lineId) {
    const visited = new Set();
    visited.add(lines[lineId].start);
    for (let i = 0; i < lineSegments[lineId].length - 1; i++) {
        const seg = lineSegments[lineId][i];
        visited.add(seg.from);
        visited.add(seg.to);
    }
    return visited.has(stationId);
}

function tempRng(st) {
    redraw();
    const coordX = st.x * CELL + CELL / 2;
    const coordY = st.y * CELL + CELL / 2;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 6;
    ctx.beginPath(); 
    ctx.arc(coordX, coordY, 22, 0, Math.PI * 2); 
    ctx.stroke();
}

function drawSegment(a, b, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x * CELL + CELL / 2, a.y * CELL + CELL / 2);
    ctx.lineTo(b.x * CELL + CELL / 2, b.y * CELL + CELL / 2);
    ctx.stroke();
}

function segmentValidation(a, b) {
    if (card === 'Joker') {
    } else if (a.type === '?' || b.type === '?') {
    } else if (b.type !== card) {
        return false;
    }

    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx !== 0 && dy !== 0 && dx !== dy) return false;

    if (dx > 1 || dy > 1) {
        const steps = Math.max(dx, dy);
        for (let i = 1; i < steps; i++) {
            const px = a.x + i * (b.x - a.x) / steps;
            const py = a.y + i * (b.y - a.y) / steps;
            if (stations.some(s => s.x === Math.round(px) && s.y === Math.round(py))) {
                return false;
            }
        }
    }

    const lineId = lineOrd[lineInd];
    const used = new Set();
    used.add(lines[lineId].start);
    lineSegments[lineId].forEach(seg => { used.add(seg.from); used.add(seg.to); });
    if (used.has(b.id)) return false;

    if (lineSegments.flat().some(seg => 
        (seg.from === a.id && seg.to === b.id) || 
        (seg.from === b.id && seg.to === a.id)
    )) return false;

    if (segmentIntersectsExisting(a, b)) {
        return false;
    }

    for (let i = 0; i < lines.length; i++) {
        if (i !== lineId && lines[i].start === b.id) {
            showMessage("Cannot connect to the starting point of " + lines[i].name + "!");
            return false;
        }
    }

    return true;
}

function segmentIntersectsExisting(newA, newB) {
    const allSegments = lineSegments.flat();
    
    for (const seg of allSegments) {
        const segA = stations.find(s => s.id === seg.from);
        const segB = stations.find(s => s.id === seg.to);
        
        if (!segA || !segB) continue;
        
        if (newA.id === seg.from || newA.id === seg.to || 
            newB.id === seg.from || newB.id === seg.to) {
            continue;
        }
        
        if (segmentIntersect(newA, newB, segA, segB)) {
            return true;
        }
    }
    
    return false;
}

function segmentIntersect(p1, p2, p3, p4) {
    const cordAMinX = Math.min(p1.x, p2.x);
    const cordAMaxX = Math.max(p1.x, p2.x);
    const cordAMinY = Math.min(p1.y, p2.y);
    const cordAMaxY = Math.max(p1.y, p2.y);
    
    const cordBMinX = Math.min(p3.x, p4.x);
    const cordBMaxX = Math.max(p3.x, p4.x);
    const cordBMinY = Math.min(p3.y, p4.y);
    const cordBMaxY = Math.max(p3.y, p4.y);
    
    if (cordAMaxX < cordBMinX || cordBMaxX < cordAMinX || 
        cordAMaxY < cordBMinY || cordBMaxY < cordAMinY) {
        return false;
    }
    
    
    function sideGetter(A, B, C) {
        return (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    }
    
    const b = sideGetter(p1, p2, p3);
    const a = sideGetter(p1, p2, p4);
    const sideOpA = (b > 0 && a < 0) || (b < 0 && a > 0);
    const q = sideGetter(p3, p4, p1);
    const r = sideGetter(p3, p4, p2);
    const sideOpB = (q > 0 && r < 0) || (q < 0 && r > 0);
    
    return sideOpA && sideOpB;
}

skipBtn.addEventListener('click', function() {
    card = null;
    cardB.textContent = 'Skipped';
    stopClick();
});

endBtn2.addEventListener('click', function() {
    const lineId = lineOrd[lineInd];
    const currentFP = roundScore(lineId);
    sumFP += currentFP;

    updateScores();        

    const PP = parseInt(document.querySelector('#railwayScore').textContent);
    const total = parseInt(document.querySelector('#totalScore').textContent);
    const junctionCalc = junctionCalculation();
    const junctionTotal = 2 * junctionCalc.csp2 + 5 * junctionCalc.csp3 + 9 * junctionCalc.csp4;

    showMessage(
        'Final score: ' + total +
        '\nLine score: ' + sumFP +
        '\nRailway points: ' + PP +
        '\nJunctions: ' + junctionTotal
    );

    usedCrd = 0;
    card = null;
    cardB.textContent = 'No card drawn';
    stopClick();

    if (timerId !== null) { clearInterval(timerId); timerId = null; }
    timer.textContent = '00:00';

    gameScrn.style.display = 'none';
    menu.style.display = 'block';
    nameB.value = localStorage.getItem('playerName') || '';
});

function roundScore(lineId) {
    const visited = new Set();
    visited.add(lines[lineId].start);
    lineSegments[lineId].forEach(function(seg) {
        visited.add(seg.from);
        visited.add(seg.to);
    });
    const st = Array.from(visited).map(function(id) {
        return stations.find(function(s) { return s.id === id; });
    });

    const districts = new Set(st.map(function(s) { return s.district; }));
    const PK = districts.size;

    const count = {};
    st.forEach(function(s) {
        const d = s.district;
        if (count[d] === undefined) {
            count[d] = 0;
        }
        count[d]++;
    });
    let PM = 1;
    for (const districtNum in count) {
        if (count[districtNum] > PM) {
            PM = count[districtNum];
        }
    }

    let PD = 0;
    lineSegments[lineId].forEach(function(seg) {
        const a = stations.find(function(s) { return s.id === seg.from; });
        const b = stations.find(function(s) { return s.id === seg.to; });
        if (a.side !== b.side) {
            PD++;
        }
    });

    return (PK * PM) + PD;
}

function railwayPointsGetter() {
    const index = Math.min(visitsTrn, 10);
    return slider[index];
}

function junctionCalculation() {
    const count = {};
    stations.forEach(function(s) {
        count[s.id] = 0;
    });

    for (let i = 0; i < 4; i++) {
        const visited = new Set();
        visited.add(lines[i].start);
        lineSegments[i].forEach(function(seg) {
            visited.add(seg.from);
            visited.add(seg.to);
        });
        visited.forEach(function(id) {
            count[id]++;
        });
    }

    let csp2 = 0, csp3 = 0, csp4 = 0;
    for (const id in count) {
        const c = count[id];
        if (c === 2) {
            csp2++;
        }
        if (c === 3) {
            csp3++;
        }
        if (c === 4) {
            csp4++;
        }
    }

    return { csp2: csp2, csp3: csp3, csp4: csp4 };
}

startBtn.addEventListener('click', function() {
    const name = nameB.value.trim();
    if (name === '') {
        showMessage('Enter name!');
        return;
    }
    localStorage.setItem('playerName', name);
    menu.style.display = 'none';
    gameScrn.style.display = 'block';
    nameLabel.textContent = name;
    alertB.style.display = 'none';

    if (timerId !== null) clearInterval(timerId);
    timer.textContent = '00:00';
    startTimer();
    
    loadData();  
});