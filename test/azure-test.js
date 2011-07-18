var assert = require('assert');
var azure = require('../lib/azure.js');

function test_hmac_string() 
{
	var key = 'GuGbCQ41a9G1vtS1/dairlSMbXhHVzoA8+VPrbWxtj94o0aoAQdsgaaoYQASWqG9mj8xDvP1hSkvSVcLC34CfA==';

	var msg = "Hello World";
	var expected = '+UTfogPQ1ELBA4l+A7LwT1lbZVbP34F/CQzXaXqwfWA=';

	var actual = azure.hmac_string(key, msg);
	assert.equal(actual, expected, 'hmac_string test failed');
}


test_hmac_string() ;

function test_canonicalized_resource_format_1 ()
{
	var account = {
		name: 'myaccount',
		key : 'x'
	}

	var request = {
		url: 'https://myaccount.blob.core.windows.net/mycontainer?restype=container&comp=metadata',
		method: 'GET',
		headers: {}
	}

	var actual = azure.canonicalized_resource_format_1(account.name, request);
	var expected = '/myaccount/mycontainer\nrestype:container\ncomp:metadata';
	assert.equal(actual,expected, 'canonicalized_resource-format_1 failed');
}

test_canonicalized_resource_format_1();

function test_canonicalized_headers()
{
	var req = {
		url : "http://robblackwell.blob.core.windows.net/?comp=list&restype=container",
		headers: {'x-ms-version' : '2009-09-19','x-ms-date' : 'Sun, 12 Jun 2011 10:00:45 GMT'}
	}
	var actual = azure.canonicalized_headers(req);
	console.log(":::" + actual);
	var expected =  "x-ms-date:Sun, 12 Jun 2011 10:00:45 GMT\nx-ms-version:2009-09-19\n";
	assert.equal(actual,expected, 'canonicalized_headers failed');
}


test_canonicalized_headers();

