(async function () {

    if (window.__ltActive) {
        return
    }
    window.__ltActive = true

    let __nodesToTranslate = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'li', 'b', 'i', 'a', 'label'];
    let __translationCache = {};



    translate(document.title, 'text', function (resp) {
        document.title = resp.text
    })


    /* we only translate elements visible in the viewport for performance reasons
    rescan the dom for elements to translate if the viewport changes */
    document.addEventListener('scroll', translateDom);
    window.addEventListener('resize', translateDom);
    translateDom();

    async function translateDom() {
        nodes = findtranslatableElements();
        /* the api server understand "auto" and can guess the source language too
        but we send small fragments and so sometimes it lacks info.
        we have the info in the browser where we can look at more text and then
        just set the language so small fragments are properly translated too. */
        if (__args.sl == 'auto') {
            __args.sl = await detectLanguage(nodes);
        }
        translateNodes(nodes);
    }

    async function detectLanguage(nodes) {
        let langfreqmap = {};
        for (node of nodes) {
            let resp = await sendMessage({ action: "detect-lang", text: node.innerText });
            if (resp.languages.length >= 1) {
                let lang = resp.languages[0].language
                if (!langfreqmap[lang]) {
                    langfreqmap[lang] = 0
                }
                //weight each guess by length of text and certainty
                langfreqmap[lang] += (node.innerText.length * (resp.languages[0].percentage / 100))
            }
        }
        let detectedlang = '';
        let detectscore = 0;
        for (var key of Object.keys(langfreqmap)) {
            if (langfreqmap[key] > detectscore) {
                detectedlang = key
                detectscore = langfreqmap[key]
            }
        }
        if (detectedlang == '') {
            detectLanguage = 'auto'
        }

        return detectedlang
    }

    // the docs *say* runtime.sendMessage does promises,
    // but it doesnt?! so we just wrap it so we can await it.
    function sendMessage(message) {
        return new Promise(function (resolve, reject) {
            chrome.runtime.sendMessage(message, function (resp) {
                resolve(resp)
            })
        })
    }

    function translateNodes(allNodes) {
        for (let i = 0; i < allNodes.length; i++) {
            let node = allNodes[i]

            if (node.innerHTML == node.innerText) {
                /*
                sites seem to often have some piece of text that is repeating frequently
                think a "report" button under every post. Cache translations for small
                text fragments like that instead of querying the translation server every time.
                
                the limitation of checking <= 100 is entirely arbitrary. i just want to avoid caching for
                large text, since the longer the text, the lower the likelyhood of it repeating.

                same goes for the HTML below with the same logic, but we bump the max length to 200,
                since there might be some HTML markup like an 'a' tag in there. again, 200 was chosen arbitrarily.
                Both of these numbers can probably be optimized by measuring what would make sense instead of
                pulling them from where the sun don't shine.

                We also probably should implement some kind of LRU eviction so it doesn't grow infinitely...
                */
                if (node.innerText.length <= 100) {
                    if (__translationCache[node.innerText]) {
                        node.innerText = __translationCache[node.innerText]
                        setNodeTranslated(node)
                        continue
                    }
                }

                translate(node.innerText, 'text', function (resp) {
                    if (node.innerText.length <= 100) {
                        __translationCache[node.innerText] = resp.text
                    }
                    node.innerText = resp.text
                    setNodeTranslated(node)
                })
            } else {
                if (node.innerHTML.length <= 200) {
                    if (__translationCache[node.innerHTML]) {
                        node.innerText = __translationCache[node.innerHTML]
                        setNodeTranslated(node)
                        continue
                    }
                }
                translate(node.innerHTML, 'html', function (resp) {
                    if (node.innerHTML.length <= 200) {
                        __translationCache[node.innerHTML] = resp.text
                    }
                    node.innerHTML = resp.text
                    setNodeTranslated(node)
                    setTimeout(function () {
                        if (node.childNodes) {
                            [...node.childNodes].forEach(n => {
                                let tagName = n.tagName ? n.tagName.toLowerCase() : ''
                                if (n && __nodesToTranslate.includes(tagName)) {
                                    setNodeTranslated(n)
                                }
                            })
                        }
                    }, 0);
                })
            }
        }
    }

    function setNodeTranslated(node) {
        node.dataset.__ltTranslated = 'true'
    }

    function getNodeTranslated(node) {
        return node.dataset.__ltTranslated === 'true'
    }

    function setNodeQueued(node) {
        node.dataset.__ltQueued = 'true'
    }

    function getNodeQueued(node) {
        return node.dataset.__ltQueued === 'true'
    }

    function findtranslatableElements() {
        let allNodes = [];


        for (tagName of __nodesToTranslate) {
            let nodeList = document.getElementsByTagName(tagName);
            let nodes = Array.prototype.slice.call(nodeList);
            nodes = filterTranslatable(nodes)
            nodes = filterChilds(nodes)
            nodes = filterHidden(nodes)
            nodes = filterInViewport(nodes)
            nodes = filterTranslated(nodes)
            nodes = filterQueued(nodes)

            for (n of nodes) {
                setNodeQueued(n)
            }

            allNodes = allNodes.concat(nodes)
        }

        allNodes.sort(function (a, b) {
            let ab = a.getBoundingClientRect();
            let bb = b.getBoundingClientRect();

            return ab.top - bb.top
        });

        return allNodes
    }

    function filterQueued(nodes) {
        unqueuedNodes = [];

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i]
            if (!getNodeQueued(node)) {
                unqueuedNodes.push(node)
            }
        }
        return unqueuedNodes
    }

    function filterTranslated(nodes) {
        translatedNodes = [];

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i]
            if (!getNodeTranslated(node)) {
                translatedNodes.push(node)
            }
        }
        return translatedNodes
    }

    function filterInViewport(nodes) {
        viewportNodes = [];

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i]
            if (isInViewport(node)) {
                viewportNodes.push(node)
            }
        }
        return viewportNodes
    }

    function filterTranslatable(nodes) {
        translateableNodes = [];

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i]
            if (hasTranslateableText(node)) {
                translateableNodes.push(node)
            }
        }
        return translateableNodes
    }

    function filterHidden(nodes) {
        visibleNodes = [];
        function isHidden(el) {
            return (el.offsetParent === null)
        }

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i]
            if (!isHidden(node)) {
                visibleNodes.push(node)
            }
        }
        return visibleNodes
    }

    function filterChilds(nodes) {
        topLevelNodes = [];

        for (let i = 0; i < nodes.length; i++) {
            let child = nodes[i]
            var node = child
            var found = false
            while (node.parentNode) {
                node = node.parentNode

                if (nodes.includes(node)) {
                    //we're a child of another node in the list
                    found = true
                    break;
                }
            }
            if (!found) {
                topLevelNodes.push(child);
            }
        }
        return topLevelNodes
    }
    function hasTranslateableText(node) {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() != "") {
            return true
        }
        node = node.firstChild
        while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() != "") {
                return true
            }
            node = node.nextSibling
        }
        return false
    }

    function isInViewport(node) {
        let bounding = node.getBoundingClientRect();
        return (
            bounding.top >= 0 &&
            bounding.left >= 0 &&
            bounding.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.left <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }




    function translate(txt, type, cb) {
        chrome.runtime.sendMessage({ action: "translate", type: type, text: txt, sl: __args.sl, tl: __args.tl }, function (response) {
            cb(response)
        });
    }


})()