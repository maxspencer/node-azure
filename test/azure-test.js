var assert = require('assert');
var azure = require('../lib/azure.js');

// Use this account for testing ..
var test_account = 
{
	name : "two10ra",
	key : "dmIMUY1mg/qPeOgGmCkO333L26cNcnUA1uMcSSOFMB3cB8LkdDkh02RaYTPLBL8qMqnqazqd6uMxI2bJJEnj0g==",
	blob_storage_url : "https://two10ra.blob.core.windows.net",
	table_storage_url : "https://two10ra.table.core.windows.net",
	queue_storage_url : "https://two10ra.queue.core.windows.net"
}


/***********************************
* Core request functionality Tests *
***********************************/

function test_hmac_string () {
  
	var key = 'GuGbCQ41a9G1vtS1/dairlSMbXhHVzoA8+VPrbWxtj94o0aoAQdsgaaoYQASWqG9mj8xDvP1hSkvSVcLC34CfA==';

	var msg = "Hello World";
	var expected = '+UTfogPQ1ELBA4l+A7LwT1lbZVbP34F/CQzXaXqwfWA=';

	var actual = azure.hmac_string(key, msg);
	assert.equal(actual, expected, 'hmac_string test failed');
}

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

function test_canonicalized_headers () {
	var req = {
		url : "http://myaccount.blob.core.windows.net/?comp=list&restype=container",
		headers: {'x-ms-version' : '2009-09-19','x-ms-date' : 'Sun, 12 Jun 2011 10:00:45 GMT'}
	}
	
	var actual = azure.canonicalized_headers(req);
	var expected =  "x-ms-date:Sun, 12 Jun 2011 10:00:45 GMT\nx-ms-version:2009-09-19\n";
	assert.equal(actual,expected, 'canonicalized_headers failed');
}

// Group
function run_core_tests() {
	test_hmac_string() ;
	test_canonicalized_resource_format_1();
	test_canonicalized_headers();
}

/*************************
* Blob Service API Tests *
*************************/

function test_list_containers() {
	azure.list_containers(test_account, function(x) {
		assert.ok(azure.ok(x), 'test_list_containers failed.');
	});
}

function test_create_container() {
	var c = 'test-create-container';
	azure.delete_container(test_account, c, function() {
		azure.create_container(test_account, c, function(x) {
			assert.ok(azure.created(x), 'test_create_container failed.');
			azure.delete_container(test_account, c) // Clean up.
		});
	});
}

function test_delete_container() {
	var c = 'test-delete-container';
	azure.create_container(test_account, c, function() {
		azure.delete_container(test_account, c, function(x) {
			assert.ok(azure.accepted(x), 'test_delete_container failed.');
		});
	});
}

function test_get_container_properties() {
	var c = 'test-get-container-properties';
	azure.create_container(test_account, c, function() {
		azure.get_container_properties(test_account, c, function(x) {
			assert.ok(azure.ok(x), 'test_get_container_properties failed.');
			azure.delete_container(test_account, c); // Clean up.
		});
	});
}

function test_get_container_metadata() {
	var c = 'test-get-container-metadata';
	azure.create_container(test_account, c, function() {
		azure.get_container_metadata(test_account, c, function(x) {
			assert.ok(azure.ok(x), 'test_get_container_metadata failed.');
			azure.delete_container(test_account, c); // Clean up.
		});
	});
}

function test_set_container_metadata() {
	var c = 'test-set-container-metadata';
	var expected = 'onetwothree'
	azure.create_container(test_account, c, set_meta);
	
	function set_meta() {
		azure.set_container_metadata(
		test_account, 
		c, 
		{'x-ms-meta-testing': expected},
		get_meta
		);
	}

	function get_meta() {
		azure.get_container_metadata(test_account, c, function(x) {
			assert.ok(azure.ok(x), 'test_set_container_metadata failed. Unable to get metadata.');
			assert.equal(
				x.headers['x-ms-meta-testing'],
				expected,
				'test_set_container_metadata failed. Expecting \'' + expected + '\', got \'' + x.headers['x-ms-meta-testing'] + '\''
			);
			azure.delete_container(test_account, c); // Clean up.
		});
	}
}

