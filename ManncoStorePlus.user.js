// ==UserScript==
// @name         ManncoStore+
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      2.1.2
// @description  Adds backpack.tf stat page button for unusuals 
// @author       eeek
// @match       https://mannco.store/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mannco.store
// @downloadURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ManncoStorePlus.user.js
// @updateURL  https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ManncoStorePlus.user.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==
//test

const SELECTORS = {
    LOAD_SPINNER: '#transacContent .spinner-border',
    ITEM_TABLE_ROW: '.itemListPagination',
    ITEM_INFO: {
        SELF: '.card__title.item-details__title.mb-0',
        EFFECT: '.item-details__title .item-details__title-effect',
        NAME: '.item-details__title-effect',
    },
    ITEM_BUTTONS: {
        STEAM: '.item-listing__actions .btn.btn--secondary.btn--sm.item-listing__action'
    }
}


const schemaURL = `https://schema.autobot.tf/schema`;

const LINKS = {
    BP: ({name, priceIndex}) => `https://backpack.tf/stats/Unusual/${encodeURIComponent(name)}/Tradable/Craftable/${priceIndex}`
}

const style = `
${SELECTORS.ITEM_INFO.SELF} {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    &:hover {
        background-color: rgba(255,255,255, .1);
        cursor: pointer
    }
}
`
GM_addStyle(style)


class AliasController {
    constructor() {
        const savedAliases = GM_getValue('aliases', []);
        this.aliases = new Map(savedAliases);
        this.itemManager = null;

        GM_registerMenuCommand(
            'Register proper name for this item',
            () => this.promptAliasAdd()
        );
    }

    setItemManager(itemManager) {
        this.itemManager = itemManager;
    }

    promptAliasAdd() {
        const key = this.itemManager?.itemInfo?.name ?? false;
        if (!key) return;

        const alias = prompt("Register proper form for '" + key + "'. Make sure it's in backpack.tf format, it will be used in the links");

        if (!alias || alias.trim() === '') return;

        this.aliases.set(key, alias);
        alert('Changed the proper form to ' + alias);
        console.log(`Added [${alias}] alias to ${key} successfully`);
        this._applyChanges();
    }

    _applyChanges() {
        this._updateCache();
        this._reloadPage()
    }
    _updateCache() {
        GM_setValue('aliases', [...this.aliases.entries()]);
    }

    _reloadPage() { //i hate dynamic pages
        window.location.reload()
    }
}



class Item {
    constructor(e) {
        this.e = e
    };

    get id() {
        const steamCollectorLink = this.e.querySelector('a[href^="https://steamcollector"]').href;


        const match = steamCollectorLink.match(/asset\/(\d+)/);
        if (!match) return null;
        return match[1]
    }
}


class SchemaManager {
    constructor(schemaUrl = schemaURL) {
        this.url = schemaUrl;
        this.schema = GM_getValue('SCHEMA') || [];
        this.items = new Map();
        this.effects = new Map();
    }

    async init() {
        if (this.schema.length === 0) {
            try {
                this.schema = await this.fetchSchema();
                this.updateCache();
            } catch (e) {
                console.log('Error initializing schema: ', e)
            }
        };
        this.storeData();
    }

    async fetchSchema() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: this.url,
                responseType: 'json',
                timeout: 30 * 1000,

                onload: (res) => {
                    if (res.status !== 200) reject(`Status: ${res.status} | ${res.statusText}`)
                    resolve(res.response)
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(`Schema request timed out after 30 seconds. Try again later`)
            })
        })
    }

    storeData() {
        this.storeItems();
        this.storeEffects();
    }

    storeItems() {
        const items = this.schema.raw.schema.items;
        for (const id in items) {
            this.items.set(items[id].item_name, items[id].defindex);
        }
    }

    storeEffects() {
        for (const effect of this.schema.raw.schema.attribute_controlled_attached_particles) {
            !effect.name.includes('_') && this.effects.set(effect.name, effect.id);
        }
    }

    updateCache() {
        GM_setValue('SCHEMA', this.schema);
    }

    async forceSchemaUpdate() {
        try {
            this.schema = await this.fetchSchema();
            this.storeData();
            this.updateCache();
        } catch (e){
            throw e
        }
    }
}
class ItemsController {
    constructor(schemaManager = null, aliasController = null) {
        this.schemaManager = schemaManager;
        this.aliasController = aliasController;
        this.getItemInfo();
        this.items = [];
    }
    addItem(item) {
        this.items.push(item)
    }

    getItemInfo() {
        const fullItem = document.querySelector(SELECTORS.ITEM_INFO.SELF).innerText.split('\n');
        const effectName = fullItem[0]?.replace('★ ', '')?? '';
        const rawName = fullItem[1]?.replace('Unusual ', '') ?? '';
        const aliasValue = this.aliasController?.aliases.get(rawName) ?? null;

        let name = rawName;
        aliasValue ? name = aliasValue : name;
        console.log(rawName, name, aliasValue)
        const priceIndex = this.getEffect(effectName);


        this.itemInfo = {
            name,
            priceIndex,
        }

        console.log(this.itemInfo)
    }

    getEffect(effectName){
        return this.schemaManager.effects.get(effectName)
    }
}

