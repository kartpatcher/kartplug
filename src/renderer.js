// renderer.js
const { ipcRenderer, dialog } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7A3;

const CHOSUNG_START = 0x3131;
const CHOSUNG_END = 0x3163;

const SYMBOL_START = 0x4E00;
const SYMBOL_END = 0x79A3;

const CHOSUNGREP_START = 0x00BC;
const CHOSUNGREP_END = 0x0187;

const HANGUL_RANGE = HANGUL_END - HANGUL_START + 1;
const SYMBOL_RANGE = SYMBOL_END - SYMBOL_START + 1;

const CHOSUNG_RANGE = CHOSUNG_END - CHOSUNG_START + 1;
const CHOSUNGREP_RANGE = CHOSUNGREP_END - CHOSUNGREP_START + 1;

let hangulToSymbolMap = {};
let chosungToChosungrepMap = {};

// 한글 -> 특수 기호 매핑 생성
for (let i = 0; i < HANGUL_RANGE; i++) {
    const hangulChar = String.fromCharCode(HANGUL_START + i);
    const symbolChar = String.fromCharCode(SYMBOL_START + (i % SYMBOL_RANGE));
    hangulToSymbolMap[hangulChar] = symbolChar;
}

// 초성 -> 초성 대체 매핑 생성
for (let i = 0; i < CHOSUNG_RANGE; i++) {
    const chosungChar = String.fromCharCode(CHOSUNG_START + i);
    const chosungrepChar = String.fromCharCode(CHOSUNGREP_START + i);
    chosungToChosungrepMap[chosungChar] = chosungrepChar;
}

function convertText(uniTextValueArr) {
    let result = '';
    for (let i = 0; i < uniTextValueArr.length; i++) {
        const char = uniTextValueArr[i];
        if (hangulToSymbolMap[char]) {
            result += hangulToSymbolMap[char];
        } else if (chosungToChosungrepMap[char]) {
            result += chosungToChosungrepMap[char];
        } else {
            result += char;
        }
    }
    return result;
}
function calculateMD5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

