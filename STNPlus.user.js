// ==UserScript==
// @name         STN+
// @version      2.4.0
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @description  Changes unusual item page UI | Changes bot page age UI
// @author       eeek
// @match        https://stntrading.eu/item/tf2/Unusual+*
// @match        https://stntrading.eu/buy/unusuals/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stntrading.eu
// @downloadURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/STNPlus.user.js
// @updateURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/STNPlus.user.js
// @connect backpack.tf
// @connect pricedb.io
// @connect autobot.tf
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_xmlhttpRequest
// @grant GM_registerMenuCommand
// @grant GM_addStyle
// ==/UserScript==

class Config {
    static cache = {
        timeToLiveInHours: 0.5 // 0.5 = 30 min and so on
    }
    static defaultKeyPrice = 1.8 //$ per key used for conversion
    static defaultGlobalKeyPriceInRef = 60 //ref per key used for conversion
    static defaultKeyPriceFetchInterval = 12 * 60 * 1000 // every 12 hours

    static defaultBuyersStabilityCount = 3; // We will consider buyers stable based on this amount of buyorders
}

class KeyPriceController {
    constructor() {
        this.keyPrice = GM_getValue('keyPrice', Config.defaultKeyPrice);
        this.globalKeyPriceInRef = GM_getValue('globalKeyPriceInRef', Config.defaultGlobalKeyPriceInRef);

        console.log(`Initialized key price @${this.keyPrice}\nIn ref: ${this.globalKeyPriceInRef}`)
        this.init();
    }

    init() {
        const lastFetched = GM_getValue('lastFetched');
        const timeNow = Math.floor(Date.now() / 1000);

        const fetchInterval = Config.defaultKeyPriceFetchInterval ;
        if (lastFetched === undefined || (lastFetched + fetchInterval <= timeNow)) {
            this.updateKeyPrice().then(newPrice => {
                if (newPrice !== undefined) {
                    this.keyPrice = newPrice;
                    GM_setValue('keyPrice', newPrice);
                }
            }).catch(error => {
                console.error('Failed to update key price:', error);
            });

            this.getKeyPriceInRef().then(newPrice => {
                if (newPrice !== undefined) {
                    this.globalKeyPriceInRef = newPrice;
                    GM_setValue('globalKeyPriceInRef', newPrice);
                }
            }).catch(error => {
                console.error('Failed to update key price in ref:', error);
            });
        }

        GM_setValue('lastFetched', timeNow);
    }

    async updateKeyPrice() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://backpack.tf/item/get_third_party_prices/Unique/Mann%20Co.%20Supply%20Crate%20Key/Tradable/Craftable`,
                responseType: 'json',

                onload: (res) => {
                    try {
                        console.log('Making an API request for key price');
                        const response = res.response;

                        if (response.message) {
                            throw new Error(response.message);
                        }

                        const keyPrice = response.prices?.mp?.lowest_price ?? null;

                        if (keyPrice === null) {
                            console.warn('Key price not found in response, using default');
                            resolve(Config.defaultKeyPrice);
                            return;
                        }

                        const numericPrice = Number(keyPrice.replace('$', ''));

                        if (isNaN(numericPrice)) {
                            console.warn('Invalid key price format, using default');
                            resolve(Config.defaultKeyPrice);
                            return;
                        }

                        resolve(numericPrice);
                    } catch (error) {
                        console.error('[ERROR] Failed to parse key price:', error);
                        resolve(Config.defaultKeyPrice);
                    }
                },

                onerror: (err) => {
                    console.error('[ERROR] Network error fetching key price:', err);
                    resolve(Config.defaultKeyPrice);
                },

