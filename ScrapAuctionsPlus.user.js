// ==UserScript==
// @name         ScrapAuctions+
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      2.0.3-b1
// @description  Block feature | Links in the tooltip | Currency adder for aucitons
// @author       eeek
// @match        https://scrap.tf/auctions*
// @updateURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ScrapAuctionsPlus.user.js
// @downloadURL https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ScrapAuctionsPlus.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=scrap.tf
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

/* GM_setValue('AVAILABLE_LINKS', null) */
///////////////////////CONST///////////////////////////////////
const SELECTORS = {
    AUCTION: '.panel-auction',
    AUCTION_NAME: '.raffle-name',
    MINIMAL_BID: '.bid-big',
    TIME_LEFT: '.raffle-time-left',
    USER: '.auction-user',
    USER_NAME: '.username',
    ITEM: '.item',

    HEADER_PANEL: '.new-raffle',
    BLOCKLIST_PANEL: '.panel-title',

    TARGET_HEADER: '.inv-switcher',
    TARGET_INDICATOR: '#user-bp-440'
}

const QUALITIES = {
    '1': 'Genuine',
    '3':'Vintage',
    '5':'Unusual',
    '6':'Unique',
    '9':'Self-Made',
    '11':'Strange',
    '13': 'Collector\'s',
    '15': 'Decorated Weapon'
}

const KILLSTREAKS = {
    '1': 'Killstreak ',
    '2': 'Specialized Killstreak ',
    '3': 'Professional Killstreak ',
}
const QUALITY_WEIGHT = {
    CRAFT: 1,
    SKIN: 2,
    GENUINE: 2,
    VINTAGE: 2,
    STRANGE: 3,
    COLLECTOR: 999,
    UNUSUAL: 999
}

const SCRAP_LINK = {
    PROFILE_PREFIX: '/profile/'
}


const AVAILABLE_LINKS = GM_getValue('AVAILABLE_LINKS') || [
    {
        name: 'marketplace',
        status: true
    },
    {
        name: 'backpack stats',
        status: true
    },
    {
        name: 'mannco',
        status: true
    },
    {
        name: 'history',
        status: true
    },
    {
        name: 'steamcommunity',
        status: true
    },
];

const EXTERNAL_LINKS = {
    mp: 'marketplace',
    bp: 'backpack stats',
    history: 'history',
    mannco: 'mannco',
    scm: 'steamcommunity'
}

const defStyle = document.querySelector('.form-control').style.border;

const index = {
    key: '5021',
    scrap: '5000',
    rec: '5001',
    ref: '5002',
}

const MIN_COLOR = 100; //min value of a color that will be used for creating a profile picture background (over the middle since we need it bright)

const EMOJI_LIST = [..."😀😃😄😁😆😅🤣😂🙂🙃🫠😉😊😇🥰😍🤩😘😗☺️😚😙🥲😋😛😜🤪😝🤑🤗🤭🫢🫣🤫🤔🫡🤐🤨😐😑😶🫥😶‍🌫️😏😒🙄😬😮‍🤥🙂‍🙂‍😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵😵‍💫🤯🤠🥳🥸😎🤓🧐😕🫤😟🙁☹️😮😯😲😳🥺🥹😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾🙈🙉🙊"];

const DEBUG = {
    MODAL: {
        AUTO_OPEN: false
    },
    ITEMS: {
        UNUSUAL_ONLY: false
    }
}

//////////////////////STYLES///////////////////////////////////
const styles = `
    .block-ui-btn {
        margin-right: 0.5rem;
    }

    .user-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: center;
        height: 4rem;
        width: 4rem;
        border-radius: 50%;
        line-height: 1
    }

    .user-panel {
        display: flex;
        width: 100%;
        flex-direction: row;
        margin-bottom: 1rem;
        border-bottom: 1px solid #888
    }

    .user-data-container {
        display: flex;
        padding: 10px 20px;
        width: 100%;
        align-content: center;
    }

    .user-side-container {
        display: flex;
        justify-content: space-between;
        width: 50%;
        align-content: center;
        margin-left: 5rem;
    }

    .user-interractions-container {
        font-size: 16px;
        padding: 0;
        margin: 0;
    }

    .blocked-auction {
        display: none
    }

    .block-button {
        padding: 3px 6px;
        margin-left: 1rem;
        border: 1px solid #444;
        color: #444;
        background: transparent;
        &:hover {
            color:  var(--color-red);
            border-color:  var(--color-red)
        }
    }
    .keys-input {
        font-weight: bold;
        color: gold;
        min-width: 5rem;
    }

    .ref-input {
        font-weight: bold;
        color: silver;
        min-width: 5rem
    }
`
GM_addStyle(styles);
//////////////////////TYPES////////////////////////////////////
class Subscriber {
    constructor() {};
    on(event, data) {
        throw new Error(`[${this.constructor.name}] Method on() must be implemented`);
    }
}

