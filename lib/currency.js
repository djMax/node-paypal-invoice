'use strict';

var BigNum = require('bignumber.js');

var currencyProperties = {
    USD: {
        decimals: 2,
        round: BigNum.ROUND_HALF_UP
    },
    GBP: {
        decimals: 2,
        round: BigNum.ROUND_HALF_UP
    },
    AUD: {
        decimals: 2,
        round: BigNum.ROUND_HALF_UP
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