                ontimeout: () => {
                    console.error('[ERROR] Request timeout fetching key price');
                    resolve(Config.defaultKeyPrice);
                }
            });
        });
    }

    getKeyPrice() {
        return this.keyPrice;
    }

    async refreshKeyPrice() {
        const newPrice = await this.updateKeyPrice();
        if (newPrice !== undefined) {
            this.keyPrice = newPrice;
            GM_setValue('keyPrice', newPrice);
            GM_setValue('lastFetched', Math.floor(Date.now() / 1000));
        }
        return newPrice;
    }

    async getKeyPriceInRef() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://pricedb.io/api/item/5021;6`,
                responseType: 'json',
                onload: (res) => {
                    try {
                        console.log('Making an API request to PriceDB for key price');
                        const response = res.response;

                        const keyPrice = response.buy.metal;

                        if (keyPrice === null) {
                            console.warn('Key price not found in response, using default');
                            resolve(Config.defaultGlobalKeyPriceInRef);
                            return;
                        }
                        resolve(keyPrice);
                    } catch (error) {
                        console.error('[ERROR] Failed to parse key price:', error);
                        resolve(Config.defaultGlobalKeyPriceInRef);
                    }
                },
                onerror: (err) => {
                    console.error('[ERROR] Network error fetching key price:', err);
                    resolve(Config.defaultGlobalKeyPriceInRef);
                },
                ontimeout: () => {
                    console.error('[ERROR] Request timeout fetching key price');
                    resolve(Config.defaultGlobalKeyPriceInRef);
                }
            });
        });
    }
}


class Listing {

    static createListing(prices, intent, stn = false) {
        const [listingContainer, priceContainer, keysContainer, refContainer] = [document.createElement('div'), document.createElement('div'),document.createElement('div'), document.createElement('div')];
        const {keys = 0, metal = 0, usd = 0} = prices;

        listingContainer.className = `listing ${intent}`;
        keysContainer.className = 'keys';
        refContainer.className = 'metal';
        keysContainer.innerText = keys + ' keys';
        refContainer.innerText = metal + ' ref';
        if ((keys === 0) && (metal === 0) && (usd === 0)) {
            keysContainer.innerText = `No ${intent === 'sell' ? 'sellers' : 'buyers'}!`;
            refContainer.innerText = '';
        } else if (usd !== 0) {
            keysContainer.innerText = `$${usd}`;
            const convertedPrice = Math.floor(usd * 1.1 / GM_getValue('keyPrice', Config.defaultKeyPrice) * 100) / 100;
            refContainer.innerText = `~${convertedPrice} keys`;
            refContainer.title =
                `Key rate: $${GM_getValue('keyPrice', Config.defaultKeyPrice)} (before fees)\n` +
                `Last updated: ${Math.floor(Date.now()/1000)}`

            keysContainer.style.color = '#55cc44'
        }
        priceContainer.append(keysContainer, refContainer);
        listingContainer.append(priceContainer);
        console.log(`Created ${intent} listing @${keys} keys, ${metal} ref`);
        if (stn) {

            listingContainer.append(Listing.createStnButton(intent, prices.available));
            if (!prices.available) {
                [keysContainer, refContainer].forEach(c => c.classList.add('unavailable'));
                listingContainer.title = `STN is not ${intent === 'sell' ? 'selling' : 'buying'} this item right now.`
            }
        }

        return listingContainer;
    }

    static _createStnAction(intent) {
        if (this.stn === false) return;

        if (intent === 'sell') {
            return queueRequest.createQuickBuyRequest( { appId: 440, ctxId: 2, fullName: itemData.itemName, amount: 1 } )
        }
        return sellToBot(defCat);
    }

    static createStnButton(intent, available = true) {
        const actionStrip = document.createElement('button');

        actionStrip.className = intent === 'sell' ? 'action buy bg-warning border-0' : 'action sell bg-success border-0';
        actionStrip.innerText = intent === 'sell' ? 'Buy' : 'Sell';
        !available && actionStrip.classList.add('unavailable');
        available && actionStrip.addEventListener('click', () => Listing._createStnAction(intent));
        return actionStrip;
    }
}

class ListingManager {
    stnPrices;
    itemName;
    stockButtons;
    pointers = []; /// we will create pointers to listing containers and append listings to them
    otherSellers = 0;
    buyOrderStability = 0;

    invalid = {invalid: false};

    constructor(cache) {
        ///we need these to use the price endpoint
        this.cache = cache;
        this.effect = document.querySelector('.card-text.m-0').innerText.match(/★ Unusual Effect: (.*)/)[1].trim(); // get the effect name from the effect name on the page
        this.itemName = itemData.itemName.replace(`Unusual ${this.effect}`, '').trim(); // yuh it be like that
        this.priceIndex = document.querySelectorAll('.col-sm-4 picture')[1].querySelector('img').getAttribute('src').match(/particles\/(.*)@4x\.png$/)[1];
        this.stockButtons = [
            ...document.querySelector('.col-lg-6.p-sm-0').querySelector('.px-3').children
        ];
        this.stnInventory = document.querySelector('.tfip-pg-bx-wrap')?.getAttribute('onclick')?? null;

        this.getStnPrices();
        this._cleanField();
        this.createListingsField() ;/// clean the field for custom
        this.renderBackpackListings();
        this._createListing(this.pointers[0], this.stnPrices, true);
    }

