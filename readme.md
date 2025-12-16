<div align="center">

[![bigcat](./assets/bigcat.jpg)]()

# .TF+ — the collection of TF2 trading sites userscripts

Quality-of-Life improvements for essential Team Fortress 2 trading websites
  
[![Discord](https://img.shields.io/badge/Stay-updated-7289da?style=for-the-badge&logo=discord)](https://discord.gg/jygnfCRjna)</br>
Tech stack: </br>
[![JavaScript](https://img.shields.io/badge/JavaScript-grey?style=for-the-badge&logo=javascript)](https://www.javascript.com/)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-grey?style=for-the-badge&logo=Tampermonkey)](https://www.tampermonkey.net/)

</div>

## Requirements
> [!WARNING]  
> You need **Tampermonkey** to be installed.</br> 
> You need to **allow scripts** to make requests

[![Chrome Version](https://img.shields.io/badge/Get_for_Chrome-grey?style=for-the-badge&logo=chromewebstore)](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en&pli=1)
[![Firefox Version](https://img.shields.io/badge/Get_for_Firefox-grey?style=for-the-badge&logo=firefoxbrowser)](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)



## Scripts
* [STN+](#stn)
* [ScrapAuctions+](#scrapauctions)
* [ManncoStore+](#manncostore)
* [QuicksellStore+](#quicksellstore)

## STN+
Script for [STNTradingEU](https://stntrading.eu/)
</br>
</br>
[![Install STN+](https://img.shields.io/badge/Install-STN+-limegreen?style=for-the-badge)](https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/STNPlus.user.js)
</br>
> Currently only works with unusuals
### Features: 
* **Item page**: 
  * Cross-platform price aggregation - fetches and displays prices from backpack.tf
  * Buy orders stability checker - checks if buyers are stable at the top buyer price
  * Backpack.tf link for the item
* **Bot items page**:
  * Backpack.tf link for each item
  * Marketplace.tf link for each item
  * Force schema update feature for keeping the game schema relevant
    
## ScrapAuctions+
Script for [ScrapTF Auctions](https://scrap.tf/auctions)
</br>
</br>
[![Install ScrapAuctions+](https://img.shields.io/badge/Install-ScrapAuctions+-crimson?style=for-the-badge)](https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ScrapAuctionsPlus.user.js)
</br>
### Features: 
* **Auctions page**:
  * Blocklist - block users and hide their auctions
  * Tooltip settings - enable or disable links in tooltips 
* **Certain Auction page***:
  * Automated currency selection - just type values to add and script will add currencies automatically 
* **Both**: Modified tooltip with
  * Backpack.tf link
  * Marketplace.tf link
  * Mannco.store link
  * Steam Community Market link
  * Item History link


## ManncoStore+
Script for [ManncoStore](https://mannco.store)
</br>
</br>
[![Install ManncoStore+](https://img.shields.io/badge/Install-ManncoStore+-blue?style=for-the-badge)](https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/ManncoStorePlus.user.js)
</br>
> Currently only works within an unusual item page
### Features: 
* Steamcollector link replaced with backpack.tf history link
* Backpack.tf stats button 
## QuicksellStore+
Script for [QuicksellStore](https://quicksell.store/trade)
</br>
</br>
[![Install QuicksellStore+](https://img.shields.io/badge/Install-QuicksellStore+-darkslategrey?style=for-the-badge)](https://github.com/yaboieeek/.tf-plus/raw/refs/heads/main/QuicksellStorePlus.user.js)
</br>
> May break due to reactive site behaviour. Use direct `/trade` site path
### Features: 
* Backpack.tf stats page on control + click
