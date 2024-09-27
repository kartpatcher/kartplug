const TOTP = require('totp-generator');
const otpFile = fs.readFileSync(path.join(__dirname, 'otp.html'), 'utf8');
const trustKey = ["IZKUGSZAJJAU2TKJJZCVGRKL", "IRHU4R2XJ5HCAVKOJFLEKUST"];

otpBtn.addEventListener('click', () => {
    noticeContent.innerHTML = otpFile;
    noticeTitle.innerText = '디스코드 인증 OTP';
    notice.style.display = 'flex';

    const otpKey = document.getElementById('otpKey');
    
    setInterval(() => {
        const { otp, expires } = TOTP.TOTP.generate(trustKey[userTrustLevel]);
        var otpSpace = otp.split('').join(' ');
        otpKey.innerText = otpSpace;
    }, 1000);
});