    createListingsField() {
        const targetElement = document.querySelector('.col-sm-8.col-md-7.col-lg-8');

        const buttonsContainer = document.createElement('div'); /// we want it to look good
        buttonsContainer.className = 'buttons-container';

        const listingsUniteContainer = document.createElement('div');
        listingsUniteContainer.className = 'unite-container';

        ////create sell buy headers because 'someone random' deadass doesnt understand what green and blue arrows in the corner of the listing mean
        const [headerSell,headerBuy] = [document.createElement('p') ,document.createElement('p')];
        headerSell.innerText = 'Sell orders';
        headerBuy.innerText = 'Buy orders';
        const uniteHeaders = document.createElement('span');
        uniteHeaders.style.display = 'inline-flex';
        uniteHeaders.className = 'orders-headers';
        headerBuy.style.marginLeft = 'auto';
        uniteHeaders.append(headerSell, headerBuy);
        ////////////////


        const bpOrdersHeader = document.createElement('p');
        bpOrdersHeader.innerText = 'Backpack.tf:';
        bpOrdersHeader.className = 'bptf-orders';

        listingsUniteContainer.append(uniteHeaders, this.createSellBuyContainer(true),bpOrdersHeader, this.createSellBuyContainer());
        console.log(this.pointers);
        targetElement.append(buttonsContainer, listingsUniteContainer);
        buttonsContainer.append(...this.buttons);
    }

    createSellBuyContainer(stn = false) {
        const [sellContainer, buyContainer] = [document.createElement('div'), document.createElement('div')]; // create containers for sell/buy orders
        sellContainer.className = `listings ${!stn ? 'listing-loading' : ''}`;
        buyContainer.className = `listings ${!stn ? 'listing-loading' : ''}`;
        const container = document.createElement('div');
        container.className = 'listings-container'
        container.append(sellContainer, buyContainer);

        this.pointers.push(container);
        return container
    }

    get buttons() { /// because they look mad ugly smh so we rework them
        const bptfButton = document.createElement('a');
        bptfButton.className = 'backpack-tf-btn btn';
        bptfButton.href = `https://backpack.tf/stats/Unusual/${this.itemName.replace(/%/, '%25')}/Tradable/Craftable/${this.priceIndex}`; // guess why 25??? because fukass encoder aint doing shit to '%'
        bptfButton.target = `blank`;

        const viewonContainer = document.createElement('div');
        const [viewOn, siteName] = [document.createElement('div'), document.createElement('div')];

        viewonContainer.append(viewOn, siteName);

        viewOn.innerText = 'View on';
        siteName.innerText = 'Backpack.tf';

        viewOn.className = 'view-on';
        siteName.className = 'site-name';

        bptfButton.append(viewonContainer);

        const botInvButton = document.createElement('button');
        botInvButton.className = 'rounded-1 stock'
        const steamIcon = document.createElement('i');
        steamIcon.className = 'fab fa-steam-symbol fontawesome-icon';
        botInvButton.setAttribute('onclick', this.stnInventory);
        botInvButton.append(steamIcon);

        Object.assign(steamIcon.style, {
            'font-size': '2em',
            color: 'white'
        })
        Object.assign(botInvButton.style, {
            'background': 'var(--bs-primary)',
            'border': 'none'
        })
        botInvButton.title = 'Bot inventory';

        if(this.stnInventory === null){
            botInvButton.classList.add('unavailable');
            botInvButton.title = 'Bot inventory is not available right now'
        }



        this.stockButtons.forEach(button => {button.innerText = ''; button.classList.add('stock', 'rounded-1'); button.classList.remove('ms-sm-3', 'rounded-0');});

        /////add stock symbols back
        this.stockButtons[0].innerHTML = `<i class = 'fa fa-heart'></i>`;
        this.stockButtons[1].innerHTML = `<i class = 'far fa-heart'></i>`;
        this.stockButtons[2].innerHTML = `<i class = 'fas fa-search-dollar'></i>`;
        ///add titles cus no text
        this.stockButtons[0].title = 'Add to wishlist';
        this.stockButtons[1].title = 'Remove from wishlist';
        this.stockButtons[2].title = 'Request repricing';

        ///make a fancy container for buttons
        const stockContainer = document.createElement('div');
        stockContainer.append(...this.stockButtons, botInvButton)
        stockContainer.className = 'stock-buttons-container';

        ///returning a nice elements array
        return [bptfButton, stockContainer]
    }

