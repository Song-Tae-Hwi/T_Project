document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById('setting');
    button.addEventListener('click', function() {
    chrome.runtime.sendMessage('removeAllWindows');
    });
});
