var chrome = chrome || browser

document.addEventListener('DOMContentLoaded', async function () {

    let resp = await APIQuery('GET', 'languages', null)
    let trTo = document.getElementById('translateto')
    let trFrom = document.getElementById('translatefrom')
    let opt = document.createElement('option');
    opt.value = "auto"
    opt.innerText = "Detect automatically"
    trFrom.appendChild(opt)
    let browserLang = navigator.language.split("-")[0];
    for (lang of resp) {
        let opt = document.createElement('option');
        opt.value = lang.code
        opt.innerText = lang.name
        trFrom.appendChild(opt)
        let opt2 = opt.cloneNode(true)
        if (lang.code == browserLang) {
            opt2.selected = true
        }
        trTo.appendChild(opt2)
    }

    setView('main')

    document.getElementById('doTranslate').addEventListener('click', async function () {
        await chrome.tabs.executeScript({
            code: 'var __args=' + JSON.stringify(
                {
                    sl: document.getElementById('translatefrom').value,
                    tl: document.getElementById('translateto').value
                })
        });
        await chrome.tabs.executeScript({ file: "translate.js" });
    })

    document.getElementById('settingsbtn').addEventListener('click', function () {
        setView('settings')
    })

    document.querySelectorAll('.btnToMainView').forEach(function (item) {
        item.addEventListener('click', function () {
            setView('main')
        })
    })

    getSettings(function (data) {
        let settings = [...document.querySelectorAll('.setting')]
        for (s of settings) {
            s.value = data.settings[s.dataset['storename']]
        }
    });

    document.getElementById('saveSettings').addEventListener('click', function () {
        let settings = [...document.querySelectorAll('.setting')]
        let collection = {};
        for (s of settings) {
            if (!('storename' in s.dataset)) {
                continue
            }
            collection[s.dataset['storename']] = s.value;
        }
        chrome.storage.sync.set({ settings: collection });
    })
})

function setView() {
    var views = document.querySelectorAll('.view');
    [...views].forEach((v) => {
        v.style.display = 'none';
    });

    for (var view of arguments) {
        var el = document.querySelector('.view_' + view);
        el.style.display = 'block';
    }
}