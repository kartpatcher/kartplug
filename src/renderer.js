// renderer.js
const {
    ipcRenderer,
    dialog
} = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const unzipper = require('unzipper');
const Registry = require('winreg');

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
const noticeWrap = document.getElementById('notiWrap');
const oobe = document.getElementById('oobe');

// UI
const loading = document.getElementById('loading');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const loadingText = document.getElementById('loadingText');

// Community Links
const youtube = document.getElementById('youtube');
const discord = document.getElementById('discord');
const otpBtn = document.getElementById('otp');
const helpBtn = document.getElementById('question');
const batteryBtn = document.getElementById('battery');

// Games
const easteregg = document.getElementById('easteregg');
const kart = document.getElementById('kart');
const jlgolf = document.getElementById('jlgolf');
const kartdrift = document.getElementById('kartdrift');
const jlgolf2 = document.getElementById('jlgolf2');

const notification = new Audio('sound/message01.mp3');
const jamminTest = new Audio('sound/jamminTest.mp3');
const success = new Audio('sound/clear.mp3');
const dialogA = new Audio('sound/dialog.mp3');

let tcRegSuccess = false;
let kartPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart";
let kartVersion = "P0000";

let kdRegSuccess = false;
let kartDriftPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kartdrift";

let jamminTestComplete = false;
let jamminTestTimeStamp = 0;
let jamminTestCount = 0;

let userTrustLevel = 0;

let downloadInProgress = false;
let sourceURI = "https://h2ostudio.vercel.app/static";
let githubKPURI = "https://api.github.com/repos/kartpatcher/kartplug/releases";
let githubURI = "https://api.github.com/repos/kartpatcher/kartpatcher.github.io/releases";
let appVersion = "2.1.1";

