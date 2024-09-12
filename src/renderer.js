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
  const loading = document.getElementById('loading');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  const settingsBtn = document.getElementById('setting');
  
  // Unicode mover
  const uniText = document.getElementById('convInput');
  const uniReplaceBtn = document.getElementById('convBtn');

  // Logger
  const logger = document.getElementById('logger');

  // Game info
  const version = document.getElementById('version');
  const start = document.getElementById('start');

  // Community Links
  const youtube = document.getElementById('youtube');
  const discord = document.getElementById('discord');

    youtube.addEventListener('click', () => {  
    ipcRenderer.send('open-external', 'https://www.youtube.com/@H2OStudioKR');
    });
    discord.addEventListener('click', () => {
    ipcRenderer.send('open-external', 'https://discord.com/invite/FjA2EqHKBB');
    });

  // Notice
  const notice = document.getElementById('notice');
  const noticeTitle = document.getElementById('noticeTitle');
  const noticeContent = document.getElementById('noticeContent');
  const noticeClose = document.getElementById('closeNotice');
  notice.style.display = 'none';

  const settingFile = fs.readFileSync(path.join(__dirname, 'setting.html'), 'utf8');

  const configPath = path.join(process.cwd(), 'config.json');
  let tcPath = "C:\\Program Files (x86)\\TCGAME";
  let kartPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart";

  noticeClose.addEventListener('click', () => {
    notice.style.display = 'none';
    });

  settingsBtn.addEventListener('click', () => {
    noticeContent.innerHTML = settingFile;
    noticeTitle.innerText = '설정';
    notice.style.display = 'flex';

    const searchKart = document.getElementById('searchKart');
    const searchTc = document.getElementById('searchTc');
    const saveBtn = document.getElementById('saveBtn');

    const pathKart = document.getElementById('pathKart');
    const pathTc = document.getElementById('pathTc');

    pathKart.innerText = kartPath;
    pathTc.innerText = tcPath;

    var tempKartPath = kartPath;
    var tempTcPath = tcPath;

    searchKart.addEventListener('click', async () => {
        ipcRenderer.invoke('dialog:openDirectory').then(result=>{
            if (result) {
                tempKartPath = result;
                pathKart.innerText = result;
            }
            else{
                ipcRenderer.send('alert', '경로 선택', '경로를 선택하지 않았습니다.');
            }
        });
    });
    searchTc.addEventListener('click', async () => {
        ipcRenderer.invoke('dialog:openDirectory').then(result=>{
            if (result) {
                tempTcPath = result;
                pathTc.innerText = result;
            }
            else{
                ipcRenderer.send('alert', '경로 선택', '경로를 선택하지 않았습니다.');
            }
        });
    });

    saveBtn.addEventListener('click', () => {
        kartPath = tempKartPath;
        tcPath = tempTcPath;
        fs.writeFileSync(configPath, JSON.stringify({ tcPath, kartPath }));
        window.location.reload();
    });
    });


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

    const popupNotice = await fetch('https://kartpatcher.github.io/notice.json').then(res => res.json());
    const banner = await fetch('https://kartpatcher.github.io/banner.json').then(res => res.json());
    // [{"image": "banner.png", "url": "https://kartpatcher.github.io"}] 형식
    
    let noticeContent;  // Changed to 'let'

    const validChecksums = await fetchChecksums('https://kartpatcher.github.io/checksums.txt');
    const unpatchedChecksums = await fetchChecksums('https://kartpatcher.github.io/stock.txt');

    const kartplugUpdate = releases.find(release => release.tag_name === 'kartplug');
    const release = releases.find(release => release.name === validChecksums[0] && release.tag_name === 'patch');

    async function loadNotice(url) {
        const contUrl = await fetch(url).then(res => res.text());
        document.getElementById('noticeTitle').innerText = '공지사항';
        document.getElementById('noticeContent').innerHTML = contUrl;  // Now you can reassign noticeContent
        document.getElementById('notice').style.display = 'flex';
        try{
            const forceLoadGame = document.getElementById('forceLoadGame');
            forceLoadGame.addEventListener('click', () => {
                ipcRenderer.send('alert', '패치 다운로드', '브라우저에서 열리는 페이지에서 패치를 다운로드해주세요.');
                ipcRenderer.send('open-external', release.assets[0].browser_download_url);
                localStorage.setItem('lastUpdate', popupNotice.lastUpdate);
            });
            document.getElementById('noticeTitle').innerText = '신규 패치 배포 안내';
            document.getElementById('closeNotice').style.display = 'none';
            localStorage.setItem('lastUpdate', "00000000");
        }
        catch (error){
        }
    }
    

    if (banner.length > 0) {
        for (let i = 0; i < banner.length; i++) {
            const bannerObj = banner[i];
            const bannerElement = document.createElement('a');
            if (bannerObj.isStatic) {
                bannerElement.addEventListener('click', () => {
                    loadNotice(bannerObj.link);
                });
            } else {
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
    

    if (kartplugUpdate && kartplugUpdate.name !== 'kartplug-v1.1.0') {
        const changelog = await fetch('https://kartpatcher.github.io/changelog.txt').then(res => res.text());
        log(`[업데이트] 카트플러그 ${kartplugUpdate.name} 업데이트가 있습니다.`);
        ipcRenderer.send('alert', '업데이트', '브라우저에서 열리는 페이지에서 카트플러그 업데이트를 다운로드해주세요.\n\n<서비스 변경사항>\n'+changelog);
        ipcRenderer.send('open-external', kartplugUpdate.assets[0].browser_download_url);
        ipcRenderer.send('close-window');
    }

    const filePath = path.join(kartPath, 'Data', 'gui_font.rho');
    const aaafilePath = path.join(kartPath, 'Data', 'aaa.pk');
    log('[분석] 파일 패치 여부를 검증합니다.');
    const md5Checksum = await calculateMD5(filePath);
    const aaamd5Checksum = await calculateMD5(aaafilePath);
    log(`[분석] Checksum 값: ${md5Checksum}`);
    log(`[분석] Checksum 값: ${aaamd5Checksum}`);

    log('[분석] 패치 데이터를 불러옵니다.');

    if (popupNotice.lastUpdate !== localStorage.getItem('lastUpdate')) {
        localStorage.setItem('lastUpdate', popupNotice.lastUpdate);
        loadNotice(popupNotice.link);
    }

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
            start.innerText = '▶ 게임시작';
            start.addEventListener('click', () => {
                log('[정보] 게임을 실행합니다.');
                ipcRenderer.send('open-external', "tcgame://kart");
            });
        }
    }
    else if (unpatchedChecksums.includes(aaamd5Checksum)) {
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
        start.innerText = '▶ 게임시작';
        start.addEventListener('click', () => {
            log('[정보] 게임을 실행합니다.');
            ipcRenderer.send('open-external', "tcgame://kart");
        });
    }

    loading.style.display = 'none';
} catch (error) {
    loading.style.display = 'none';
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

        uniText.value = convertText(text);
        log(`[복사] ${text} -> ${uniText.value}`);
        navigator.clipboard.writeText(uniText.value).then(() => {
            uniText.value = '';
            uniText.focus();
        });
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
