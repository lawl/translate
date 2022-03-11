var chrome = chrome || browser


chrome.runtime.onMessage.addListener(

    /* we CANNOT use async/await here, because we need to return true
    to indicate that this function calls sendResponse asynchronously */
    function (request, sender, sendResponse) {
        if (request.action === "translate") {
            APIQuery('POST', 'translate',
                JSON.stringify({
                    q: request.text,
                    source: request.sl,
                    target: request.tl,
                    format: request.type
                })).then(function (jsn) {
                    sendResponse({ type: request.type, text: jsn.translatedText });
                })
            return true
        }
        if (request.action === "detect-lang") {
            chrome.i18n.detectLanguage(request.text, function (info) {
                sendResponse(info)
            });
            return true
        }

    }

);