    getStnPrices() {
        const stnBuyElement = document.querySelector('.col-sm-6');
        const stnSellElement = document.querySelectorAll('.col-sm-6')[1];
        const stnBuyPrice = stnBuyElement.querySelector('b');
        const stnSellPrice = stnSellElement.querySelector('b');

        const regex = /(\d+) key(s)?(:?, (\d+|\d+\.\d+) ref)?/;
        this.stnPrices = {
            sell: {
                available: stnSellElement.querySelector('.text-success') ? 1: 0,
                keys: stnSellPrice.innerText.match(regex)[1] !== undefined? stnSellPrice.innerText.match(regex)[1]: 0,
                metal: stnSellPrice.innerText.match(regex)[4] !== undefined? stnSellPrice.innerText.match(regex)[4]: 0
            },
            buy: {
                available: stnBuyElement.querySelector('.text-success') ? 1: 0,
                keys: stnBuyPrice.innerText.match(regex)[1] !== undefined? stnBuyPrice.innerText.match(regex)[1]: 0,
                metal: stnBuyPrice.innerText.match(regex)[4] !== undefined? stnBuyPrice.innerText.match(regex)[4]: 0
            }
        }

    }

    getBackpackListings() {
        const $itemName = itemData.itemName.replace('Unusual ', '');
        return new Promise((resolve, reject) => {
            const itemInCache = this.cache.lookForName($itemName);
            if (!itemInCache.failed) {
                const header = document.querySelector('.bptf-orders');
                const timeleft = this.cache.convertTTLtoMinutes(itemInCache.timestamp);
                this.otherSellers = itemInCache.otherSellersCount;
                this.buyOrderStability = itemInCache.buyOrderStability;
                this.invalid = itemInCache.invalid;
                header.innerText = `${header.innerText} 🔄 ${timeleft} minutes`;
                header.title = `Cached data. Will expire in ${timeleft} minutes`;
                resolve(this.cache.getPriceData(itemInCache));
            } else {

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://backpack.tf/api/classifieds/listings/snapshot?sku=${encodeURIComponent($itemName)}&appid=440`,
                    responseType: 'json',

                    onload: (res) => {
                        try {
                            console.log('Making an API request for ' + $itemName)
                            if (res.response.message) {
                                throw (res.response.message);
                            }
                            const listings = res.response.listings || [];
                            const [sellListings, buyListings] = [
                                listings.filter(listing => (listing.intent === 'sell')).map(listing => listing.currencies),
                                listings.filter(listing => (listing.intent === 'buy') && !(listing.item.attributes.some(attr => +attr.defindex > 1000))).map(listing => listing.currencies),
                            ];

                            if (sellListings.length > 0) this.otherSellers = sellListings.length;
                            const finalizedData = {
                                sell: {keys: sellListings[0]?.keys?? 0, metal: sellListings[0]?.metal?? 0, usd: sellListings[0]?.usd ?? 0},
                                buy: {keys: buyListings[0]?.keys?? 0, metal: buyListings[0]?.metal?? 0}
                            };

                            const pricesInScrap = buyListings.map(price => BOCalc.toScrap(price, GM_getValue('globalKeyPriceInRef', Config.defaultKeyPriceInRef))).slice(0, Config.defaultBuyersStabilityCount);
                            const BOStability = Math.floor(BOCalc.calculateStability(pricesInScrap) * 10) / 10;
                            console.log(pricesInScrap);

                            if (buyListings.length < Config.defaultBuyersStabilityCount || BOStability < 0) {
                                this.invalid = {
                                    invalid: true,
                                    reason: BOStability < 0 ? `Invalid range. Check buyers.` : `Invalid data. There are less buyers, than ${Config.defaultBuyersStabilityCount}`
                                }
                            }

                            this.buyOrderStability = BOStability;
                            this.cache.addNewCacheElement($itemName, finalizedData, this.otherSellers, BOStability, this.invalid);

                            resolve(finalizedData);
                        } catch (msg) {
                            console.log('[ERROR] ' + msg);
                            reject();
                        }
                    },
                    onerror: (err) => reject(err),
                })
            }
        })
    }

    async renderBackpackListings() {
        try {
            const prices = await this.getBackpackListings();
            [...this.pointers[1].children].forEach(child => child.classList.remove('listing-loading'));
            this._createListing(this.pointers[1], prices);
            const dataContainer = document.createElement('div');
            dataContainer.className = 'data-container';
            this.pointers[0].parentElement.parentElement.append(dataContainer);

            dataContainer.append(this._createOtherSellersInfoElement());
            dataContainer.append(this._createBuyOrderStabilityInfoElement());
        } catch (e) {
            [...this.pointers[1].children].forEach(child => child.classList.add('listing-failed'));
            document.querySelector('.bptf-orders').innerText = 'Backpack.tf orders failed to load. Try again later';
            return
        }
    }
    _cleanField() {
        document.querySelectorAll('.row.g-0')[1].remove(); /// removing stock field with buttons etc
    }

    _createListing(pointer, {sell, buy}, stn = false) {
        console.log({sell, buy}, stn)
        pointer.children[0].append(Listing.createListing(sell, 'sell', stn))
        pointer.children[1].append(Listing.createListing(buy, 'buy', stn))
    }

    _createOtherSellersInfoElement() {
        const otherSellersContainer = document.createElement('div');
        otherSellersContainer.className = 'listings other-sellers';
        const finalSellers = this.otherSellers;

        otherSellersContainer.innerText = `${finalSellers} seller${finalSellers > 1 || finalSellers === 0 ? 's' : ''} total`;
        switch (finalSellers) {
            case 0:
            case 1: otherSellersContainer.style.color = '#9cff78'; break;
            case 2: otherSellersContainer.style.color = '#ffa04d'; break;
            default: otherSellersContainer.style.color = '#ff8080'; break;

        }
        return otherSellersContainer;
    }

    _createBuyOrderStabilityInfoElement() {
        const stabilityContainer = document.createElement('div');
        stabilityContainer.className = 'listings stability';
        if (typeof this.buyOrderStability === 'undefined') return ''; /// we skip if broken value

        stabilityContainer.innerText = `${this.buyOrderStability}%`;
        stabilityContainer.title = `Based on ${Config.defaultBuyersStabilityCount} buy orders.`


        if(this.buyOrderStability > 90) {
            stabilityContainer.style.color = '#9cff78';
            stabilityContainer.innerText += ' | Stable';
        } else if (this.buyOrderStability > 50 && this.buyOrderStability < 90) {
            stabilityContainer.style.color = '#ffa04d'
            stabilityContainer.innerText += ' | Check buyers';
        } else {
            stabilityContainer.style.color = '#ff8080'
            stabilityContainer.innerText += ' | Not stable!';
        }

        if (this.invalid.invalid === true) {
            stabilityContainer.classList.add('invalid');
            stabilityContainer.title = this.invalid.reason;
        }
        return stabilityContainer;
    }


}

