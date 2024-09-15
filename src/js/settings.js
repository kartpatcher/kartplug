const settingsBtn = document.getElementById('setting');
const settingFile = fs.readFileSync(path.join(__dirname, 'setting.html'), 'utf8');
const configPath = path.join(process.cwd(), 'config.json');

// 확인버튼도 못누르는 병신같은 개초딩들 
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
        tcPath: "C:\\Program Files (x86)\\TCGAME",
        kartPath: "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart",
        jamminTestComplete: false,
        jamminTestTimeStamp: 0,
        jamminTestCount: 0
    }));
}
else {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.kartPath){
        kartPath = config.kartPath;
    }
    if (config.tcPath){
        tcPath = config.tcPath;
    }
    if (config.jamminTestComplete){
        jamminTestComplete = config.jamminTestComplete;
    }
    if (config.jamminTestTimeStamp){
        jamminTestTimeStamp = config.jamminTestTimeStamp;
    }
    if (config.jamminTestCount){
        jamminTestCount = config.jamminTestCount;
    }
}
settingsBtn.addEventListener('click', () => {
    noticeContent.innerHTML = settingFile;
    noticeTitle.innerText = '설정 ('+appVersion+')';
    notice.style.display = 'flex';

    const searchKart = document.getElementById('searchKart');
    const searchTc = document.getElementById('searchTc');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');

    const pathKart = document.getElementById('pathKart');
    const pathTc = document.getElementById('pathTc');

    pathKart.value = kartPath;
    pathTc.value = tcPath;

    var tempKartPath = kartPath;
    var tempTcPath = tcPath;

    resetBtn.addEventListener('click', () => {
        tempKartPath = "C:\\Program Files (x86)\\TCGAME\\TCGameApps\\kart";
        tempTcPath = "C:\\Program Files (x86)\\TCGAME";
        pathKart.value = tempKartPath;
        pathTc.value = tempTcPath;
    });

    searchKart.addEventListener('click', async () => {
        ipcRenderer.invoke('dialog:openDirectory').then(result => {
            if (result) {
                tempKartPath = result;
                pathKart.value = result;
            } else {
                ipcRenderer.send('alert', '경로 선택', '경로를 선택하지 않았습니다.');
            }
        });
    });
    searchTc.addEventListener('click', async () => {
        ipcRenderer.invoke('dialog:openDirectory').then(result => {
            if (result) {
                tempTcPath = result;
                pathTc.value = result;
            } else {
                ipcRenderer.send('alert', '경로 선택', '경로를 선택하지 않았습니다.');
            }
        });
    });

    saveBtn.addEventListener('click', () => {
        kartPath = tempKartPath;
        tcPath = tempTcPath;
        fs.writeFileSync(configPath, JSON.stringify({
            tcPath,
            kartPath,
            jamminTestComplete,
            jamminTestTimeStamp,
            jamminTestCount
        }));
        window.location.reload();
    });
});
