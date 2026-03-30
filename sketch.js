let isGameOver = false;
let isGameWin = false;
let gameStarted = false;
let showMenu = true; // 新增：是否顯示地圖選單
let mapType = 0;    // 新增：0: 尖角波, 1: 圓滑波, 2: 階梯波
let practiceMode = false; // 新增：練習模式開關
let level = 1; // 新增：紀錄當前關卡
let startTime = 0;
let elapsedTime = 0;
let isCurrentlyColliding = false; // 新增：記錄當前是否處於碰撞狀態
let collisionMarkers = []; // 新增：記錄練習模式下的出界點標記
let confetti = []; // 新增：彩帶特效粒子
let stars = []; // 新增：星空粒子
let meteor = null; // 新增：流星粒子

function setup() {
  createCanvas(windowWidth, windowHeight); // 設定為全螢幕
  initStars(); // 初始化星空
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); 
  initStars(); // 視窗縮放時重新生成星星
}

function draw() {
  background(0); // 背景設為黑色
  drawStars();   // 繪製星空背景
  drawMeteor();  // 繪製流星特效

  if (showMenu) {
    drawMenu();
    return;
  }

  let startX = width / 6; // 從 1/6 寬度處開始
  let endX = 5 * width / 6; // 到 5/6 寬度處結束，總長佔 2/3
  let waveAmplitude = height / 6; // 震幅設定為高度的 1/6
  let waveFrequency = 0.01 + (level - 1) * 0.003; // 修改：頻率隨關卡增加
  let startWidth = 50; // 起點軌道寬度
  let endWidth = 25;   // 終點軌道寬度 (不小於藍點直徑)
  let obstacleSize = 40; // 障礙物大小
  let obsY = height / 2 + sin(frameCount * 0.04) * (waveAmplitude + 40); // 障礙物垂直移動邏輯

  // 計算起點與終點的 Y 座標
  let startY = getWaveY(startX, waveFrequency, waveAmplitude);
  let endY = getWaveY(endX, waveFrequency, waveAmplitude);
  let dotSize = 60;

  if (isGameOver) {
    showGameOver();
    return;
  }

  if (isGameWin) {
    showGameWin();
    return;
  }

  // --- 遊戲邏輯：碰撞偵測 ---
  checkCollision(startX, endX, startY, endY, waveFrequency, waveAmplitude, startWidth, endWidth, dotSize, obsY, obstacleSize);

  // 提示玩家從紅點開始
  if (!gameStarted) {
    fill(255);
    textAlign(CENTER);
    textSize(20);
    text("點擊滑鼠開始遊戲", width / 2, 50);
  }

  // --- 繪製灰色軌道 ---
  noFill();
  stroke(150); // 灰色
  strokeCap(ROUND);
  strokeJoin(ROUND);

  for (let x = startX; x <= endX; x += 5) {
    let currentW = map(x, startX, endX, startWidth, endWidth);
    strokeWeight(currentW);
    let y1 = getWaveY(x, waveFrequency, waveAmplitude);
    let y2 = getWaveY(x + 5, waveFrequency, waveAmplitude);
    if (x + 5 <= endX) line(x, y1, x + 5, y2);
  }

  // --- 繪製軌道中間的黑色虛線 ---
  stroke(0); // 黑色
  strokeWeight(2); // 虛線粗細
  drawingContext.setLineDash([10, 15]); // 設定虛線樣式 [實線長度, 間隔長度]
  
  beginShape();
  for (let x = startX; x <= endX; x += 5) {
    let y = getWaveY(x, waveFrequency, waveAmplitude);
    vertex(x, y);
  }
  endShape();
  drawingContext.setLineDash([]); // 重設虛線，避免影響其他繪圖元件

  // --- 繪製移動障礙物 ---
  fill(255, 165, 0); // 橙色
  noStroke();
  circle(width / 2, obsY, obstacleSize);

  // --- 繪製起點與終點 ---
  noStroke();
  fill(255, 50, 50); // 紅色起點
  circle(startX, startY, dotSize);

  fill(50, 255, 50); // 綠色終點
  circle(endX, endY, dotSize);

  // --- 繪製練習模式的出界標記 (紅色的 X) ---
  if (practiceMode && collisionMarkers.length > 0) {
    push();
    stroke(255, 0, 0);
    strokeWeight(2);
    for (let m of collisionMarkers) {
      line(m.x - 5, m.y - 5, m.x + 5, m.y + 5);
      line(m.x + 5, m.y - 5, m.x - 5, m.y + 5);
    }
    pop();
  }

  // --- 繪製玩家（藍色小球） ---
  let playerX = gameStarted ? mouseX : startX;
  let playerY = gameStarted ? mouseY : startY;
  
  // 設定玩家外觀
  let playerAlpha = practiceMode ? 150 : 255; // 練習模式半透明 (150)
  if (practiceMode && isCurrentlyColliding) {
    // 練習模式且處於危險區：慢慢閃爍 (利用 sin 函數在 50~250 之間震盪)
    playerAlpha = 150 + sin(frameCount * 0.15) * 100;
    fill(255, 100, 100, playerAlpha); // 閃爍時帶一點紅光提醒
  } else {
    fill(0, 150, 255, playerAlpha);
  }
  noStroke();
  circle(playerX, playerY, 25);

  // --- 繪製關卡資訊 ---
  fill(255);
  noStroke();
  textSize(24);
  textAlign(LEFT, TOP);
  text("關卡: " + level, 30, 30);

  // --- 繪製即時計時器 ---
  if (gameStarted) {
    fill(255);
    noStroke();
    textSize(24);
    textAlign(RIGHT, TOP);
    text("時間: " + ((millis() - startTime) / 1000).toFixed(2) + " 秒", width - 30, 30);
  }
}

