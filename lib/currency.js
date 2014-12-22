'use strict';

var BigNum = require('bignumber.js');

var currencyProperties = {
    USD: {
        symbol: '$',
        decimals: 2,
        round: BigNum.ROUND_HALF_UP,
        iso4217: 840
    },
    GBP: {
        symbol: '£',
        decimals: 2,
        round: BigNum.ROUND_HALF_UP,
        iso4217: 826
    },
    AUD: {
        symbol: '$',
        decimals: 2,
        round: BigNum.ROUND_HALF_UP,
        iso4217: 36
    }
};

module.exports = {
    round: function (currency, amountAsBigNum) {
        return new BigNum(amountAsBigNum.round(currencyProperties[currency].decimals,
            currencyProperties[currency].round));
    },
    isSupported: function (currency) {
        return currencyProperties.hasOwnProperty(currency);
    },
    Number: BigNum,
    newNumber: function (v) {
        return new BigNum(v);
    },
    properties: currencyProperties
};