// sometimes i feel like checking twice and hitting the limit again and again is quite annoying
class ListingsDataCache {
    constructor() {
        this.init()
    }
    init() {
        this.#removeOutdated();
    }
    lookForName($itemName) {
        const currentCache = GM_getValue('ListingsData', []);
        if (currentCache.length === 0) return {failed: true};
        let itemInCache = currentCache.find(({itemName}) => itemName === $itemName);
        if (!itemInCache) return {failed: true};
        return itemInCache;
    }

    getPriceData(cacheElement) {
        console.log(cacheElement)
        return {
            buy: {
                keys: cacheElement.prices.buy.keys,
                metal: cacheElement.prices.buy.metal,
            },
            sell: {
                keys: cacheElement.prices.sell.keys,
                metal: cacheElement.prices.sell.metal,
                usd: cacheElement.prices.sell.usd
            }
        }
    }

    addNewCacheElement(itemName, {sell, buy}, otherSellersCount = 0, buyOrderStability = 0, invalid = {invalid: false}) {
        const timestamp = this.#getCurrentTime();
        if (buy.keys === buy.metal === sell.keys === sell.metal) return;

        const elementToAdd = {
            itemName,
            prices: {
                sell: {keys: sell.keys, metal: sell.metal, usd: sell.usd},
                buy: {keys: buy.keys, metal: buy.metal}
            },
            timestamp,
            otherSellersCount,
            buyOrderStability,
            invalid
        }

        const currentCache = GM_getValue('ListingsData', []);
        currentCache.push(elementToAdd);

        this.#updateCache(currentCache);
    }

