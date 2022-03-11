
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