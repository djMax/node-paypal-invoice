'use strict';

var InvoiceContactInfo = function (details) {
    var t = this;
    details = details || {};

    'firstName lastName businessName phoneNumber faxNumber website customValue'.split(' ').forEach(function (p) {
       if (details[p]) {
           t[p] = details[p];
       }
    });
    if (details.address) {
        t.address = {};
        'country line1 line2 city state postalCode'.split(' ').forEach(function (p) {
           t.address[p] = details.address[p];
        });
    }
};

module.exports = InvoiceContactInfo;