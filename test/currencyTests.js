/*global describe:false, it:false, before:false, after:false, afterEach:false*/

'use strict';

var Invoice = require('../'),
    $$ = Invoice.Number,
    assert = require('assert'),
    fs = require('fs'),
    path = require('path');

describe('lib/invoiceTests', function () {

    it('should use custom serializer for invoice numbers', function () {
        var num = $$('123.45');
        assert.equal(JSON.stringify({amt:num}), '{"amt":"123.45"}');
    });
});