function test_list_blobs() {
	var c = 'test-list-blobs';
	azure.create_container(test_account, c, function() {
		azure.list_blobs(test_account, c, function(x) {
			assert.ok(azure.ok(x), 'test_list_blobs failed.');
			azure.delete_container(test_account, c); // Clean up.
		});
	});
}

// Group
function run_blob_tests() {
	test_list_containers();
	test_create_container();
	test_delete_container();
	test_get_container_properties();
	test_get_container_metadata();
	test_set_container_metadata();
	test_list_blobs();
}

/**************************
* Queue Service API Tests *
**************************/

function test_list_queues() {
	azure.list_queues(test_account, function(x) {
		assert.ok(azure.ok(x), 'test_list_queues failed.');
	});
}

function test_create_queue() {
	var q = 'test-create-queue'
	// Must ensure container of this name doesn't already exists otherwise a 209
	// Conflict error is returned.
	azure.delete_queue(test_account, q, function() {
		azure.create_queue(test_account, q, function(x) {
			assert.ok(azure.created(x), 'test_create_queue failed.');
			azure.delete_queue(test_account, q); // Clean up.
		});
	});
}

function test_delete_queue() {
	var q = 'test-delete-queue';
	azure.create_queue(test_account, q, function() {
		azure.delete_queue(test_account, q, function(x) {
			assert.equal(x.statusCode, 204, 'test_delete_queue failed.')
		});
	});
}

// Group
function run_queue_tests() {
	test_list_queues();
	test_create_queue();
	test_delete_queue();
}

/**************************
* Table Service API Tests *
**************************/

function test_query_tables() {
	azure.query_tables(test_account, function(x) {
		assert.ok(x.length >= 0, 'query_tables');
	});
}

function test_insert_entity() {
	azure.create_table(test_account, 'testtable', function(y){
		//console.log(y.statusCode);
		//assert.ok(azure.ok(y), "create_table failed");
		azure.insert_entity(test_account, 'testtable', { RowKey:'123', PartitionKey: 'xyz', Value: 'foo' }, function(x) {
			//console.log(azure.created(x));
			//azure.show_response(x);
			//assert.ok(azure.created(x), "test_insert_entity failed");
		});
	});
}

function test_get_entity() {
	azure.get_entity(test_account, 'testtable', 'xyz', '123', function(result) {
		assert.ok(result != undefined, "test_get_entity");
	});
	
	azure.get_entity(test_account, 'testtable', 'xyz', 'DoesNotExist', function(result) {
		assert.ok(result == undefined, "test_get_entity");
	});
}

function test_query_entities() {
	azure.query_entities(test_account, 'testtable', "Value+eq+'foo'", function(result) {
		assert.ok(result != undefined, "test_query_entities");
	});


}

// Group
function run_table_tests() {
	test_query_tables();
	test_insert_entity();
	test_get_entity();
	test_query_entities();
}

/******************************************************************************/

function run_all_tests() {
	run_core_tests();
	run_blob_tests();
	run_queue_tests();
	run_table_tests();
}

/******************************************************************************/

//azure.list_queues(test_account, azure.show_response);
//azure.delete_queue(test_account, q); // Clean up.
//test_insert_entity();
//test_query_tables();
//test_get_entity();
//test_query_entities();
//test_list_containers();
run_all_tests();


//azure.get_container_properties(test_account, "packages", azure.show_response);
//azure.get_container_metadata(test_account, "packages", azure.show_response);
//azure.list_blobs(test_account, 'packages');
//azure.get_blob(test_account, 'packages', 'ed-isla.JPG', azure.show_response);
//azure.download_blob(test_account, 'packages', 'ed-isla.JPG', "d:\\junk\\foo.jpg");
//azure.list_containers(test_account, azure.show_response);
//azure.list_queues(test_account, azure.show_response);
//azure.put_message(test_account, "foo", "<QueueMessage><MessageText>Hello</MessageText></QueueMessage>");
//azure.put_blob (test_account, "packages", azure.BlockBlob, "foo.txt", "hello world");

//azure.create_table(test_account, "wibble2", azure.show_response);