function sendNotification(title, body) {
    ipcRenderer.send('push-notification', title, body);
    //notification.play();
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

    helpBtn.addEventListener('click', () => {
        ipcRenderer.send('open-external', 'https://h2ostudio.vercel.app/docs');
    });

    batteryBtn.addEventListener('click', () => {
        ipcRenderer.send('open-external', 'https://h2ostudio.vercel.app/docs/battery');
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

        const releasesKP = await fetch(githubKPURI, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }).then(res => res.json());

        const popupNotice = await fetch(sourceURI + '/notice.json').then(res => res.json());

        async function loadNotice(url) {
            const contUrl = await fetch(url).then(res => res.text());
            noticeTitle.innerText = '공지사항';
            noticeContent.innerHTML = contUrl; // Now you can reassign noticeContent
            notice.style.display = 'flex';
        }

        async function loadBanners(game) {
            if (downloadInProgress) {  
                return;
            }

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

        if (releasesKP && releasesKP.name !== 'v' + appVersion) {
            sendNotification('카트플러그', '버전 '+releasesKP.name+' 업데이트가 있습니다.');
            await downloadFile(releasesKP.assets[0].browser_download_url, process.cwd(), 'kartplug');
        }

        if (!jamminTestComplete){
            jamminTestInit();
        }
        else{
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
        jlgolf2.addEventListener('click', () => {
            ipcRenderer.send('alert', '개발이 중단된 게임입니다.', 'JL Golf: Nice Shot은 Life of JL로 리뉴얼 중에 있습니다.\nJL의 여정을 담은 시뮬레이션 게임을 기대해주세요.');
        });
        kartdrift.addEventListener('click', () => {
            loadBanners('kd');
            gameUIInit('kd');
            kdInit(releases);
        });
        easteregg.addEventListener('click', () => {
            gameUIInit('gosegu');
            seguInit(releases);
        });
    }
    } catch (error) {
        console.error(error);
    }
};

function playSuccessAni(){
    success.play();
    document.getElementById('successCinema').style.display = 'flex';
    document.getElementById('successCinema').classList.add('success');
    document.getElementById('successText').classList.add('successAni');
    setTimeout(() => {
        document.getElementById('successText').style.display = 'none';
    }, 5000);

    setTimeout(() => {
        document.getElementById('successCinema').style.display = 'none';
        dialogA.play();
        ipcRenderer.send('alert', '카트플러그', '축하합니다! 테스트를 완료하였습니다.');
        location.reload();
    }, 7000);
}

function playSuccessAniDownload(){
    sendNotification('카트플러그', '패치 파일 설치가 완료되었습니다.');
    dialogA.play();
    kart.click();
}

async function jamminTestInit() {
    const jtFile = fs.readFileSync(path.join(__dirname, 'jamminTest/intro.html'), 'utf8');
    const jtEnglishListening = fs.readFileSync(path.join(__dirname, 'jamminTest/english.html'), 'utf8');
    const questions = fs.readFileSync(path.join(__dirname, 'jamminTest/tests.json'), 'utf8');

        jamminTestCount = 0;
        fs.writeFileSync(configPath, JSON.stringify({
            jamminTestComplete,
            jamminTestTimeStamp,
            jamminTestCount
        }));
    

    /*jamminTest.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play();
    }, false);
    jamminTest.play();*/

    noticeContent.innerHTML = jtFile;
    noticeTitle.innerText = '시작하기';
    oobe.style.display = 'flex';
    oobe.classList.add('fadeIn');
    notice.style.display = 'flex';
    noticeWrap.classList.add('animate');

    noticeClose.style.display = 'none';

    // Jammin Test
    const startTest = document.getElementById('startTest');
    const passTest = document.getElementById('hipass');

    passTest.addEventListener('click', () => {
        //jamminTest.pause();
        //playSuccessAni();
        jamminTestComplete = true;
        fs.writeFileSync(configPath, JSON.stringify({
            jamminTestComplete,
            jamminTestTimeStamp,
            jamminTestCount
        }));
        location.reload();
    });
/*
    startTest.addEventListener('click', () => {
        let question = JSON.parse(questions);
        let random = Math.floor(Math.random() * question.length);
        let q = question[random];
        noticeContent.innerHTML = jtEnglishListening;

        if(q.type == "englishListening"){
            jamminTest.pause();
            document.getElementById('questionAudio').src = q.audioFile;
            document.getElementById('questionAudio').play();
        }
        else{
            document.getElementById('questionAudio').style.display = 'none';
        }

        document.getElementById('question').innerText = q.question;
        document.getElementById('questionContent').innerHTML = q.questionData;

        jamminTestTimeStamp = Date.now();
        jamminTestCount++;
        jamminTestComplete = false; 

        fs.writeFileSync(configPath, JSON.stringify({
            jamminTestComplete,
            jamminTestTimeStamp,
            jamminTestCount
        }));

        let time = 300;

        document.getElementById('remainTime').innerText = "남은 시간: "+time;
        let timer = setInterval(() => {
            time--;
            document.getElementById('remainTime').innerText = "남은 시간: "+time;
            if (time <= 0) {
                clearInterval(timer);
                document.getElementById('remainTime').innerText = '시간초과';
                sendNotification('카트플러그', '시간이 초과되었습니다. 내일 다시 시도하세요!');
                window.close();
            }
        }, 1000);

        // Check Answer
        const submitTest = document.getElementById('submitTest');
        const answer = document.getElementById('answer');

        submitTest.addEventListener('click', () => {
            if (answer.value.toLowerCase() == q.answer) {
                jamminTest.pause();
                playSuccessAni();
                clearInterval(timer);
                jamminTestComplete = true;
                fs.writeFileSync(configPath, JSON.stringify({
                    jamminTestComplete,
                    jamminTestTimeStamp,
                    jamminTestCount
                }));
            } else {
                sendNotification('카트플러그', '오답입니다.');
                location.reload();
            }
        });
    });*/
}

async function downloadFile(url, filepath, type) {
    if (downloadInProgress) {
        return;
    }
    downloadInProgress = true;
    const downloadUrl = url;
    let zipFilePath;

    if (type == 'kart') {
        zipFilePath = path.join(filepath, 'patcha.zip');
    } else {
        zipFilePath = path.join(filepath, 'Setup.exe');
    }

    try {
        fs.unlinkSync(zipFilePath);
    } catch (error) {
        console.log('No old file');
    }

    // Ensure the directory exists
    fs.mkdirSync(filepath, { recursive: true });

    // 다운로드
    start.classList.add('download');
    log('[다운로드] 패치 파일을 다운로드합니다.');

    const response = await fetch(downloadUrl);
    const totalBytes = parseInt(response.headers.get('content-length'), 10);
    let downloadedBytes = 0;

    const fileStream = fs.createWriteStream(zipFilePath, { flags: 'w' });
    const reader = response.body.getReader();

    const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
            fileStream.end();
            return;
        }

        fileStream.write(value);
        downloadedBytes += value.length;
        const percentage = ((downloadedBytes / totalBytes) * 100).toFixed(2);
        if (type == 'kart'){
        start.innerText = `다운로드 중... ${percentage}%`;
        }
        else{
            loadingText.innerHTML = `<br>다운로드 중... ${percentage}%`;
        }

        await pump();
    };

    await pump();

    // Ensure fileStream has finished writing
    await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });

    if (type == 'kart') {
    // 압축 해제
    start.innerText = `설치 중...`;
    log('[압축 해제] 패치 파일을 압축 해제합니다.');
    await new Promise((resolve, reject) => {
        fs.createReadStream(zipFilePath)
            .pipe(unzipper.Extract({ path: filepath }))
            .on('close', resolve)
            .on('error', reject);
    });

    log('[완료] 패치 파일이 성공적으로 업데이트되었습니다.');
    fs.unlinkSync(zipFilePath); // 압축 파일 삭제
    start.innerText = '패치 완료';
    downloadInProgress = false;
    playSuccessAniDownload();
}
else{
    log('[다운로드] 파일을 실행합니다.');
    const { exec } = require('child_process');
    exec(zipFilePath, (err, stdout, stderr) => {
        if (err) {
            ipcRenderer.send('alert', '오류', '파일을 실행하는 중 오류가 발생했습니다.');
            return;
        }
        console.log(stdout);
        window.close();
    });
}
}