function fetchChecksums(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.split('\n')));
        }).on('error', reject);
    });
}
// 사용 예시
window.onload = async () => {
  const minimizeBtn = document.getElementById('minimizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  
  // Unicode mover
  const uniText = document.getElementById('convInput');
  const uniReplaceBtn = document.getElementById('convBtn');

  // Logger
  const logger = document.getElementById('logger');

  // Game info
  const version = document.getElementById('version');
  const start = document.getElementById('start');

  const configPath = path.join(process.cwd(), 'config.json');
  let tcPath = "C:\\Program Files (x86)\\TCGAME";
  let kartPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart";

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({}));
  }
  else{
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.tcPath) {
        tcPath = config.tcPath;
    }
    if (config.kartPath) {
        kartPath = config.kartPath;
    }
  }

  function log(message) {
    logger.innerHTML += `<p>${message}</p>`;
    logger.scrollTop = logger.scrollHeight;
  }

  minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
  });

  closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-window');
  });

  try {
    const releases = await fetch('https://api.github.com/repos/kartpatcher/kartpatcher.github.io/releases', {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    }).then(res => res.json());
    
    const notice = await fetch('https://kartpatcher.github.io/notice.txt').then(res => res.text());
    log(`[공지] ${notice}`);

    const banner = await fetch('https://kartpatcher.github.io/banner.json').then(res => res.json());
    // [{"image": "banner.png", "url": "https://kartpatcher.github.io"}] 형식
    if (banner.length > 0) {
        for (let i = 0; i < banner.length; i++) {
            const bannerObj = banner[i];
            const bannerElement = document.createElement('a');
            if (bannerObj.isStatic){
                bannerElement.href = bannerObj.link;
                bannerElement.target = '_blank';
            }
            else{
                bannerElement.addEventListener('click', () => {
                    ipcRenderer.send('open-external', bannerObj.link);
                });
            }
            const bannerImage = document.createElement('img');
            bannerImage.src = bannerObj.image;
            bannerElement.appendChild(bannerImage);
            document.getElementById('patchContent').appendChild(bannerElement);
        }
    }

    const kartplugUpdate = releases.find(release => release.tag_name === 'kartplug');
    if (kartplugUpdate && kartplugUpdate.name !== 'kartplug-v1.0.1') {
        const changelog = await fetch('https://kartpatcher.github.io/changelog.txt').then(res => res.text());
        log(`[업데이트] 카트플러그 ${kartplugUpdate.name} 업데이트가 있습니다.`);
        ipcRenderer.send('alert', '업데이트', '브라우저에서 열리는 페이지에서 카트플러그 업데이트를 다운로드해주세요.\n\n<서비스 변경사항>\n'+changelog);
        ipcRenderer.send('open-external', kartplugUpdate.assets[0].browser_download_url);
        ipcRenderer.send('close-window');
    }

    const filePath = path.join(kartPath, 'Data', 'aaa.pk');
    log('[분석] aaa.pk 파일의 무결성을 검사합니다.');
    const md5Checksum = await calculateMD5(filePath);
    log(`[분석] Checksum 값: ${md5Checksum}`);

    log('[분석] 버전을 검사합니다.');
    const validChecksums = await fetchChecksums('https://kartpatcher.github.io/checksums.txt');
    const unpatchedChecksums = await fetchChecksums('https://kartpatcher.github.io/stock.txt');

    log('[분석] 패치 데이터를 불러옵니다.');
    const release = releases.find(release => release.name === validChecksums[0] && release.tag_name === 'patch');

    if (validChecksums.includes(md5Checksum)) {
        if (validChecksums[0] !== md5Checksum) {
            log('[분석] 패치가 최신 버전이 아닙니다.');
            version.innerText = '최신 버전이 아닙니다.';
            start.innerText = '패치 업데이트';
            start.addEventListener('click', () => {
                ipcRenderer.send('alert', '패치 다운로드', '브라우저에서 열리는 페이지에서 패치를 다운로드해주세요.');
                ipcRenderer.send('open-external', release.assets[0].browser_download_url);
            });
        }
        else{
            log('[분석] 최신 버전입니다.');
            version.innerText = '최신 버전입니다.';
            start.innerText = '게임 실행';
            start.addEventListener('click', () => {
                log('[정보] 게임을 실행합니다.');
                ipcRenderer.send('open-external', "tcgame://kart");
            });
        }
    }
    else if (unpatchedChecksums.includes(md5Checksum)) {
        log('[분석] 패치되지 않은 버전입니다.');
        version.innerText = '패치되지 않았습니다.';
        start.innerText = '패치 설치';


        start.addEventListener('click', () => {
            ipcRenderer.send('alert', '패치 설치', '브라우저에서 열리는 페이지에서 패치를 다운로드해주세요.');
            ipcRenderer.send('open-external', release.assets[0].browser_download_url);
        });
    }
    else {
        log('[분석] 한글패치가 제작된 버전이 아닙니다.');
        version.innerText = '한글패치 적용 불가능 버전입니다.';
        start.innerText = '게임 실행';
        start.addEventListener('click', () => {
            log('[정보] 게임을 실행합니다.');
            ipcRenderer.send('open-external', "tcgame://kart");
        });
    }
} catch (error) {
    log(`[오류] ${error.message}`);
    log('[정보] 설치 상태는 <strong>Ctrl+R</strong>키로 카트플러그를 재시작하여 확인할 수 있습니다.');
    try{
        fs.accessSync(path.join(tcPath, 'TCGame.exe'));
        version.innerText = '跑跑卡丁车를 설치하세요.';
        start.innerText = 'TCGAME 실행';
        start.addEventListener('click', () => {
            log('[정보] 게임을 실행합니다.');
            ipcRenderer.send('open-external', "tcgame://kart");
        });
    }
    catch (error){
        version.innerText = 'TCGAME으로 설치되어 있지 않습니다.';
        start.innerText = 'TCGAME 설치';
        start.addEventListener('click', () => {
            ipcRenderer.send('alert', 'TCGAME 설치', '브라우저에서 열리는 페이지에서 游戏下载을 눌러 TCGAME 런처를 설치해주세요.');
            ipcRenderer.send('open-external', "https://popkart.tiancity.com/homepage/v3/");
        });
    }
}
  uniReplaceBtn.addEventListener('click', () => {
    const text = uniText.value;

    if (text.startsWith("/")) {
        if (text.startsWith("/tcgame")) {
            const path = text.replace("/tcgame ", "");
            if (fs.existsSync(path)) {
                tcPath = path;
                log(`[설정] TCGame 경로를 ${tcPath}로 설정했습니다.`);
                fs.writeFileSync(configPath, JSON.stringify({ tcPath, kartPath }));
            }
            else{
                log(`[오류] 경로 ${path}를 찾을 수 없습니다.`);
            }
        }
        else if (text.startsWith("/kart")) {
            const path = text.replace("/kart ", "");
            if (fs.existsSync(path)) {
                kartPath = path;
                log(`[설정] Kart 경로를 ${kartPath}로 설정했습니다.`);
                fs.writeFileSync(configPath, JSON.stringify({ tcPath, kartPath }));
            }
            else{
                log(`[오류] 경로 ${path}를 찾을 수 없습니다.`);
            }
        }
        else if (text.startsWith("/help")){
            log(`[도움말] /tcgame [경로] - TCGame 경로 설정\n/kart [경로] - Kart 경로 설정`);
        }
        uniText.value = '';
        uniText.focus();
    }
    else{
        uniText.value = convertText(text);
        log(`[복사] ${text} -> ${uniText.value}`);
        navigator.clipboard.writeText(uniText.value).then(() => {
            uniText.value = '';
            uniText.focus();
        });
    }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement === uniText) {
            uniReplaceBtn.click();
        }
        else if (e.key === 'Enter'){
            uniText.focus();
        }
        else if (e.key === 'Escape' && document.activeElement === uniText) {
            document.activeElement.blur();
        }
    });
};
