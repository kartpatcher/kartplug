// renderer.js
const {
    ipcRenderer,
    dialog
} = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Logger
const logger = document.getElementById('logger');

// Game info
const gameTitle = document.getElementById('gameTitle');
const mainContent = document.getElementById('mainContent');
const chatArea = document.getElementById('chatArea');
const version = document.getElementById('version');
let start = document.getElementById('start');

// Notice
const notice = document.getElementById('notice');
const noticeTitle = document.getElementById('noticeTitle');
const noticeContent = document.getElementById('noticeContent');
const noticeClose = document.getElementById('closeNotice');

// UI
const loading = document.getElementById('loading');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');

// Community Links
const youtube = document.getElementById('youtube');
const discord = document.getElementById('discord');

// Games
const easteregg = document.getElementById('easteregg');
const kart = document.getElementById('kart');
const jlgolf = document.getElementById('jlgolf');

const notification = new Audio('sound/message01.mp3');

let tcPath = "C:\\Program Files (x86)\\TCGAME";
let kartPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart";
let sourceURI = "https://kartpatcher.github.io";
let githubURI = "https://api.github.com/repos/kartpatcher/kartpatcher.github.io/releases";
let appVersion = "1.1.1.1";

function sendNotification(title, body) {
    ipcRenderer.send('push-notification', title, body);
    notification.play();
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


function log(message) {
    logger.innerHTML += `<p>${message}</p>`;
    logger.scrollTop = logger.scrollHeight;
}
// 사용 예시
window.onload = async () => {
    youtube.addEventListener('click', () => {
        ipcRenderer.send('open-external', 'https://www.youtube.com/@H2OStudioKR');
    });

    discord.addEventListener('click', () => {
        ipcRenderer.send('open-external', 'https://discord.com/invite/FjA2EqHKBB');
    });

    noticeClose.addEventListener('click', () => {
        notice.style.display = 'none';
    });

    minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-window');
    });

    try {
        const releases = await fetch(githubURI, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }).then(res => res.json());

        const popupNotice = await fetch(sourceURI + '/notice.json').then(res => res.json());
        const kartplugUpdate = releases.find(release => release.tag_name === 'kartplug');

        async function loadNotice(url) {
            const contUrl = await fetch(url).then(res => res.text());
            noticeTitle.innerText = '공지사항';
            noticeContent.innerHTML = contUrl; // Now you can reassign noticeContent
            notice.style.display = 'flex';
        }

        async function loadBanners(game) {
            let bannerURI = "";
            if (game == 'kart') {
                bannerURI = sourceURI + '/banner.json';
            } else if (game == 'jlgolf') {
                bannerURI = sourceURI + '/jlgolf/banner.json';
            }

            document.getElementById('patchContent').innerHTML = '';
            const banner = await fetch(bannerURI).then(res => res.json());

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
        }

        if (kartplugUpdate && kartplugUpdate.name !== 'kartplug-v' + appVersion) {
            const changelog = await fetch(sourceURI + '/changelog.txt').then(res => res.text());
            log(`[업데이트] 카트플러그 ${kartplugUpdate.name} 업데이트가 있습니다.`);
            sendNotification('카트플러그', '버전 '+kartplugUpdate.name.replace('kartplug-v', '')+' 업데이트가 있습니다.');
            ipcRenderer.send('alert', '업데이트', '브라우저에서 열리는 페이지에서 카트플러그 업데이트를 다운로드해주세요.\n\n<서비스 변경사항>\n' + changelog);
            ipcRenderer.send('open-external', kartplugUpdate.assets[0].browser_download_url);
            ipcRenderer.send('close-window');
        }

        if (popupNotice.lastUpdate !== localStorage.getItem('lastUpdate')) {
            localStorage.setItem('lastUpdate', popupNotice.lastUpdate);
            loadNotice(popupNotice.link);
        }


        kartInit(releases);
        loadBanners('kart');
        gameUIInit('kart');

        kart.addEventListener('click', () => {
            loadBanners('kart');
            gameUIInit('kart');
            kartInit(releases);
        });
        jlgolf.addEventListener('click', () => {
            loadBanners('jlgolf');
            gameUIInit('jlgolf');
            jlInit(releases);
        });
        easteregg.addEventListener('click', () => {
            gameUIInit('gosegu');
            seguInit(releases);
        });
    } catch (error) {
        console.error(error);
    }
};

function gameUIInit(game) {
    ipcRenderer.send('change-presence', game);
    if (game == 'kart') {
        gameTitle.innerHTML = '크레이지레이싱 카트라이더<img src="img/all.png" alt="전체이용가" class="gameRating"/>';
        chatArea.style.opacity = '1';
        document.body.style.backgroundColor = '#05324B';
    } else if (game == 'jlgolf') {
        gameTitle.innerText = 'JL GOLF: Nice Shot';
        chatArea.style.opacity = '0';
        document.body.style.backgroundColor = '#1F6A83';
    } else if (game == 'gosegu'){
        gameTitle.innerText = '세구라이드';
        chatArea.style.opacity = '0';
        document.body.style.backgroundColor = '#1F6A83';
    }
    logger.innerHTML = '';
    mainContent.style.backgroundImage = 'url("games/' + game + '/defaultbg.png")';
    start.outerHTML = start.outerHTML;
    start = document.getElementById('start');
}