class FromElement {
    constructor(e) {
        this.element = e;
    }

    fromElement() {
        throw new Error(`[${this.constructor.name}] Method fromElement() must be implemented`);
    }
}
//////////////////////////////////////////////////////////////////

////////////////////////////CLASSES///////////////////////////////
class EventBus {
    constructor() {
        this.subscribers = [];
    }

    emit(event, data) {
        this.notifySubscribers(event, data);
    }

    notifySubscribers(event, data) {
        this.subscribers.forEach(subscriber => {
            try {
                if (subscriber && typeof subscriber.on === 'function') {
                    subscriber.on(event, data);
                }
            } catch (error) {
                console.error(`Error in subscriber [${subscriber.constructor.name}]:`, error);
            }
        });
    }

    subscribe(subscriberInstance) {
        this.subscribers.push(subscriberInstance);
    }
}

/////////////////////////////////////////////////////////////////////////


/////////////////////AUCTION PAGE CLASSES///////////////////////////////

class Logger extends Subscriber {
    constructor() {
        super();
        console.log(`Logger created.`)
    }

    on(event, data) {
        console.log(`[Logger][${event}]`, data);
    }
}

class Item extends FromElement {
    constructor(element) {
        super(element);
        this.fromElement()
    };

    fromElement() {
        const {name, quality} = this.getNameAndQuality();
        this.name = name;
        this.quality = quality;
        this.defindex = this.element.dataset.defindex;
        this.id = this.element.dataset.id;
        this.craftable = ![...this.element.classList].some(c => c.startsWith('uncraft'));

        this.clearNameFromQuality();

        if (this.quality === 5){
            const match = this.element.dataset.content.match(/Effect: ([^<]+)/);
            if (match) this.effectName = match[1];
            this.priceIndex = this.extractPriceIndex(this.element.style.backgroundImage);
        }

        if (this.isSkin()) this.getSkinData();

        if (!this.isKillstreak()) return;

        this.killstreakTier = [...this.element.classList].find(c => c.startsWith('killstreak')).replace('killstreak', '');

    }

    getSkinData() {
        const {paintKit, wear} = this.extractPaintKitAndWear(this.element.style.backgroundImage);
        this.paintKit = paintKit;
        this.wear = wear;
    }

    getNameAndQuality() {
        if (!this.element.dataset.title.includes('<')) {
            return {
                name: this.element.dataset.title,
                quality: Number([...this.element.classList].find(c => c.startsWith('quality')).replace('quality', ''))
            }
        }

        const regex = /<span class='quality(\d+)'>([^<]+)<\/span>/;
        const match = this.element.dataset.title.match(regex);
        if (!match) {
            return {
                name: null,
                quality: Number([...this.element.classList].find(c => c.startsWith('quality')).replace('quality', '')),
            }
        }
        return {
            name: match[2],
            quality: Number(match[1])
        }
    }

    extractPaintKitAndWear(imageSrc) {
        const match = imageSrc.match(/_(\d+)_(\d+)/);
        if (!match) {
            return {
                paintKit: null,
                wear: null
            }
        }
        return {
            paintKit: match[1],
            wear: match[2]
        }
    }

    extractPriceIndex(imageSrc) {
        const match = imageSrc.match(/(\d+)_380x380/);
        if (!match) {
            return null;
        }
        return match[1]
    }

    isSkin() {
        return this.element.style.backgroundImage.includes('warpaint');
    }

    isKillstreak() {
        return [...this.element.classList].some(c => c.startsWith('killstreak'));
    }

    clearNameFromQuality() {
        if (this.name === 'Unusualifier') return;
        Object.values(QUALITIES).forEach(q => {this.name = this.name.replace(q, '').trim()});
        this.name = this.name.replace('★ ', '').replace(/\s{2,}/, '').trim();
    }
}

class User extends FromElement {
    constructor(element) {
        super(element);
        this.fromElement();
    };

    fromElement() {
        if (this.element === null) {
            return {
                name: null,
                id: null
            }
        }
        this.name = this.element.querySelector(SELECTORS.USER_NAME).innerText || null;
        this.id = this.element.querySelector(SELECTORS.USER_NAME).getAttribute('href').replace('/profile/', '') || null;

        this.emoji = Utils.randomEmoji; //This is an improvized profile picture for the blocklist
        this.color = Utils.randomColor;
    }
}

class Auction extends FromElement {
    constructor(element) {
        super(element);
        this.hidden = false;
        this.fromElement();
    };

