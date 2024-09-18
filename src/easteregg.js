const {
    ipcRenderer,
    dialog
} = require('electron');

//when video ends, force redirect to rickroll
const video = document.querySelector('video');
video.onended = function() {
    window.location.href = "https://www.youtube.com/embed/uBEeovd0Zc0?autoplay=1&loop=1";
};

setTimeout(() => {
    document.addEventListener('click', function() {
        this.location.href = "https://www.youtube.com/embed/uBEeovd0Zc0?autoplay=1&loop=1";
    });
}, 3000);