function gameUIInit(game) {
    if (downloadInProgress) {  
        return;
    }

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
    } else if (game == 'kd'){
        gameTitle.innerText = '카트라이더: 드리프트';
        chatArea.style.opacity = '0';
        document.body.style.backgroundColor = '#1F6A83';
    }
    logger.innerHTML = '';
    mainContent.style.backgroundImage = 'url("games/' + game + '/defaultbg.png")';
    try{
        start.outerHTML = start.outerHTML;
    }
    catch(e){
    }

    start = document.getElementById('start');
    start.classList.remove('download');
}

async function kdInit(releases) {
    if (downloadInProgress) {  
        return;
    }
    
    loading.style.display = 'none';
    start.innerText = '▶ 어떻게 패치되나요?';
    version.innerText = '출시 예정';
    start.addEventListener('click', () => {
        noticeContent.innerHTML = '배경음악, 서체 등 게임 내 리소스를 한글화합니다.<br>';
        noticeTitle.innerText = '패치 로드맵';
        notice.style.display = 'flex';
    });
}

async function jlInit(releases) {
    if (downloadInProgress) {  
        return;
    }
    
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
    if (downloadInProgress) {  
        return;
    }
    
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
    if (downloadInProgress) {  
        return;
    }
    
    if (tcRegSuccess) {
        const validChecksums = await fetchChecksums(sourceURI + '/checksums.txt');
        const unpatchedChecksums = await fetchChecksums(sourceURI + '/stock.txt');
        //const serialNumber = await fetch(sourceURI + '/serial.txt').then(res => res.text());

        const release = releases.find(release => release.name === validChecksums[0]);

        //const filePath = path.join(kartPath, 'Data', 'gui_font.rho');
        const aaafilePath = path.join(kartPath, 'Data', 'aaa.pk');

        log('[분석] 파일 패치 여부를 검증합니다.');
        const md5Checksum = await calculateMD5(aaafilePath);
        log(`[분석] Checksum 값: ${md5Checksum}`);

        log('[분석] 패치 데이터를 불러옵니다.');


        if (validChecksums.includes(md5Checksum)) {
            if (validChecksums[0] !== md5Checksum) {
                userTrustLevel = 1;
                sendNotification('카트플러그', '한글 패치 업데이트가 있습니다.');
                log('[분석] 패치가 최신 버전이 아닙니다.');
                version.innerText = kartVersion+' 최신 버전이 아닙니다.';
                start.innerText = '패치 업데이트';
                start.addEventListener('click', () => {
                    downloadFile(release.assets[0].browser_download_url, kartPath, 'kart');
                });
            } else {
                userTrustLevel = 1;
                log('[분석] 최신 버전입니다.');
                version.innerText = kartVersion+' 최신 버전입니다.';
                start.innerText = '▶ 게임시작';
                start.addEventListener('click', () => {
                    log('[정보] 게임을 실행합니다.');
                    ipcRenderer.send('open-external', "tcgame://kart");
                });
            }
        } else if (unpatchedChecksums.includes(md5Checksum)) {
            userTrustLevel = 0;
            log('[분석] 패치되지 않은 버전입니다.');
            version.innerText = kartVersion+' 패치되지 않았습니다.';
            start.innerText = '패치 설치';

            start.addEventListener('click', () => {
                downloadFile(release.assets[0].browser_download_url, kartPath, 'kart');
            });
        } else {
            userTrustLevel = 1;
            log('[분석] 한글패치가 제작된 버전이 아닙니다.');
            version.innerText = kartVersion+ '버전은 한글패치가 불가능합니다.';
            start.innerText = '▶ 게임시작';
            start.addEventListener('click', () => {
                log('[정보] 게임을 실행합니다.');
                ipcRenderer.send('open-external', "tcgame://kart");
            });
        }
    } else {
        userTrustLevel = 0;
        loading.style.display = 'none';
        sendNotification('카트플러그', '설치 경로가 올바르게 설정되어 있지 않습니다.');
        log('[정보] 설치 상태는 <strong>Ctrl+R</strong>키로 카트플러그를 재시작하여 확인할 수 있습니다.');

        version.innerText = 'TCGAME으로 설치되어 있지 않습니다.';
        start.innerText = 'TCGAME 설치';
        start.addEventListener('click', () => {
            ipcRenderer.send('alert', 'TCGAME 설치', '브라우저에서 열리는 페이지에서 游戏下载을 눌러 TCGAME 런처를 설치해주세요.');
            ipcRenderer.send('open-external', "https://popkart.tiancity.com/homepage/v3/");
        });
    }
    loading.style.display = 'none';
}