    fromElement() {
        this.name = this.element.querySelector(SELECTORS.AUCTION_NAME).innerText || 'Unnamed auction';
        this.minimumBid = this.element.querySelector(SELECTORS.MINIMAL_BID).innerText || 'No min';
        this.expiresAfter = this.element.querySelector(SELECTORS.TIME_LEFT).dataset.time;
        this.user = new User(this.element.querySelector(SELECTORS.USER));

        this.items = [...this.element.querySelectorAll(SELECTORS.ITEM)].map(e => new Item(e));
    }
}

class AuctionsController {
    constructor(globalEvents) {
        this.auctions = [];
        this.events = globalEvents;
    }

    getAuctions() {
        const auctions = [...document.querySelectorAll(SELECTORS.AUCTION)];
        auctions.forEach(e => {
            //there's no way an average person is looking here. if you're reviewing the code, ffs, just give me the job I'll learn the rest later
            const a = new Auction(e);
            this.auctions.push(a);
        })
        this.events.emit('log', `Added ${auctions.length} auctions to controller`);
    }
}

class AuctionsUIController extends Subscriber {
    constructor(globalEvents, auctionsController) {
        super();
        this.auctionsController = auctionsController;
        this.events = globalEvents;
    }

    on(event, data) {
        switch (event) {
            case 'user_blocked': this.handleUserBlocked(data); break;
            case 'user_unblocked': this.handleUserUnblocked(data); break;
            case 'blocklist_initialized': this.events.emit('log', 'BlockList received!'); this.initialHide(data); break;
        }
    }

    updateAuctionsList(user) {
        this.events.emit('log', `Auctions list updated.`);
    };

    handleUserBlocked(user) {
        this.events.emit('log', `Hiding user #${user.id} auctions....`)
        this.auctionsController.auctions
            .filter(a => a.user.id === user.id)
            .filter(a => !a.hidden)
            .forEach(a => {
            a.element.classList.add('blocked-auction');
            a.hidden = true;
        });
        Utils.changeHiddenCounter(this.auctionsController.auctions.filter(a => a.hidden).length)
    };

    handleUserUnblocked(user) {
        this.events.emit('log', `Revealing user #${user.id} auctions....`)
        this.auctionsController.auctions
            .filter(a => a.user.id === user.id)
            .forEach(a => {
            a.element.classList.remove('blocked-auction');
            a.hidden = false;
        });
        Utils.changeHiddenCounter(this.auctionsController.auctions.filter(a => a.hidden).length)
    }

    initialHide(data) {
        for (const user of data.blocklist) {
            this.handleUserBlocked(user);
        }
    }
}

class BlocklistController extends Subscriber {
    constructor(globalEvents) {
        super();
        this.blocklist = GM_getValue('blocklist') || [];
        this.events = globalEvents;
        this.events.emit('blocklist_initialized', {blocklist: this.blocklist});
    }

    on(event, data) {
        switch (event) {
            case 'user_blocked':
                this.addUser(data);
                break;
            case 'user_unblocked':
                this.removeUser(data);
                break;
        }
    }


    addUser(user) {
        this.events.emit('log', `Adding user ${user.id} to the blocklist...`)
        this.blocklist.push(Utils.omitProp(user));
        this.events.emit('log', user)
        this.updateCache();
    }

    removeUser(user) {
        this.events.emit('log', `Removing user ${user.id} from the blocklist...`)
        this.blocklist = this.blocklist.filter(u => u.id !== user.id);
        this.events.emit('log', user)
        this.updateCache();
    }

    updateCache() {
        this.events.emit('log', `Updating blocked users cache...`)
        GM_setValue('blocklist', this.blocklist)
    }
}

class BlockListUI extends Subscriber {
    constructor(globalEvents, blocklistController) {
        super();
        this.blocklistController = blocklistController;
        this.events = globalEvents;
        this.modal = null;
    }

    initModal() {
        const $header = document.createElement('h3');
        const $modalRevealButton = document.createElement('button');
        const $modal = document.createElement('div');
        $modalRevealButton.innerText = 'Blocklist';
        $modalRevealButton.className = 'btn btn-danger block-ui-btn';
        document.querySelector(SELECTORS.HEADER_PANEL).prepend($modalRevealButton);

        document.querySelector(SELECTORS.BLOCKLIST_PANEL).after($modal);
        $modal.before($header);
        $modal.className = 'hidden';
        $header.className = 'hidden';

        $header.style = 'padding: 1.5rem 0; border-bottom: 1px solid #777';

        this.modal = $modal;
        $header.innerText = 'Blocked users';

        $modalRevealButton.addEventListener('click', () => {
            $modal.classList.toggle('hidden');
            $header.classList.toggle('hidden')
        });
        for (const user of this.blocklistController.blocklist) {
            const userUI = this.makeUserUI(user);
            this.modal.prepend(userUI)
        };
        if (this.blocklistController.blocklist.length === 0) {
            this.modal.prepend(this.createNoUserElement())
        }

        DEBUG.MODAL.AUTO_OPEN && $modalRevealButton.click();
    }

