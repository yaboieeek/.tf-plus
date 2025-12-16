// ==UserScript==
// @name         QuicksellStorePlus
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      1.0.0
// @description  makes unusual items clickable for further redirection to it's backpack.tf page
// @author       eeek
// @match        https://quicksell.store/trade
// @icon         https://www.google.com/s2/favicons?sz=64&domain=quicksell.store
// @downloadURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/QuicksellStorePlus.user.js
// @updateURL  https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/QuicksellStorePlus.user.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const DEBUG_ENABLED = false;

const debug = {
    log: (...args) => DEBUG_ENABLED && console.log(...args),
    error: (...args) => DEBUG_ENABLED && console.log(...args),
    warning: (...args) => DEBUG_ENABLED && console.log(...args),
};

class Selectors {
    static CLASSES = {
        ITEMSCONTAINER: '.itemsContainer',
        ITEM: '._9oGESyv8.xzQUSN5i:not(._4kxlAHX-)',
        ITEMNAME:'.I0WfanFh',
        ITEMEFFECTIMG: '.OCMKyHlh',
        ITEMQUALITYSTRIP: '._3IvoXosk',
        OVERLAY: '.-RpjD12n'
    }
}

class ItemDataParser {
    constructor(itemHTMLElement) {
        this.element = itemHTMLElement;
    }

    get name () {
        debug.log(this.full_name, this.effectName);
        return this.full_name.replace(this.effectName, '').trim()
    }

    get full_name() {
        return this.element.querySelector(Selectors.CLASSES.ITEMNAME).textContent
    }

    get isUnusual() {
        return this.element.querySelector(Selectors.CLASSES.ITEMQUALITYSTRIP).classList.contains('mWVjcSoo');
    }

    get effectName() {
        if (!this.isUnusual) return;
        const regex = `https:\/\/quicksell\.store\/images\/particles\/(.*)_medium\.webp`;
        const match = this.element.querySelector(Selectors.CLASSES.ITEMEFFECTIMG).src.match(regex);
        debug.log(match);
        if (match) return match[1].replace(/%20/g, ' ');

        return '';
    }
}

class ItemModel {
    constructor(name, full_name, isUnusual) {
        this.name = name;
        this.full_name = full_name;
        this.isUnusual = isUnusual;
    }
}

class ApiService {
    constructor() {
        this.baseURL = `https://backpack.tf/search?text=`
    }

    async fetchItemPriceIndex(itemName) {
        debug.log('Attempting to fetch ' + itemName);
        try {
            const response = await this.#getResponse(itemName);
            if (response.results.length === 0) throw (response);
            debug.log(response.results[0])
            const priceIndex = response.results[0].values[0].priceindex;
            return priceIndex;
        } catch(e) {
            debug.log(e);
            debug.log('Error getting data for ' + itemName + '!');
            return 0;
        }
    }

    async #getResponse(itemName) {
        return new Promise((resolve, reject) => this.#fetch(itemName, resolve, reject));
    }

    async #fetch(itemName, resolver, rejector) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: this.baseURL + itemName,
            responseType: 'json',
            onload: (res) => resolver(res.response),
            onerror: (e) => rejector(e)
        })
    }
}

class ButtonsManager{
    constructor(element, itemModel, apiService) {
        this.element = element;
        this.itemModel = itemModel;
        this.apiService = apiService;
    }

    addButtons() {
        this.#makeListingClickable();
    }

    #makeListingClickable() {
        this.element.addEventListener('click', (e) => this.#bpButtonAction(e));
    }

    #bpButtonAction(event) {
        if (!event.ctrlKey || !this.itemModel.isUnusual) return;
        event.stopPropagation();

        this.apiService.fetchItemPriceIndex(this.itemModel.full_name).then((res) => {
            URLManager.openNewWindow(this.itemModel, res);
        });
    }
}

class App {

    init() {
        this.#observeMutations();
    };

    #observeMutations() {
        const pageLoadObserver = new MutationObserver((mutations, obs) => {
            if (!document.querySelector(Selectors.CLASSES.OVERLAY)) {
                debug.log('Page loaded successfully!');
                obs.disconnect();
                this.#observeItemsContainer()
            }
        });

        pageLoadObserver.observe(document.body, {
            childList: true,
            subtree: true
        })
    }

    #observeItemsContainer() {
        const itemsObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.removedNodes.length > 0) continue;

                const element = mutation.addedNodes[0];
                this.#processTheElement(element);
            }
        })

        itemsObserver.observe(document.querySelectorAll(Selectors.CLASSES.ITEMSCONTAINER)[1], {
            childList: true,
            subtree: true
        })
    }

    #processTheElement(element) {
        const parser = new ItemDataParser(element);
        const itemModel = new ItemModel(
            parser.name,
            parser.full_name,
            parser.isUnusual
        );
        debug.log(parser);
        const apiService = new ApiService();
        const buttonsManager = new ButtonsManager(element, itemModel, apiService);
        debug.log(buttonsManager);
        buttonsManager.addButtons();
    }
}

class URLManager {
    static openNewWindow(itemModel, priceIndex) {
        if (priceIndex === 0) {
            window.open(`https://google.com/search?q=${itemModel.full_name}`);
            return;
        };
        const bpLink = `https://backpack.tf/stats/Unusual/${itemModel.name}/Tradable/Craftable/${priceIndex}`;
        debug.log(bpLink);
        window.open(bpLink)
    }
}
new App().init()

