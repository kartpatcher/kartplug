const {
    ipcRenderer,
    dialog
} = require('electron');

//when video ends, force redirect to rickroll
const video = document.querySelector('video');
video.onended = function() {
    window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
};

setTimeout(() => {
    document.addEventListener('click', function() {
        this.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    });
}, 3000);