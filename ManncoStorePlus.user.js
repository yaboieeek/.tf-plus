// ==UserScript==
// @name         ManncoStore+ 
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      2.0.0
// @description  Adds backpack.tf stat page button for unusuals | Replaces sc links with bptf history
// @author       eeek
// @match       https://mannco.store/item/440-*
// @match       https://mannco.store/ru/item/440-*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mannco.store
// @downloadURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ManncoStorePlus.user.js
// @updateURL  https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ManncoStorePlus.user.js
// @grant        GM_addStyle
// ==/UserScript==
const SELECTORS = {
    LOAD_SPINNER: '#transacContent .spinner-border',
    ITEM_TABLE_ROW: '.itemListPagination',
    ITEM_INFO: {
        SELF: '.item-info__name',
        EFFECT: '.item-info__container .item-info__aside',
        NAME: '.item-info__container .item-info__name span',
    }
}

const LINKS = {
    BP: ({name, priceIndex}) => `https://backpack.tf/stats/Unusual/${encodeURIComponent(name)}/Tradable/Craftable/${priceIndex}`
}

const style = `
.clickable-item-info {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    &:hover {
        background-color: rgba(255,255,255, .1);
        cursor: pointer
    }
}
`
GM_addStyle(style)

class Item {
    constructor(e) {
        this.e = e
    };

    get id() {
        const steamCollectorLink = this.e.querySelector('a[href^="https://steamcollector"]').href;


        const match = steamCollectorLink.match(/asset\/(\d+)/);
        console.log(steamCollectorLink)
        if (!match) return null;
        return match[1]
    }
}

class ItemsController {
    constructor() {
        this.getItemInfo();

        this.items = [];
    }
    addItem(item) {
        this.items.push(item)
    }

    getItemInfo() {
        const $itemEffectSrc= document.querySelector(SELECTORS.ITEM_INFO.EFFECT);
        const $itemName = document.querySelector(SELECTORS.ITEM_INFO.NAME);

        const style = $itemEffectSrc.style.backgroundImage;

        const name = $itemName.innerText.replace('Unusual ', '');
        const priceIndex = this.getEffect(style);

        this.itemInfo = {
            name,
            priceIndex
        }
    }

    getEffect(string) {
        console.log(string)
        const match = string.match(/effects\/webp\/([^_]+)/);
        if (!match) return null;
        return match[1];
    }
}

class ItemUI {
    constructor(item) {
        this.item = item;
        this.historyLink = this.item.e.querySelectorAll('a')[3];
    }

    updateLinks() {
        this.updateHistoryLink();
    }

    updateHistoryLink() {
        this.historyLink.innerText = `View backpack.tf history`;
        this.historyLink.href = `https://backpack.tf/item/${this.item.id}`
    }
}

class PageUI {
    constructor(itemsController) {
        this.itemsController = itemsController;
    }

    addUI() {
        this.makeItemInfoClickable()
    }

    makeItemInfoClickable() {
        const $itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
        $itemInfo.classList.add('clickable-item-info');
        const bplink = LINKS.BP(this.itemsController.itemInfo);

        $itemInfo.addEventListener('click', () => window.open(bplink, '_blank'))

    }
}

async function pageLoad() {
    return new Promise((resolve, reject) => {
        const Interval = setInterval(checker, 300);
        function checker() {
            const loadSpinner = document.querySelector(SELECTORS.LOAD_SPINNER);
            if (!!loadSpinner) return;
            clearInterval(Interval);
            console.log(`Page loaded successfully`);
            resolve()
        }
    })
}

const controller = new ItemsController();
if (!!controller.itemInfo.effect) {
    await pageLoad();
    for (const e of document.querySelectorAll(SELECTORS.ITEM_TABLE_ROW)) {
        const item = new Item(e);
        const ui = new ItemUI(item);
    
        controller.addItem(item);
        ui.updateLinks()
    }
    new PageUI(controller).addUI();
}
