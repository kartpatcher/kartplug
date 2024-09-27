const {
    ipcRenderer,
    dialog
} = require('electron');


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



// Unicode mover
const uniText = document.getElementById('input');
uniText.focus();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === uniText) {
        const text = uniText.value;
    
        uniText.value = convertText(text);
        ipcRenderer.send('converted', uniText.value);
        window.close();
    } else if (e.key === 'Enter') {
        uniText.focus();
    } else if (e.key === 'Escape' && document.activeElement === uniText) {
        window.close();
    }
});