    on(event, data) {
        switch(event) {
            case 'user_blocked': this.handleUserBlocked(data);break;
            case 'user_unblocked': this.handleUserUnblocked(data);break;
        }
    }

    handleUserBlocked(data) {
        if (this.blocklistController.blocklist.length === 1) {
            document.querySelector('.nouser-alert')?.remove();
        }
        this.addUserToUI(data);
    }

    makeUserUI(user){
        const container = document.createElement('div');
        const $userDataContainer = document.createElement('user-data-container');
        const $username = document.createElement('p');
        const $userlink = document.createElement('a');
        const $usercontainer = document.createElement('div');
        const $unblockButton = document.createElement('button');
        const $avatarContainer = document.createElement('div');
        const $userEmoji = document.createElement('p');
        const $sideContainer = document.createElement('div');

        container.setAttribute('data-userid', user.id);

        $username.innerText = user.name;
        $userlink.innerText = 'View profile';
        $unblockButton.innerText = 'Unblock';

        $userEmoji.innerText = user.emoji;
        $userlink.href = SCRAP_LINK.PROFILE_PREFIX + user.id;
        $userlink.target = '_blank';

        container.className = 'user-panel';
        $avatarContainer.className = 'user-avatar';
        $sideContainer.className = 'user-side-container';
        $unblockButton.className = 'btn btn-info';

        $avatarContainer.style.backgroundColor = user.color;
        $username.style.margin = '0 0 1rem 0';

        $userEmoji.style = `margin: 0; align-self: center`;
        $unblockButton.style = `font-size: 20px;margin: 0;height: min-content; align-self: center; padding: 5px 10px`
        $usercontainer.style = `font-size: 16px; padding: 0; margin: 0 0 1rem 0`;

        $avatarContainer.append($userEmoji);
        container.append($avatarContainer, $sideContainer);
        $usercontainer.append($username, $userlink);
        $sideContainer.append($usercontainer, $unblockButton);

        $unblockButton.addEventListener('click', () => this.handleUIUnblock(user));

        return container;
    }

    addUserToUI(user) {
        const isExisting = !!this.modal.querySelector(`[data-userid="${user.id}"]`);
        if (isExisting) return;
        const $userUI = this.makeUserUI(user);
        this.modal.prepend($userUI);
    }

    handleUIUnblock(user) {
        const isConfirmed = confirm(`Unblock ${user.name}?`);
        if (!isConfirmed) return;
        this.events.emit('user_unblocked', user);
        this.modal.querySelector(`[data-userid="${user.id}"]`)?.remove();
        if (this.blocklistController.blocklist.length === 0) {
            this.modal.append(this.createNoUserElement())
        }
    }

    handleUserUnblocked(user) {
        this.modal.querySelector(`[data-userid="${user.id}"]`)?.remove();
    }

    createNoUserElement() {
        const container = document.createElement('div');
        container.innerText = `You don't have any users blocked`;
        container.className = 'nouser-alert';
        return container
    }

}

class ItemsUIController {
    constructor(globalEvents) {
        this.events = globalEvents;
        this.items = [];
        this.availableLinks = GM_getValue('AVAILABLE_LINKS') || AVAILABLE_LINKS;
    }

    addItem(item) {
        this.items.push(item);
    }

    changeTooltipLinks(newModesArray) {
        this.items.forEach(changeTooltip)

        function changeTooltip(itemUI) {
            itemUI.addButtons(newModesArray);
        }
    }

    addSelectionUI() {
        const button = document.createElement('button');
        const container = document.createElement('div');
        button.style = 'margin-left: 0.5rem'
        container.style = 'height: max-content; width: max-content; position: absolute; z-index: 999; border: 3px solid rgb(80, 80, 80); border-radius: 0.5rem; padding: 1rem 1rem 2rem 2rem;display: flex;flex-direction: column;gap: 0.5rem; background: #333;margin-top: 1rem; transform: translateX(50%)';
        container.classList.add('hidden');
        button.className = 'btn btn-info';
        button.innerText = 'Tooltip settings';
        for (const pl of this.availableLinks) {
            const $panel = this.constructLinkPanel(pl);
            container.append($panel)
        }

        document.querySelector(SELECTORS.HEADER_PANEL).append(button, container);
        button.addEventListener('click', () => container.classList.toggle('hidden'));

    }

    updateAvailableLinksCache() {
        console.log('Updating cache...');
        console.log(this.availableLinks)
        GM_setValue('AVAILABLE_LINKS', this.availableLinks);
    }

    handleChangedModes() {
        this.changeTooltipLinks(this.availableLinks);
        this.updateAvailableLinksCache();
    }