// 新增：繪製地圖選擇選單
function drawMenu() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("選擇地圖", width / 2, height / 4);
  pop();

  drawButton(width / 2, height / 2 - 60, "尖角地圖 (Triangle)");
  drawButton(width / 2, height / 2, "圓滑地圖 (Sine)");
  drawButton(width / 2, height / 2 + 60, "階梯地圖 (Square)");
  
  drawButton(width / 2, height / 2 + 120, "練習模式: " + (practiceMode ? "ON" : "OFF"));
}

// 新增：按鈕繪製小工具
function drawButton(x, y, label) {
  push();
  fill(100);
  rectMode(CENTER);
  rect(x, y, 300, 40, 10);
  fill(255);
  noStroke();
  textSize(20);
  textAlign(CENTER, CENTER);
  text(label, x, y);
  pop();
}

// 修改：計算不同波形的 Y 座標
function getWaveY(x, freq, amp) {
  let p = (x * freq) % TWO_PI;
  let out;
  if (mapType === 0) { // 尖角波
    if (p < PI / 2) out = map(p, 0, PI / 2, 0, 1);
    else if (p < 3 * PI / 2) out = map(p, PI / 2, 3 * PI / 2, 1, -1);
    else out = map(p, 3 * PI / 2, TWO_PI, -1, 0);
  } else if (mapType === 1) { // 圓滑波 (新增)
    out = sin(p);
  } else { // 階梯波 (新增)
    out = (p < PI) ? 1 : -1;
  }
  return height / 2 + out * amp;
}

function checkCollision(startX, endX, startY, endY, freq, amp, sw, ew, ds, obsY, obsSize) {
  if (gameStarted) {
    let dToStart = dist(mouseX, mouseY, startX, startY);
    let dToEnd = dist(mouseX, mouseY, endX, endY);

    // 檢查是否到達終點 (勝利)
    if (dToEnd < ds / 2) {
      isGameWin = true;
      elapsedTime = (millis() - startTime) / 1000; // 計算總花費秒數
      initConfetti(); // 初始化彩帶
      gameStarted = false;
      return;
    }

    let isSafe = false;
    let playerRadius = 12.5; // 藍點直徑 25，半徑 12.5

    // 1. 檢查是否在起點或終點圓圈內 (保留一點緩衝)
    if (dToStart < ds / 2 - 2 || dToEnd < ds / 2 - 2) {
      isSafe = true;
    }

    // 2. 檢查是否在軌道段落內
    if (!isSafe && mouseX >= startX - 20 && mouseX <= endX + 20) {
      let xStep = 5;
      // 掃描滑鼠附近的線段，解決階梯圖垂直牆問題
      for (let x = startX; x < endX; x += xStep) {
        // 效能優化：只檢查滑鼠橫向距離 40 像素內的線段
        if (abs(x - mouseX) > 40) continue; 

        let x2 = Math.min(x + xStep, endX);
        let y1 = getWaveY(x, freq, amp);
        let y2 = getWaveY(x2, freq, amp);
        
        let currentTrackWidth = map(x, startX, endX, sw, ew);
        let distance = distToSegment(mouseX, mouseY, x, y1, x2, y2);

        // 核心邏輯：滑鼠距離 + 藍點半徑 必須小於等於 軌道半徑
        if (distance + playerRadius <= currentTrackWidth / 2 + 1) {
          isSafe = true;
          break;
        }
      }
    }

    // 3. 檢查是否碰到移動障礙物
    let dToObs = dist(mouseX, mouseY, width / 2, obsY);
    if (dToObs < (playerRadius + obsSize / 2)) {
      isSafe = false; // 碰到障礙物強制不安全
    }

    isCurrentlyColliding = !isSafe; // 更新當前碰撞狀態

    // 練習模式下，如果發生碰撞，記錄出界點位置
    if (practiceMode && isCurrentlyColliding && frameCount % 3 === 0) {
      collisionMarkers.push({ x: mouseX, y: mouseY });
    }

    if (isCurrentlyColliding && !practiceMode) {
      isGameOver = true;
    }
  }
}

// 新增：初始化彩帶粒子
function initConfetti() {
  confetti = [];
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: random(width),
      y: random(-height, 0),
      w: random(4, 10),
      h: random(10, 25),
      color: color(random(255), random(255), random(255)),
      vx: random(-2, 2),
      vy: random(2, 6),
      r: random(TWO_PI),
      rv: random(0.02, 0.12)
    });
  }
}