    convertTTLtoMinutes(timestamp) {
        const currentTime = Number(this.#getCurrentTime());
        const diff = timestamp + this.timeToLive - currentTime;
        return Math.round(diff / 60);
    }
    #updateCache(newCache) {
        GM_setValue('ListingsData', newCache)
    }



    #removeOutdated() {
        this.timeToLive = Config.cache.timeToLiveInHours * 3600;
        const currentCache = GM_getValue('ListingsData', []);
        if (currentCache.length === 0) return;

        const currentTime = this.#getCurrentTime();

        const threshold = currentTime - this.timeToLive;
        const freshDataArray = currentCache.filter(({timestamp}) => threshold < timestamp);

        this.#updateCache(freshDataArray);
    }

    #getCurrentTime() {
        return Math.floor(Date.now() / 1000);
    }

}

class BOCalc {
    static toScrap({keys = 0, metal = 0 }, globalKeyPrice = Config.defaultGlobalKeyPriceInRef,) {
        const scrapOfMetal = (metal % 1).toFixed(2) / 0.11;

        const refToScrap = (ref) => (ref - (ref % 1).toFixed(2)) * 9;

        const metalTotal = refToScrap(metal);
        const keyToScrap = keys * refToScrap(globalKeyPrice);

        return scrapOfMetal + metalTotal + keyToScrap;
    }

    static calculateStability(prices) {
        if (prices.length === 0) {
            return console.log(`0 prices provided. We're stable at 0 buyers`);
        }
        if (!Array.isArray(prices)) {
            throw new Error(`Please provide a valid price array`);
        }

        const max = Math.max(...prices);
        const min = Math.min(...prices);

        const med = prices.reduce((acc, price) => acc + price, 0) / prices.length;

        const relRange = ((max - min) / med) * 100;
        const invStability = 100 - Math.floor(relRange * 10) / 10

        return invStability;
    }
}


/////////////////CONST////////////////////////////////////////
const CONFIG = {
    SCHEMA_TIMEOUT: 30 * 1000,
}

const SELECTORS = {
    INVENTORY_BOX: '.tf2InventoryBox',
    LOADER: '.tf2InventoryBox h1',
    ITEM: '.inventoryItem'
}

const schemaURL = `https://schema.autobot.tf/schema`;


const LINKS = {
    UNU_MP: (item_defindex, priceindex) => item_defindex ? `https://marketplace.tf/items/tf2/${item_defindex};5;u${priceindex}` : null,
    UNU_BP: (itemname, priceindex) => `https://backpack.tf/stats/Unusual/${encodeURIComponent(itemname)}/Tradable/Craftable/${priceindex}`
}

//////////////////////////////////////////////////////////////
class EventBus {
    constructor() {
        this.subscribers = [];
    }

    emit(event, data) {
        for (const subscriber of this.subscribers) this.notify(event, data, subscriber);
    }

    notify(event, data, subscriber) {
        subscriber.on(event, data);
    }

    subscribe(instance) {
        if (typeof instance.on !== 'function') throw (`${instance.constructor.name} has no 'on' method...`);
        this.subscribers.push(instance);
    }
}

class Subscriber {
    on(event, data) {
        throw `[${this.constructor.name}] Method 'on' must be implemented`;
    }
}

/////////////////////////////////////////////////////////////
class Logger extends Subscriber {
    on(event, data) {
        console.log(`[LOG] ${event} | ${data}`);
    }
}

class SchemaController {
    constructor(events, schemaUrl = schemaURL) {
        this.url = schemaUrl;
        this.events = events;
        this.schema = GM_getValue('SCHEMA') || [];
        this.items = new Map();
        this.effects = new Map();
    }

    async init() {
        this.events.emit('schema_controller', 'initializing...');
        if (this.schema.length === 0) {
            this.events.emit('schema_controller', 'schema is blank...');
            try {
                this.schema = await this.fetchSchema();
                this.updateCache();
            } catch (e) {
                this.events.emit('schema_controller', 'ERROR: ' + e)
            }
        };
        this.storeData();
    }