// class ItemUI {
//     constructor(item) {
//         this.item = item;
//         this.historyLink = this.item.e.querySelectorAll('a')[3];
//     }

//     updateLinks() {
//         this.updateHistoryLink();
//     }

//     updateHistoryLink() {
//         this.historyLink.innerText = `View backpack.tf history`;
//         this.historyLink.href = `https://backpack.tf/item/${this.item.id}`
//     }
// }


class PageUI {
    constructor(itemsController) {
        this.itemsController = itemsController;
        this._isProcessing = false;
    }

    create() {
        if (this._isProcessing) return;
        if (!this.itemsController?.itemInfo) return;


        const $itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
        if (!$itemInfo) return;
        if ($itemInfo.tagName === 'A' && $itemInfo.dataset.tfPlusClickable === '1') {
            return;
        }

        this._isProcessing = true;
        try {
            this.makeItemInfoClickable();
            this.addHistoryButtonsForIndividualItems();
        } finally {
            this._isProcessing = false;
        }
    }

    makeItemInfoClickable() {
        let $itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
        if (!$itemInfo) return;

        const bplink = LINKS.BP(this.itemsController.itemInfo);
        console.log("BP link:", bplink);

        if ($itemInfo.dataset.tfPlusClickable === "1" && $itemInfo.tagName === 'A') {
            $itemInfo.href = bplink;
            $itemInfo.target = "_blank";
            return;
        }


        $itemInfo = changeTag($itemInfo, 'a');
        $itemInfo.dataset.tfPlusClickable = "1";
        $itemInfo.style.cursor = "pointer";
        $itemInfo.style.textDecoration = "none";
        $itemInfo.href = bplink;
        $itemInfo.target = "_blank";
    }

    addHistoryButtonsForIndividualItems() {
        const $steamButtons = [
            ...document.querySelectorAll(SELECTORS.ITEM_BUTTONS.STEAM),
        ].filter(($e) => $e.innerText.includes("View on Steam"));

        const ids = $steamButtons.map(($e) => $e.href.split("_").at(-1));
        console.log("Steam IDs:", ids);

        $steamButtons.forEach(($e, i) => {
            const nextEl = $e.nextElementSibling;

            if (nextEl && nextEl.classList.contains("eeekwashere")) {
                return;
            }

            const $b = document.createElement("a");
            $b.className =
                "btn btn--secondary btn--sm item-listing__action eeekwashere";
            $b.href = `https://backpack.tf/item/${ids[i]}`;
            $b.target = `_blank`;

            const calendar = `<?xml version="1.0" encoding="utf-8"?>
                <svg viewBox="0 0 24 24" fill="transparent" xmlns="http://www.w3.org/2000/svg" width="16px">
                <path d="M3 9H21M7 3V5M17 3V5M6 12H8M11 12H13M16 12H18M6 15H8M11 15H13M16 15H18M6 18H8M11 18H13M16 18H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>`;

            $b.innerHTML = calendar;

            const $span = document.createElement("span");
            $span.innerText = "View item history";
            $b.append($span);

            $e.after($b);
        });
    }
}

let lastPath = "";

function initItemPage(schemaManager, aliasController) {
    const itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
    if (!itemInfo) return;
    const controller = new ItemsController(schemaManager, aliasController);
    // aliasController.setItemManager(controller);

    const pageUI = new PageUI(controller);

    pageUI.create();

    if (!document.querySelector(".eeekwashere")) {
        console.log("[PageUI] Buttons missing, re-adding...");
        pageUI.addHistoryButtonsForIndividualItems();
    }
}

function setupPageObserver(schemaManager, aliasController = null) {
    let scheduled = false;
    let isInternalChange = false;
    const observer = new MutationObserver((mutations) => {

        if (isInternalChange) return;

        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;

            if (lastPath !== location.pathname) {
                lastPath = location.pathname;
                console.log("[PageUI] Path changed:", lastPath);
                isInternalChange = true;
                initItemPage(schemaManager, aliasController);
                isInternalChange = false;
                return;
            }

            const itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
            const hasButtons = document.querySelector(".eeekwashere");

            const needsInit =
                (itemInfo && !hasButtons) ||
                (itemInfo && !itemInfo.dataset.tfPlusClickable);

            if (needsInit) {
                console.log("[PageUI] Re-initializing...");
                isInternalChange = true;
                initItemPage(schemaManager, aliasController);
                isInternalChange = false;
            }
        });
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: false,  // ← НЕ следим за атрибутами
    });

    isInternalChange = true;
    initItemPage(schemaManager, aliasController);
    isInternalChange = false;
}

const schemaManager = new SchemaManager();
await schemaManager.init();



// const aliasController = new AliasController();
// console.log(aliasController);

setupPageObserver(schemaManager, null);


// Source - https://stackoverflow.com/a/65090521
// Posted by dreamLo, modified by community. See post 'Timeline' for change history
// Retrieved 2026-10-20, License - CC BY-SA 4.0

function changeTag(node, tag) {
    if (node.tagName.toLowerCase() === tag.toLowerCase()) {
        return node;
    }

    const clone = document.createElement(tag);
    for (const attr of node.attributes) {
        clone.setAttributeNS(null, attr.name, attr.value);
    }
    while (node.firstChild) {
        clone.appendChild(node.firstChild);
    }
    node.replaceWith(clone);
    return clone;
}