// 新增：更新並繪製彩帶
function updateAndDrawConfetti() {
  push();
  noStroke();
  rectMode(CENTER);
  for (let p of confetti) {
    p.x += p.vx;
    p.y += p.vy;
    p.r += p.rv;
    if (p.y > height) p.y = -20; // 掉到底部後從上方重新落下
    fill(p.color);
    push();
    translate(p.x, p.y);
    rotate(p.r);
    rect(0, 0, p.w, p.h);
    pop();
  }
  pop();
}

// 新增：繪製流星
function drawMeteor() {
  if (!meteor) {
    // 低機率隨機產生一顆流星
    if (random(1) < 0.01) {
      meteor = {
        x: random(-100, width * 0.5),
        y: random(-100, height * 0.2),
        vx: random(2, 4), // 控制飄過的速度
        vy: random(1, 2.5),
        size: random(2, 4),
        len: random(15, 30) // 尾巴長度係數
      };
    }
    return;
  }

  push();
  // 繪製流星尾跡 (由多段線段組成，寬度與透明度遞減)
  for (let i = 0; i < meteor.len; i++) {
    let alpha = map(i, 0, meteor.len, 200, 0);
    stroke(255, 255, 255, alpha);
    strokeWeight(map(i, 0, meteor.len, meteor.size, 0.5));
    line(meteor.x - i * meteor.vx * 2, meteor.y - i * meteor.vy * 2, 
         meteor.x - (i + 1) * meteor.vx * 2, meteor.y - (i + 1) * meteor.vy * 2);
  }
  pop();

  // 更新流星位置
  meteor.x += meteor.vx;
  meteor.y += meteor.vy;

  // 超出螢幕範圍後重置
  if (meteor.x > width + 200 || meteor.y > height + 200) {
    meteor = null;
  }
}

// 新增：計算點到線段的最短距離函數
function distToSegment(px, py, x1, y1, x2, y2) {
  let l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
  if (l2 === 0) return dist(px, py, x1, y1);
  // 計算投射比例 t
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = constrain(t, 0, 1);
  return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

function showGameOver() {
  fill(255, 0, 0);
  textSize(64);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width / 2, height / 2);
  
  textSize(24);
  fill(255);
  text("點擊畫面重新開始", width / 2, height / 2 + 60);
}

function showGameWin() {
  updateAndDrawConfetti(); // 顯示彩帶動畫

  fill(50, 255, 50);
  textSize(64);
  textAlign(CENTER, CENTER);
  text("YOU WIN!", width / 2, height / 2);
  
  textSize(32);
  fill(255, 255, 0); // 黃色顯示時間
  text("完成時間: " + elapsedTime.toFixed(2) + " 秒", width / 2, height / 2 + 70);

  textSize(24);
  fill(255);
  text("點擊畫面再玩一次", width / 2, height / 2 + 120);
}

function mousePressed() {
  if (showMenu) {
    // 選單點擊偵測
    if (mouseX > width / 2 - 150 && mouseX < width / 2 + 150) {
      if (mouseY > height / 2 - 80 && mouseY < height / 2 - 40) { mapType = 0; showMenu = false; }
      else if (mouseY > height / 2 - 20 && mouseY < height / 2 + 20) { mapType = 1; showMenu = false; }
      else if (mouseY > height / 2 + 40 && mouseY < height / 2 + 80) { mapType = 2; showMenu = false; }
      else if (mouseY > height / 2 + 100 && mouseY < height / 2 + 140) { practiceMode = !practiceMode; }
    }
  } else if (isGameOver || isGameWin) {
    if (isGameOver) {
      level = 1; // 失敗後重置
    } else {
      level++; // 勝利後關卡難度增加
    }
    isGameOver = false;
    isGameWin = false;
    gameStarted = false;
    confetti = []; // 清空彩帶
    collisionMarkers = []; // 返回選單時清空標記
    showMenu = true; // 返回選單自由選擇
  } else if (!gameStarted) {
    gameStarted = true;
    collisionMarkers = []; // 開始新遊戲時清空標記
    startTime = millis(); // 記錄開始時間
  }
}

// 新增：初始化星空背景
function initStars() {
  stars = [];
  // 計算畫布對角線長度，確保旋轉時角落不會空掉
  let diagonal = sqrt(width * width + height * height);
  let starCount = (width * height) / 4000; 
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: random(-diagonal / 2, diagonal / 2),
      y: random(-diagonal / 2, diagonal / 2),
      size: random(1, 3),
      blinkSpeed: random(0.02, 0.05),
      offset: random(TWO_PI)
    });
  }
}

// 新增：繪製閃爍的星空
function drawStars() {
  push();
  translate(width / 2, height / 2); // 將座標原點移至畫面中心
  rotate(frameCount * 0.0005);     // 隨時間緩緩旋轉
  noStroke();
  for (let s of stars) {
    // 利用 sin 函數讓星星產生閃爍效果
    let alpha = map(sin(frameCount * s.blinkSpeed + s.offset), -1, 1, 100, 255);
    fill(255, alpha);
    circle(s.x, s.y, s.size);
  }
  pop();
}
