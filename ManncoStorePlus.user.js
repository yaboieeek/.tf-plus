// ==UserScript==
// @name         ManncoStore+
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      2.1.0
// @description  Adds backpack.tf stat page button for unusuals | Replaces sc links with bptf history
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
        SELF: '.item-details__title.card-title',
        EFFECT: '.item-details__title .item-details__title-effect',
        NAME: '.item-details__title-effect',
    }
}


const schemaURL = `https://schema.autobot.tf/schema`;

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


class AliasController {
    constructor() {
        // FIX 1: Parse the retrieved entries properly, or default to an empty array
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
        const aliasValue = this.aliasController.aliases.get(rawName);

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
    }

    create() {
        if (this.itemsController?.itemsInfo ?? false ) return;
        this.makeItemInfoClickable()
    }

    makeItemInfoClickable() {

        const $itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);
        $itemInfo.classList.add('clickable-item-info');

        const bplink = LINKS.BP(this.itemsController.itemInfo);
        console.log(bplink);
        $itemInfo.addEventListener('click', () => window.open(bplink, '_blank'))

    }
}

let lastPath = "";

function initItemPage(schemaManager, aliasController) {
    const itemInfo = document.querySelector(SELECTORS.ITEM_INFO.SELF);

    if (!itemInfo) return;

    if (lastPath === location.pathname) return;

    lastPath = location.pathname;

    if (itemInfo.dataset.tfPlusInitialized) return;

    itemInfo.dataset.tfPlusInitialized = "1";


    const controller = new ItemsController(schemaManager, aliasController);
    aliasController.setItemManager(controller)
    new PageUI(controller).create();
}

function setupPageObserver(schemaManager, aliasController) {
    const observer = new MutationObserver(() => {
        initItemPage(schemaManager, aliasController);
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true
    });

    initItemPage(schemaManager, aliasController);
}

const schemaManager = new SchemaManager();
await schemaManager.init();
const aliasController = new AliasController();
console.log(aliasController);
setupPageObserver(schemaManager, aliasController);
