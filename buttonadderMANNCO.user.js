// ==UserScript==
// @name         ManncoStore+ 
// @namespace    https://steamcommunity.com/profiles/76561198967088046
// @version      1.0.0
// @description  it haks ur compure
// @author       eeek
// @match       https://mannco.store/item/440-*
// @match       https://mannco.store/ru/item/440-*
// @require http://code.jquery.com/jquery-latest.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mannco.store
// @grant        GM_xmlhttpRequest
// ==/UserScript==

let $itemInfo = $('.item-info__name').text().replace('★', '').replace('Strange', '').replace(/\s+/g, " ").split('Unusual');
console.log($itemInfo);

function getItem() {
    return $('.item-info__name').text().replace('★', '').replace('Unusual', '').replace('Strange', '').replace(/\s+/g, " ").trim();
};
function checker() {return $('.item-info__name').text().includes('★')};

if (checker()) {
    let $bpBtn = $('<button>', {class: 'btn btn-sm justify-content-center'});

    $('.item-info__data').append($bpBtn);
    $bpBtn.css({'font-size': '2rem', 'background-color': '#189ab9', 'border-color': '#35bddb'}).html('BPtf stats');
    $bpBtn.on('click', function() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://backpack.tf/search?text=${getItem()}`,
            onload: function(data) {
                let res = JSON.parse(data.responseText).results[0];
                if (!res){
                    console.info('BPTF-API-ERROR: no item found. Redirecting...');
                    window.open(`https://google.com/search?q=${$itemInfo.join(' ').replace(/\s+/g, ' ')}`);
                }else{
                    window.open(`https://backpack.tf/stats/Unusual/${res.item_name}/Tradable/Craftable/${res.values[0].priceindex}`)
                    console.log(res.values);
                }
            }
        })
    })
}
let erCount = 0;
const refresh = setInterval(checkerr, 200);

function checkerr() {
  if (erCount >= 20) {
    clearInterval(refresh);
    console.log(`Failed to load listings after 20 retries`);
  }
  if ($('.itemListPagination').text()) {
    let $bpHistory = $('.table-items__actions > a').each(function () {
    if($(this).text().includes('Steamcollector.com')) {
        let $item = $(this).attr('href').slice($(this).attr('href').lastIndexOf('/')+1);
        $(this).attr('href', `https://backpack.tf/item/${$item}`)
            .text('View history on backpack.tf');
    }
})
  } else {
    erCount++;
    console.log(erCount+1);
  }
}
