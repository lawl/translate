var chrome = chrome || browser

document.addEventListener('DOMContentLoaded', async function () {

    try {
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
    } catch (e) { /*maybe display some UI? don't know*/ }

    setView('main')

    document.getElementById('doTranslate').addEventListener('click', async function () {
        /*
        await chrome.tabs.executeScript({
            code: 'var __args=' + JSON.stringify(
                {
                    sl: document.getElementById('translatefrom').value,
                    tl: document.getElementById('translateto').value
                })
        });
        await chrome.tabs.executeScript({ file: "translate.js" });
        */
        /*
         */
        console.log("sending msg")
        let resp = await chrome.runtime.sendMessage({
            action: "inject",
            sl: document.getElementById('translatefrom').value,
            tl: document.getElementById('translateto').value
        });
        console.log("rcv'd ", resp);
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



/* FIXME 2 functions below are duplicated, because FUCK manifest v3 and FUCK google */
function APIQuery(method, route, body) {

    return new Promise(function (resolve, reject) {
        getSettings(function (data) {
            fetch(data.settings['api-endpoint'] + route, {
                method: method,
                body: body,
                headers: { "Content-Type": "application/json" }
            }).then(function (res) {
                res.json().then(function (jsn) {
                    resolve(jsn)
                }).catch(function (err) {
                    reject(err)
                })
            }).catch(function (err) {
                reject(err)
            });
        })
    })


}


function getSettings(cb) {
    chrome.storage.sync.get('settings', function (data) {
        if (!data.settings) {
            let defaultsettings = {
                'api-endpoint': 'https://example.org/'
            }
            cb({ settings: defaultsettings })
            return
        }
        cb(data)
    })
}