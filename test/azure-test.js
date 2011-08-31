var assert = require('assert');
var azure = require('../lib/azure.js');

// Use this account for testing ..
var test_account = azure.devstore_account;

function test_hmac_string () {
  
	var key = 'GuGbCQ41a9G1vtS1/dairlSMbXhHVzoA8+VPrbWxtj94o0aoAQdsgaaoYQASWqG9mj8xDvP1hSkvSVcLC34CfA==';

	var msg = "Hello World";
	var expected = '+UTfogPQ1ELBA4l+A7LwT1lbZVbP34F/CQzXaXqwfWA=';

	var actual = azure.hmac_string(key, msg);
	assert.equal(actual, expected, 'hmac_string test failed');
}

test_hmac_string() ;

function test_canonicalized_resource_format_1 () {
  
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

function test_canonicalized_headers () {
  
	var req = {
		url : "http://myaccount.blob.core.windows.net/?comp=list&restype=container",
		headers: {'x-ms-version' : '2009-09-19','x-ms-date' : 'Sun, 12 Jun 2011 10:00:45 GMT'}
	}
	var actual = azure.canonicalized_headers(req);
	var expected =  "x-ms-date:Sun, 12 Jun 2011 10:00:45 GMT\nx-ms-version:2009-09-19\n";
	assert.equal(actual,expected, 'canonicalized_headers failed');
}

test_canonicalized_headers();

function test_container () {
  
	azure.create_container(test_account, "foobar3", 
			function(x) 
			{ 
				azure.delete_container(test_account, "foobar3", 
					function(x) { assert.ok(azure.accepted(x),"test_container failed")});
			});
}

test_container();

function test_list_containers () {
	azure.list_containers(test_account,
                              function(x) { assert.ok(azure.ok(x),"test_list_containers failed")});
}
                              
test_list_containers();

function test_list_tables () {
	azure.list_tables(test_account,
                              function(x) { assert.ok(azure.ok(x),"test_list_tables failed")});
}
                              
test_list_tables();

function test_list_queues () {
	azure.list_queues(test_account,
                              function(x) { assert.ok(azure.ok(x),"test_list_queues failed")});
}
                              
test_list_queues();

//azure.get_container_properties(test_account, "packages", azure.show_response);
//azure.get_container_metadata(test_account, "packages", azure.show_response);
//azure.list_blobs(test_account, 'packages');
//azure.get_blob(test_account, 'packages', 'ed-isla.JPG', azure.show_response);
//azure.download_blob(test_account, 'packages', 'ed-isla.JPG', "d:\\junk\\foo.jpg");