async function jlInit(releases) {
    loading.style.display = 'none';
    start.innerText = '▶ 트레일러 보기';
    version.innerText = '출시 예정';
    start.addEventListener('click', () => {
        noticeContent.innerHTML = '<iframe width="720" height="480" src="https://www.youtube.com/embed/W65GyGJ92Jc" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        noticeTitle.innerText = '트레일러';
        notice.style.display = 'flex';
    });
}

async function seguInit(releases) {
    loading.style.display = 'none';
    start.innerText = '▶ 게임시작';
    version.innerText = '이걸찾네 ㅋㅋㅋㅋ';
    start.addEventListener('click', () => {
        start.innerText = '실행 중...';
        start.outerHTML = start.outerHTML;
        setTimeout(() => {
            ipcRenderer.send('easteregg');
        }, 3000);
    });
}

async function kartInit(releases) {
    try {
        const validChecksums = await fetchChecksums(sourceURI + '/checksums.txt');
        const unpatchedChecksums = await fetchChecksums(sourceURI + '/stock.txt');

        const release = releases.find(release => release.name === validChecksums[0] && release.tag_name === 'patch');

        const filePath = path.join(kartPath, 'Data', 'gui_font.rho');
        const aaafilePath = path.join(kartPath, 'Data', 'aaa.pk');

        log('[분석] 파일 패치 여부를 검증합니다.');
        const md5Checksum = await calculateMD5(filePath);
        const aaamd5Checksum = await calculateMD5(aaafilePath);
        log(`[분석] Checksum 값: ${md5Checksum}`);
        log(`[분석] Checksum 값: ${aaamd5Checksum}`);

        log('[분석] 패치 데이터를 불러옵니다.');


        if (validChecksums.includes(md5Checksum)) {
            if (validChecksums[0] !== md5Checksum) {
                sendNotification('카트플러그', '한글 패치 업데이트가 있습니다.');
                log('[분석] 패치가 최신 버전이 아닙니다.');
                version.innerText = '최신 버전이 아닙니다.';
                start.innerText = '패치 업데이트';
                start.addEventListener('click', () => {
                    ipcRenderer.send('alert', '패치 다운로드', '브라우저에서 열리는 페이지에서 패치를 다운로드해주세요.');
                    ipcRenderer.send('open-external', release.assets[0].browser_download_url);
                });
            } else {
                log('[분석] 최신 버전입니다.');
                version.innerText = '최신 버전입니다.';
                start.innerText = '▶ 게임시작';
                start.addEventListener('click', () => {
                    log('[정보] 게임을 실행합니다.');
                    ipcRenderer.send('open-external', "tcgame://kart");
                });
            }
        } else if (unpatchedChecksums.includes(aaamd5Checksum)) {
            log('[분석] 패치되지 않은 버전입니다.');
            version.innerText = '패치되지 않았습니다.';
            start.innerText = '패치 설치';

            start.addEventListener('click', () => {
                ipcRenderer.send('alert', '패치 설치', '브라우저에서 열리는 페이지에서 패치를 다운로드해주세요.');
                ipcRenderer.send('open-external', release.assets[0].browser_download_url);
            });
        } else {
            log('[분석] 한글패치가 제작된 버전이 아닙니다.');
            version.innerText = '한글패치 적용 불가능 버전입니다.';
            start.innerText = '▶ 게임시작';
            start.addEventListener('click', () => {
                log('[정보] 게임을 실행합니다.');
                ipcRenderer.send('open-external', "tcgame://kart");
            });
        }
    } catch (error) {
        loading.style.display = 'none';
        log(`[오류] ${error.message}`);
        sendNotification('카트플러그', '설치 경로가 올바르게 설정되어 있지 않습니다.');
        log('[정보] 설치 상태는 <strong>Ctrl+R</strong>키로 카트플러그를 재시작하여 확인할 수 있습니다.');
        try {
            fs.accessSync(path.join(tcPath, 'TCGame.exe'));
            version.innerText = '跑跑卡丁车를 설치하세요.';
            start.innerText = 'TCGAME 실행';
            start.addEventListener('click', () => {
                log('[정보] 게임을 실행합니다.');
                ipcRenderer.send('open-external', "tcgame://kart");
            });
        } catch (error) {
            version.innerText = 'TCGAME으로 설치되어 있지 않습니다.';
            start.innerText = 'TCGAME 설치';
            start.addEventListener('click', () => {
                ipcRenderer.send('alert', 'TCGAME 설치', '브라우저에서 열리는 페이지에서 游戏下载을 눌러 TCGAME 런처를 설치해주세요.');
                ipcRenderer.send('open-external', "https://popkart.tiancity.com/homepage/v3/");
            });
        }
    }
    loading.style.display = 'none';
}