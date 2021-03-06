/**
 * Requires
 *
 * @ignore
 */
var FS = require('fs'),
  Path = require('path'),
  Fuzzy = require('fuzzysearch'),
  _ = require('lodash');

/**
 * Variables
 *
 * @ignore
 */
var cardCount = 0,
  cardPacks = {};

/**
 * Private
 *
 * @ignore
 */
function getPackCardFiles(dir) {
  var cards = [],
    files = FS.readdirSync(dir);

  for (var i = 0; i < files.length; i++) {
    var fileName = files[i];

    if (Path.extname(fileName) === '.js') {
      cards.push(Path.basename(fileName, Path.extname(fileName)));
    }
  }

  return cards;
}

module.exports = {
  /**
    * Initializes and caches the packs and card data.
    * This function should be called before any other functions in the packs API.
    *
    * @method init
    * @param {String}  baseUrl         The protocol and host name where your cards are being hosted. Eg: https://hashdo.com
    * @param {String}  cardsDirectory  The directory where you packs and cards can be found and loaded from.
    */
  init: function (baseUrl, cardsDirectory) {
    var packs = _.filter(FS.readdirSync(cardsDirectory), function (dir) { return _.startsWith(dir, 'hashdo-'); });
      
    console.log('PACKS: Cards will be loaded from %s.', cardsDirectory);
    
    var packCounter = 0,
      cardCounter = 0,
      hiddenCounter = 0;

    for (var i = 0; i < packs.length; i++) {
      var isPackage = false,
        packDir = Path.join(cardsDirectory, packs[i]);
      
      // Check if the directory has a package.json file, otherwise ignore it, it's not a pack.
      try {
        FS.statSync(Path.join(packDir, 'package.json'));
        isPackage = true;
      }
      catch (err) {}
      
      if (isPackage) {
        var packageJson = FS.readFileSync(Path.join(packDir, 'package.json')),
          packageInfo = JSON.parse(packageJson.toString()),
          packInfo = packageInfo.pack,
          packCardsDir = Path.join(cardsDirectory, packs[i]),
          packCards = getPackCardFiles(packCardsDir),
          packName = packageInfo.name.replace('hashdo-', '');
    
        if (packInfo) {
          packCounter++;
          
          if (!packInfo.hidden) {
            cardPacks[packName] = { 
              name: packInfo.friendlyName,
              cards: {}
            };
        
            for (var j = 0; j < packCards.length; j++) {
              var card = require(Path.join(packCardsDir, packCards[j])),
                cardName = packCards[j];
      
              cardCounter++;
              cardPacks[packName].cards[cardName] = {
                pack: packName,
                card: cardName,
                name: card.name,
                description: card.description || '',
                icon: card.icon || _.trimEnd(baseUrl, '/') + '/' + packName + '/' + cardName + '/icon.png',
                baseUrl: _.trimEnd(baseUrl, '/') + '/' + packName + '/' + cardName,
                inputs: card.inputs
              };
            }
          }
          else {
            hiddenCounter++;
          }
        }
      }
    }
    
    console.log('PACKS: %d packs and %d card(s) have been loaded (%d hidden).', packCounter, cardCounter, hiddenCounter);
  },
  
  /**
    * Get the number of cards matching an optional filter.
    *
    * @method count
    * @param {String}    [filter]  Optional filter for card names. The filter will use fuzzy matching.
    *
    * @returns {Number}  The number of cards found matching the filter.
    */
  count: function (filter) {
    if (cardCount > 0) {
      return cardCount;
    }
    else {
      cardCount = 0;
  
      if (filter) {
        filter = filter.toLowerCase();
  
        _.each(_.keys(cardPacks), function (packKey) {
          _.each(_.keys(cardPacks[packKey].cards), function (cardKey) {
            var card = cardPacks[packKey].cards[cardKey];
  
            if (Fuzzy(filter, card.name.toLowerCase())) {
              cardCount = cardCount + 1;
            }
          });
        });
      }
      else {
        _.each(_.keys(cardPacks), function (packKey) {
          cardCount = cardCount + _.keys(cardPacks[packKey].cards).length;
        });
      }
  
      return cardCount;
    }
  },
  
  /**
    * Get the card object matching an optional filter.
    *
    * @method cards
    * @param {String}    [filter]  Optional filter for card names. The filter will use fuzzy matching.
    *
    * @returns {Array}  An array of card objects that are found matching the filter.
    */
  cards: function (filter) {
    var list = [];
  
    _.each(_.keys(cardPacks), function (packKey) {
      _.each(_.keys(cardPacks[packKey].cards), function (cardKey) {
        var card = cardPacks[packKey].cards[cardKey],
          item = {
            pack: card.pack,
            card: card.card,
            name: card.name,
            description: card.description,
            icon: card.icon
          };
  
        if (filter) {
          filter = filter.toLowerCase();
  
          if (Fuzzy(filter, card.name.toLowerCase())) {
            list.push(item);
          }
        }
        else {
          list.push(item);
        }
      });
    });
  
    // sort
    list = _.sortBy(list, 'pack card');
  
    return list;
  },
  
  /**
    * Get a specific card object.
    *
    * @method card
    * @param {String}    pack  The pack name.
    * @param {String}    card  The card name.
    *
    * @returns {Object}  The card object macthing the pack and name provided, undefined if not found.
    */
  card: function (pack, card) {
    if (cardPacks[pack] && cardPacks[pack].cards[card]) {
      return cardPacks[pack].cards[card];
    }
  }
};