    updateLinkState(linkName) {
        const indexToChange = this.availableLinks.findIndex(({name}) => name === linkName);
        if (indexToChange === -1) return;
        this.availableLinks[indexToChange].status = !this.availableLinks[indexToChange].status;
    }

    constructLinkPanel(possibleLink) {
        const {name, status} = possibleLink;
        const container = document.createElement('div');
        const $input = document.createElement('input');
        const $label = document.createElement('label');
        const defaultLabel = (name) => `Enable ${name} links`;

        container.style = 'width: 100%; height: 2rem; line-height: 1';


        $input.id = `scrap-plus-${name}`
        $input.type = 'checkbox';
        $input.checked = !!status;

        $label.innerText = defaultLabel(name);

        $label.setAttribute('for', `scrap-plus-${name.replace(/\s+/g, '-')}`);


        $label.style = 'line-height: 1';

        container.append($input, $label);

        $input.addEventListener('change', () => {
            this.updateLinkState(name)
            this.handleChangedModes();
        })

        return container
    }

}

class UserUI {
    constructor(globalEvents, user, userElement) {
        this.events = globalEvents;
        this.user = user;
        this.userElement = userElement;
    }

    addBlockButton() {
        const $blockButton = document.createElement('button');
        $blockButton.className = 'btn block-button';
        $blockButton.innerText = 'Block';

        this.userElement.append($blockButton);
        $blockButton.addEventListener('click', () => {
            const toBlock = confirm(`Block ${this.user.name}?`);
            if (toBlock) this.events.emit('user_blocked', this.user);
        })
    }

}

class ItemUI {
    constructor(item) {
        this.item = item;
        this.initialTooltip = null;
    }

    initializeTooltip() {
        this.initialTooltip = this.item.element.dataset.content;
        return this
    }

    addButtons(modes = AVAILABLE_LINKS) {
        this.resetTooltip();

        const addonHTML = modes
        .filter(m => !!m.status)
        .map(m => m.name).
        reduce((acc, curr) => {
            const button = this.createExternalLinkButton(curr);
            if (!button) {
                return acc
            }
            return acc + button;
        }, '');
        const oldHTML = this.initialTooltip;

        const newHTML = oldHTML + '<br/>' + addonHTML;

        this.item.element.dataset.content = newHTML;
    }

    createExternalLinkButton(mode) {
        let buttonText, toAdd = '';
        switch (mode) {
            case EXTERNAL_LINKS.history: buttonText = 'View item history'; toAdd = 'Item history may be unavailable.'; break;
            default: buttonText = `View on ${mode}`;
        }
        const link = this.createLink(mode);
        if (!link) return;
        return `<a href=${link} target='_blank' title='${toAdd}'><button class='btn btn-embossed btn-inverse btn-xs' style='width: 100%'>${buttonText}</button></a><br/>`
    }


    ////////MAAAAYBE this looks like a complete assssssss but still does the job
    createLink(mode) {
        switch (mode) {
            case EXTERNAL_LINKS.mp: {
                if (this.item.name === 'Unusualifier' || this.item.name.includes('Kit')) return null;
                return `https://marketplace.tf/items/tf2/${Utils.makeSKU(this.item)}`
            }
            case EXTERNAL_LINKS.bp: {
                if (this.item.name === 'Unusualifier' || this.item.name.includes('Kit')) return null;
                if (this.item.wear) return null // CBA it RAHHHHHHHHHH just use my or not my button on mp
                return `https://backpack.tf/stats/${encodeURIComponent(QUALITIES[this.item.quality])}/${encodeURIComponent(((KILLSTREAKS[this.item.killstreakTier])|| '') + this.item.name)}/Tradable/${encodeURIComponent(this.item.craftable ? 'Craftable' : 'Non-Craftable')}/${encodeURIComponent(this.item?.priceIndex ?? '')}`
            }
            case EXTERNAL_LINKS.history: return `https://backpack.tf/item/${this.item.id}`;
            case EXTERNAL_LINKS.mannco: {
                if (this.item.quality !== 5 || this.item.name === 'Unusualifier') return null;
                return `https://mannco.store/item/440-` +
                    this.formatForUrl(this.item.effectName) +
                    '-unusual-' +
                    this.formatForUrl(this.item.name);            };
            case EXTERNAL_LINKS.scm: {
                let before = '', after = '';
                let wrap = (before, current, after) => before + encodeURIComponent(current) + after;

                if (this.item.quality === 5) {
                    after = `?filter=${encodeURIComponent(this.item.effectName)}`
                }

                if (this.item.killstreakTier) {
                    before = encodeURIComponent(KILLSTREAKS[this.item.killstreakTier]);
                }

                if(this.item.quality !== 6 && this.item.quality !== 15) before = QUALITIES[this.item.quality] + '%20' + before;


                return `https://steamcommunity.com/market/listings/440/${wrap(before, this.item.name, after)}`;
            }
        }
    }