    async fetchSchema() {
        this.events.emit('schema_controller', 'trying to fetch...')
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: this.url,
                responseType: 'json',
                timeout: CONFIG.SCHEMA_TIMEOUT,

                onload: (res) => {
                    this.events.emit('schema_controller', 'received a response...');
                    if (res.status !== 200) reject(`Status: ${res.status} | ${res.statusText}`)
                    resolve(res.response)
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(`Schema request timed out after ${CONFIG.SCHEMA_TIMEOUT / 1000} seconds. Try again later`)
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
        this.events.emit('schema_controller', `initialized ${this.items.size} items information...`);

    }

    storeEffects() {
        for (const effect of this.schema.raw.schema.attribute_controlled_attached_particles) {
            this.effects.set(effect.id, effect.name)
        }
        this.events.emit('schema_controller', `initialized ${this.effects.size} effects information...`);

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

class Item {
    constructor(e) {
        this.e = e;
        this.fromElement();
    }

    fromElement() {
        this.name = this.e.getAttribute('name');

        this.fullname = this.e.getAttribute('itemname');
        this.effect = {
            priceIndex: +this.getPriceIndex(),
            name: this.fullname
            .replace(`Unusual` , ``)
            .replace(this.name, ``)
            .trim()
        }
    }

    getPriceIndex() {
        const match = this.e.querySelector('.particle-bg').src.match(/particles\/([^@]+)/);
        if (!match) return null;
        return match[1];
    }
}

class ItemsController {
    constructor(events, schemaController) {
        this.items = [];
        this.events = events;
        this.schemaController = schemaController;
    }

    addItem(item) {
        let defindex = this.schemaController.items.get(item.name);
        if (defindex === undefined && item.name.toLowerCase().includes('taunt')) {
            const oldStyleName = this.convertToOldTauntName(item.name);
            defindex = this.schemaController.items.get(oldStyleName);
        }
        this.items.push({defindex, ...item});
    }

    convertToOldTauntName(tauntname) {
        this.events.emit('items_controller', `triggered a taunt name conversion for ${tauntname}`)
        return tauntname.replace('Taunt: ', '') + ' Taunt';
    }

}

class ItemUI {
    constructor(item) {
        this.item = item;
        this.imgElement = item.e.querySelector('.itemImg');
    }

    __() {
        const element = this.imgElement;
        const oldHTML = element.dataset.bsOriginalTitle;

        const template = document.createElement('template');
        template.innerHTML = oldHTML;

        const doc = template.content;
        const inspectBtn = doc.querySelector('a[href^="steam://"]');
        const reqRepBtn = doc.querySelector('a[href*="repricing"]');

        if (!inspectBtn || !reqRepBtn) return;

        reqRepBtn.textContent = 'Backpack';
        inspectBtn.textContent = 'Marketplace';

        const mpLink = LINKS.UNU_MP(this.item.defindex, this.item.effect.priceIndex);
        inspectBtn.href = mpLink;
        reqRepBtn.href = LINKS.UNU_BP(this.item.name, this.item.effect.priceIndex);

        inspectBtn.target = '_blank';
        reqRepBtn.target = '_blank';

        if (!mpLink) {
            inspectBtn.disabled = true;
            inspectBtn.classList.add('disabled');
            inspectBtn.title = 'This item has broken defindex';
        }

        element.dataset.bsOriginalTitle = template.innerHTML;

    }
}
/////////////////////UTILS//////////////////////////////////////////////////
async function checkForLoad() {
    return new Promise((resolve, reject) => {
        const interval = setInterval(check, 300);
        function check() {
            const isActiveLoader = document.querySelector(SELECTORS.LOADER).innerText.includes('Loading');
            if (isActiveLoader) return;
            clearInterval(interval);
            console.log('Page is ready');
            resolve();
        }
    })
}

class App {
    async init() {
        if (window.location.href.match(/buy\/unusuals\/[\d+]/)) {
            await this.initBotPage();
            return;
        }

        this.initItemPage();
    }

    initItemPage() {
        new KeyPriceController();
        const cache = new ListingsDataCache();
        new ListingManager(cache)
    }

    async initBotPage() {
        this.initLogger();
        await this.initSchema();
        this.registerForceSchemaUpdateCommand()
        await checkForLoad();
        this.initItems();
    }

    initLogger() {
        this.events = new EventBus();
        const logger = new Logger(this.events);
        this.events.subscribe(logger);
    }

    async initSchema() {
        this.schemaController = new SchemaController(this.events);
        await this.schemaController.init()
    }

    initItems() {
        const itemsController = new ItemsController(this.events, this.schemaController);
        const itemsCollection = document.querySelectorAll('.inventoryItem');
        this.events.emit('initialization', `Found ${itemsCollection.length || 0} items on the page`);
        for (const i of itemsCollection) {
            const item = new Item(i);
            itemsController.addItem(item);
        }

        for (const i of itemsController.items) {
            new ItemUI(i).__();
        }

    }

    registerForceSchemaUpdateCommand() {
        const updateSchema = async () => {
            try {
                await this.schemaController.forceSchemaUpdate();
                alert('Schema was updated successfully!');
                window.location.reload();
            } catch (e) {
                this.events.emit('schema_updater', 'FAILED TO UPDATE SCHEMA: ' + e);
                alert(`Failed to update schema. More info in console.`)
            }
        };

        GM_registerMenuCommand('Update game schema via autobot', updateSchema);
    }

}
let app = new App();
await app.init();


GM_addStyle(`
    .buttons-container {
        width: 50%;
        min-width: 360px;
        height: 80px;
        display: flex;
        align-items: center
    }
    .bptf-orders{
        width:max-content
    }
    .unite-container {
        margin-top: 1em;
        width: 50%;
        height: calc(225px + 1em);
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: #a7a7a7
    }

    .orders-headers {
        border-bottom: 1px solid #333;
        min-width: 360px;
    }
    .listings-container {
        width: 100%;
        height: 100%;
        min-width: 360px;
        display: flex;
        gap: 5px;
        margin-bottom: 1em
    }

    .listings {
    opacity: 1;
        display: flex;
        position: relative;
        flex-direction: column;
        height: 70px;
        width: 100%;
        gap: 5px;
        border-radius: 5px;
        padding: 3px 12px;
        background: linear-gradient(45deg, #333, #3f3d3d);
        box-shadow: -3px 3px 3px rgba(0,0,0,.35);
        transition: height 1s ease, opacity 0.9s ease;
    }

    .other-sellers, .stability {
        height: 2em;
          width: calc(25% - 5px);
          text-align: center;
          color: #bbb;
          font-weight: 600;
          margin-top: -10px;
          min-width: 180px
    }

    .keys {
        font-size: 1.5em;
        font-weight: 600;
        color: #ffedc1;
    }

    .metal {
        color: lightgray;
        font-weight: 600;
    }

    .backpack-tf-btn {
    height: 50px;
    text-align: start;
      background-color: #373737;
      border-color: #494949;
      border-radius: 4px;
      border-style: solid;
      border-width: 1px;
      display: -webkit-inline-box;
      display: -ms-inline-flexbox;
      display: inline-flex;
      padding: 6px 9px;
      &:hover {
          background-color: #777;
      }
    }
    .view-on-container {
      margin-top: 4px;
      padding-left: 8px;
    }
    .view-on {
      color: #93d2ff;
      font-size: 12px;
      line-height: 1em;
    }
    .site-name {
      color: #eaeaea;
      font-size: 20px;
      line-height: 1em;
    }

    .stock {
        height: 50px;
        width: 50px;
        line-height: 1em
    }

    .stock-buttons-container {
        display: flex;
        gap: 5px;
        margin-left: auto;
    }
    .fas.fa-search-dollar {
    padding-top: 50%
    }

    .unite-container p {
        font-size: 16px;
        line-height: 1em;
        margin-bottom: 0.5em
    }

    .listing-loading {
        background: linear-gradient(90deg, #333 30%, #3f3f3f 50%, #333 70%);
          background-size: 200%;
          animation: loadingListing 3s ease-in-out infinite;
    }
    .listings.listing-failed {
        height: 0;
        opacity: 0
    }
    .action {
      height: 100%;
      position: absolute;
      left: calc(100% - 50px);
      width: 40px;
      top: 0;
      border-width: 0 2px;
      border-color: black;
      writing-mode: sideways-rl;
      font-weight: 600;
      font-size: 20px;

    }
 .unavailable {
     filter: grayscale(1) brightness(0.7);
 }
    @keyframes loadingListing {
        from {
            background-position: 200%;
        }

        to {
            background-position: 0%;
        }
    }
    .stock:not(.unavailable):has(.fa-steam-symbol):hover {
        filter: brightness(0.9)
    }

    .data-container {
        display: flex;
        gap: 1%
    }

    .invalid {
        filter: grayscale(1) brightness(0.8)
    }
    `)