    resetTooltip() {
        this.item.element.dataset.content = this.initialTooltip;
    }

    formatForUrl(text) {
        if (!text) return '';

        return text
            .replace(/[★'!()|:™®©]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }
}


//////////////////////////////////////////////////////////////////
////////////////////////SPECIFIC AUCTION CLASSES /////////////////

class SelectionUI {
    constructor() {
        this.target = document.querySelector(SELECTORS.TARGET_HEADER);
        this.inventoryController = null;
        this.maxCurrencies = {
            keys: 0,
            ref: 0,
            rec: 0,
            scrap: 0
        }
    }

    async init() {
        this._cleanTARGET_HEADER();
        this._createKeyRefFields();
        this._createButtons();
        this._blockUI();
        await this._waitForInventoryLoad();
        this._unblockUI();
        this.inventoryController = new InventoryController(document.querySelector('#user-bp-440'));
        this._getMaxCurrencies();
        this._setupInputsHandlers();
    }

    // We're removing rudimentary game selection as you can't bid anything that is not from TF
    _cleanTARGET_HEADER() {
        this.target.style = 'display: flex; justify-content: center';
        [...this.target.children].forEach(c => c.remove());
    }

    _createKeyRefFields() {
        const currencyInputsContainer = document.createElement('div');

        const [keyField, refField] = [
            document.createElement('input'),
            document.createElement('input')
        ];
        keyField.className = 'form-control keys-input';
        refField.className = 'form-control ref-input';

        keyField.placeholder = 'Keys...';
        refField.placeholder = 'Ref...'

        currencyInputsContainer.style = ' width: 30%;  padding: 1rem 0px;  display: flex;  gap: 0.5rem;';
        currencyInputsContainer.append(keyField, refField);
        this.target.append(currencyInputsContainer);

        this.uiContainer = currencyInputsContainer;
    }


    _blockUI() {
        [...this.uiContainer.querySelectorAll('button, input')].forEach(e => {e.disabled = true; e.classList.add('disabled')});
    }

    _unblockUI() {
        [...this.uiContainer.querySelectorAll('button, input')].forEach(e => {e.removeAttribute('disabled'); e.classList.remove('disabled')});
    }

    async _waitForInventoryLoad() {
        return new Promise((resolve, reject) => {
            const interval = setInterval(checkForLoad, 300);

            function checkForLoad() {
                const TARGET_INDICATOR = document.querySelector(SELECTORS.TARGET_INDICATOR);
                if (!TARGET_INDICATOR || TARGET_INDICATOR.querySelector('p') || TARGET_INDICATOR.querySelector('h4')) return;
                clearInterval(interval);
                console.log(`Inventory was loaded successfully!`);
                resolve();
            }
        })
    }

    _getMaxCurrencies() {
        this.maxCurrencies = this.inventoryController.getMaxCurrencies();
    }

    _setupInputsHandlers() {
        const keysInput = this.uiContainer.querySelector('.keys-input');
        const refInput = this.uiContainer.querySelector('.ref-input');

        keysInput.addEventListener('change', (e) => {
            if (e.target.value > this.maxCurrencies.keys) {
                HTMLController.pulse(e.target, defStyle);
                e.target.value = this.maxCurrencies.keys
            }
        })

        refInput.addEventListener('change', (e) => {
            if (e.target.value > this.maxCurrencies.ref) {
                HTMLController.pulse(e.target, defStyle);
                e.target.value = MetalConverter.getFloatValue(this.maxCurrencies)
            }
        })
    }

    _createButtons() {
        const container = document.createElement('div');
        container.style = 'width: 40%; display: flex; gap: 0.5rem';
        container.append(
            this._createAddButton(),
            this._createUnselectAllButton()
        )
        this.uiContainer.append(container);
    }

    _createAddButton() {
        const button = document.createElement('button');
        button.innerText = 'Add';
        button.className = 'btn btn-success btn-primary';
        button.addEventListener('click', () => {
            const inputs = this.uiContainer.querySelectorAll('input');
            const keys = Number(inputs[0].value) || 0;
            const refined = Number(inputs[1].value) || 0;
            if (keys === 0 && refined === 0) {
                [...inputs].forEach(e => HTMLController.pulse(e, defStyle));
                return;
            } else {
                this.inventoryController.select({keys, refined})
            }
        });

        ///////Additionaly we (yes, WE) want it to be pressed on Enter click
        this._createKeyboardListener('Enter', button);
        return button;
    }

    _createUnselectAllButton() {
        const button = document.createElement('button');
        button.innerText = 'Clear';
        button.className = 'btn btn-embossed btn-primary';
        button.addEventListener('click', () => {
            [...this.uiContainer.children].forEach(e => {e.value = ''});
            this.inventoryController.clearSelection()
        })
        return button
    }

    _createKeyboardListener(key, button) {
        window.addEventListener('keyup', (e) => {
            if (e.key !== key) return;
            button.click();
        })
    }
}


class InventoryController {
    constructor(inventoryHTML) {
        this.invHTML = inventoryHTML;
        this.items = this.updateItems();
        this.maxCurrencies = this.getMaxCurrencies();
    }

    select(currency) {
        const {keys, refined} = currency;
        this._selectKeys(keys);
        this._selectRefined(refined);
        this.updateItems()
    }

    updateItems() {
        this.items = [...document.querySelectorAll('#user-bp-440 .item')].filter(i => !i.querySelector('.filtered-label')).map(i => {
            return {
                element: i,
                defindex: i.dataset.defindex,
                value: i.dataset.defindex === index.ref ? 9 : i.dataset.defindex === index.rec ? 3 : 1
            }
        });
        return this.items;
    }

    getMaxCurrencies() {
        const currencies = {
            keys: 0,
            ref: 0,
            rec: 0,
            scrap: 0
        };

        this.items.forEach(i => {
            switch(i.defindex) {
                case index.key:
                    currencies.keys++;
                    break;
                case index.ref:
                    currencies.ref++;
                    break;
                case index.rec:
                    currencies.rec++;
                    break;
                case index.scrap:
                    currencies.scrap++;
                    break;
                default: break;
            }
        })
        return currencies;
    }

    clearSelection() {
        // internal method rahh
        ScrapTF.Inventory.RemoveAll();
    }

    _selectKeys(keys) {
        const keysElem = this.items.filter(i => i.defindex === index.key);
        const selectAmount = keys <= this.maxCurrencies.keys ? keys : this.maxCurrencies.keys;

        for (let i = 0; i < selectAmount; i++) {
            const e = keysElem[i];
            if (!e) return;
            e.element.click()
        }

        this.updateItems();
    }

    _selectRefined(refined) {
        let remaining = MetalConverter.toScrapFromString(refined);
        let result = {
            selected: [],
            totalScrap: 0
        }
        const items = this.items.sort((a,b) => b.value - a.value).filter(item => item.defindex !== index.key);

        for (const item of items) {
            if (item.value <= remaining) {
                console.log(`Still got ${remaining} scrap; Processing ${item.value} scrap item`)
                result.selected.push(item);
                result.totalScrap += item.value;
                remaining -= item.value;
                if (remaining <= 0) {
                    result.isExact = true;
                    break;
                }
            }
        }

        result.selected.forEach(i => i.element.click())
    }
}

class HTMLController {
    static async pulse(e, initBorderStyle = 'none') {
        if (!e) return;
        const originalBorder = e.style.border || initBorderStyle;
        async function singlePulse() {
            return new Promise(resolve => {
                let opacity = 1;
                const interval = setInterval(() => {
                    e.style.border = `2px solid rgba(255, 100, 100, ${opacity})`;
                    opacity -= 0.1;

                    if (opacity <= 0) {
                        clearInterval(interval);
                        e.style.border = originalBorder;
                        resolve();
                    }
                }, 100);
            });
        }
        await singlePulse();
        await new Promise(resolve => setTimeout(resolve, 400));
        await singlePulse();
    }
}

class MetalConverter {
    static getFloatValue(currencies) {
        return MetalConverter.toRef(MetalConverter.toScrap(currencies))
    }

    static toScrap(currencies) {
        const {keys, ...metals} = currencies;
        const {ref = 0, rec = 0, scrap = 0} = metals;
        return ref * 9 + rec * 3 + scrap;
    }

    static toRef(scrap) {
        const scrapEnd = scrap % 9 * 0.11;
        const refs = Math.floor(scrap / 9);
        return refs + scrapEnd;
    }


    static toScrapFromString(ref) {
        const scrapAmount = ref % 1 / 0.11;
        const refsToScrap = (ref - ref % 1) * 9;
        return MetalConverter.toScrap({scrap: scrapAmount + refsToScrap});
    }

}


/////////////////APPLICATION///////////////////////////////

class App {
    init() {
        if(window.location.href.match(/\/auctions(?:\/(\d+)|\/)?$/)) {
            this.initAuctionsPage();
        } else {
            this.initSpecificAuctionView();
        }
    }

    initAuctionsPage() {
        this.globalEvents = new EventBus();
        this.initLogger();
        this.initAuctionsController();
        this.initBlockController();
        this.initTitleChange();
        this.initUsersUI();
        this.initItemsUI();
        this.globalEvents.emit('log', 'App initialized');
    }

    initSpecificAuctionView() {
        this.initSpecificItemsUI();
        new SelectionUI().init();
    }

    initLogger() {
        const logger = new Logger();
        this.globalEvents.subscribe(logger);
        this.globalEvents.emit('log', 'Logger initialized');
    }

    initAuctionsController() {
        const auctionsController = new AuctionsController(this.globalEvents);
        auctionsController.getAuctions();
        this.auctionsController = auctionsController;
        const auctionsUiController = new AuctionsUIController(this.globalEvents, auctionsController);
        this.globalEvents.subscribe(auctionsUiController);
        this.globalEvents.emit('log', 'Auctions initialized');
        this.globalEvents.emit('debug', auctionsController);
    };

    initTitleChange() {
        document.title = `Auctions+ | Page ${Utils.checkCurrentPage()} | v${GM_info.script.version}`;
        this.globalEvents.emit('log', 'Title changed')
    };

    initBlockController() {
        const blocklistController = new BlocklistController(this.globalEvents);
        const blocklistUI = new BlockListUI(this.globalEvents, blocklistController);
        blocklistUI.initModal();
        this.globalEvents.subscribe(blocklistController);
        this.globalEvents.subscribe(blocklistUI);
    }

    initUsersUI() {
        this.auctionsController.auctions.forEach(auction => {
            const userElement = auction.element.querySelector(SELECTORS.USER);
            if (userElement && auction.user) {
                const userUI = new UserUI(this.globalEvents, auction.user, userElement);
                userUI.addBlockButton();
            }
        });
    }

    initItemsUI() {
        const itemsUIController = new ItemsUIController();
        itemsUIController.addSelectionUI();
        this.auctionsController.auctions.forEach(a => {
            a.items.forEach(i => {
                const item = new ItemUI(i).initializeTooltip();
                itemsUIController.addItem(item);
                if (DEBUG.ITEMS.UNUSUAL_ONLY) return i.quality === 5 && item.addButtons();
                return item.addButtons();
            })
        })
    }

    initSpecificItemsUI() {
        [...document.querySelectorAll(SELECTORS.ITEM)].forEach(ie => {
            const item = new Item(ie);
            const itemUI = new ItemUI(item).initializeTooltip().addButtons();
        })
    }
}

//////////////////UTILS//////////////////////////////////////////////

class Utils {
    static get randomEmoji() {
        const length = EMOJI_LIST.length;
        const index = Math.round(Math.random() * length);
        return EMOJI_LIST[index]
    }

    static get randomColor() {
        const r = Math.round(Math.random() * (255 - MIN_COLOR) + MIN_COLOR);
        const g = Math.round(Math.random() * (255 - MIN_COLOR) + MIN_COLOR);
        const b = Math.round(Math.random() * (255 - MIN_COLOR) + MIN_COLOR);

        return `rgb(${r}, ${g}, ${b})`
    }

    static omitProp(object, property = 'element') {
        let finalObject = {...object};
        delete finalObject[property];
        return finalObject
    }

    static changeHiddenCounter(count) {
        const title = document.querySelector(SELECTORS.BLOCKLIST_PANEL);
        if (count === 0) {
            title.innerText = 'Public auctions';
            return;
        }
        title.innerText = `Public auctions | ${count} auction${count === 1 ? '' : 's'} hidden`;
    }

    static checkCurrentPage() {
        const currentPageURL = window.location.href;
        const match = currentPageURL.match(/auctions\/(\d+)/);
        if (!match) return 1;
        return match[1];
    }

    static makeSKU(item) {
        const defaultTemplate = ({defindex, quality, craftable = true}) =>
        `${defindex};${quality}${craftable ? '' : ';uncraftable'}`;

        const skinTemplate = ({defindex, quality, wear, paintKit}) =>
        `${defindex};${quality};w${wear};pk${paintKit}`;

        const unuSkinTemplate = ({defindex, quality, priceIndex, wear, paintKit}) =>
        `${defindex};15;u${priceIndex};w${wear};pk${paintKit}`;

        const unusualTemplate = ({defindex, quality, priceIndex}) =>
        `${defindex};${quality};u${priceIndex}`;

        const hasKillstreak = item.killstreakTier !== undefined;
        const killstreakSuffix = hasKillstreak ? `;kt-${item.killstreakTier}` : '';

        if (item.wear !== undefined && item.paintKit !== undefined) {
            let sku = item.priceIndex !== undefined ? unuSkinTemplate(item) : skinTemplate(item);
            if (hasKillstreak) {
                sku += killstreakSuffix;
            }
            return sku;
        }
        else if (item.priceIndex !== undefined) {
            let sku = unusualTemplate(item);
            if (hasKillstreak) {
                sku += killstreakSuffix;
            }
            return sku;
        }
        else {
            let sku = defaultTemplate(item);
            if (hasKillstreak) {
                sku += killstreakSuffix;
            }
            return sku;
        }
    }
}

///////////////////////////////////////////////////////////////////////

new App().init();

/////////////////////TESTS///////////////////////////////////


