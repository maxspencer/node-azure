// (C) Copyright 2011 Active Web Solutions Ltd
//     All rights reserved.
// This software is provided "as is" without warranty of any kind, express or
// implied, including but not limited to warranties as to quality and fitness
// for a particular purpose. Active Web Solutions Ltd does not support the
// Software, nor does it warrant that the Software will meet your requirements or
// that the operation of the Software will be uninterrupted or error free or that
// any defects will be corrected. Nothing in this statement is intended to limit
// or exclude any liability for personal injury or death caused by the negligence
// of Active Web Solutions Ltd, its employees, contractors or agents.

var crypto = require('crypto');
var url = require('url');
var http = require('http');
var https = require('https');
var sys = require('util');
var fs = require('fs');
var xml2js = require('node-xml2js');

// HTTP Response codes
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_ACCEPTED = 202;
const HTTP_NO_CONTENT = 204;

var nl = '\n';	// Newline

// Support for developer fabric
exports.devstore_account = {
	name : "devstoreaccount1",
	key : "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
	blob_storage_url : "http://127.0.0.1:10000/devstoreaccount1",
	table_storage_url : "http://127.0.0.1:10002/devstoreaccount1",
	queue_storage_url : "http://127.0.0.1:10001/devstoreaccount1"
}

// Specifiy your own account like this
exports.sample_account = {
	name : "YOURACCOUNTNAME",
	key : "YOURACCOUNTKEY",
	blob_storage_url : "https://YOURACCOUNTNAME.blob.core.windows.net",
	table_storage_url : "https://YOURACCOUNTNAME.table.core.windows.net",
	queue_storage_url : "https://YOURACCOUNTNAME.queue.core.windows.net"
}

/*****************************
* Core request functionality *
*****************************/

function hmac_string(key, str) {
	var secret = (new Buffer(key, 'base64')).toString('binary');
	var hmac = crypto.createHmac('sha256', secret);
	return hmac.update(str).digest('base64');
}

exports.hmac_string = hmac_string

function to_array (x) {
	var a = [];
	for (var k in x)
	      a.push([k, x[k]]);

	return a;
}

String.prototype.startsWith = function(str) {
	return (this.indexOf(str) === 0);
}

function canonicalized_headers(req) { 
	var h = to_array(req.headers).sort();
	var buffer = '';

	for (var k in h)
	{
		if (h[k][0].startsWith('x-ms-'))
			buffer += h[k][0] + ":" + h[k][1] + nl;
	}

	return buffer
}

exports.canonicalized_headers = canonicalized_headers

// Expand the URL to make the request suitable for the HTTP or HTTPS modules
function requestify (req) {
	var x = url.parse(req.url,true);
	req.host = x.hostname;
	req.path = x.pathname + x.search;
    	req.port = x.port;
	if (x.protocol == 'http:') {
		req.client = http;
	}
	if (x.protocol == 'https:') {
		req.client = https;
	}
}

function canonicalized_resource_format_1(name, req)  {
	var x = url.parse(req.url,true);
	
	var s = "/" + name + x.pathname;

	// http://msdn.microsoft.com/en-us/library/windowsazure/dd179428.aspx
	for (k in x.query)  {
		// don't add dollar parameters (i.e. the table queries)
		if (k.charAt(0) != "$")
		{
			s += nl + k + ":" + x.query[k];
		}
	}
	return s;
}

exports.canonicalized_resource_format_1 = canonicalized_resource_format_1

function optional (x) {
	return (x ? x : "");
}

function string_to_sign_1(name, req) {
	return "" +
	req.method + nl +
	optional(req.headers['Content-Encoding']) + nl +
	optional(req.headers['Content-Language']) + nl +
	optional(req.headers['Content-Length']) + nl +
	optional(req.headers['Content-MD5']) + nl +
	optional(req.headers['Content-Type']) + nl +
	optional(req.headers['Date']) + nl +
	optional(req.headers['If-Modified-Since']) + nl +
	optional(req.headers['If-Match']) + nl +
	optional(req.headers['If-None-Match']) + nl +
	optional(req.headers['If-Unmodified-Since']) + nl +
	optional(req.headers['Range']) + nl +
	canonicalized_headers(req) +
	canonicalized_resource_format_1(name,req);
}

exports.string_to_sign_1 = string_to_sign_1

function string_to_sign_2(name, req) {
	return "" +
	req.method + nl +
	optional(req.headers['Content-MD5']) + nl +
	optional(req.headers['Content-Type']) + nl +
	optional(req.headers['Date']) + nl +
	canonicalized_resource_format_1(name,req);
}

exports.string_to_sign_2 = string_to_sign_2

// Useful for debugging
exports.show_response = function(res) {
	console.log('STATUS: ' + res.statusCode);
	console.log('HEADERS: ' + JSON.stringify(res.headers));
        
	res.setEncoding('utf8');
    	res.on('data', function (chunk) {
		console.log('DATA: ' );
		console.log(chunk);
	});

    	res.on('error', function(e) {
		console.log("ERROR: " + e.message);
	});

    	res.on('end', function() {
		console.log("END: ");
	});
}

exports.xml_body = function(res , cb) {
    var fn = cb || function(x) {console.log(JSON.stringify(x));};

    if (res.statusCode == HTTP_OK) {
        
        var parser = new xml2js.Parser();
        parser.on('end', function(result) {  fn(result);});

        res.on('data', function (chunk) {
		                   chunk;
	                   });
    } else {
        fn(false);
    }
}

exports.raw_body = function(res , cb) {
    var fn = cb || function(x) {console.log(x);};

    if (res.statusCode == HTTP_OK) {
        res.on('data', function (chunk) {
		                   fn(chunk);
	                   });
    } else {
        fn(undefined);
    }
}

function response_to_json(res, cb)
{
	var data = "";
	res.setEncoding('utf8');
	res.on('data', function (chunk) {
		data = data + chunk;
	});
	res.on('end', function () {
		//console.log(data); // this line will give you the raw XML
		var parser = new xml2js.Parser();
		parser.on('end', cb);
		parser.parseString(data);
	});
}

function ok (res) {
	return res.statusCode == HTTP_OK;
}

exports.ok = ok

function created(res) {
	return res.statusCode == HTTP_CREATED;
}

exports.created = created

function accepted(res) {
	return res.statusCode == HTTP_ACCEPTED;
}

exports.accepted = accepted

function shared_key_for_blob_and_queue_services (account, req) {
	req.headers =  req.headers || {};
	req.headers['x-ms-date'] = (new Date()).toUTCString();

	//if (req.x_ms_blob_type != undefined)
	//	req.headers['x-ms-blob-type'] = req.x_ms_blob_type;
		
	//if (req.body != undefined)
	//	req.headers['Content-Length'] = req.body.length;
  
	req.headers['x-ms-version'] =  '2009-09-19';

	var s = string_to_sign_1(account.name, req);

	req.headers['Authorization'] = "SharedKey " + 
		account.name + ":" +
		hmac_string(account.key,s );
}

function shared_key_for_table_service (account, req) {
	req.headers =  req.headers || {};
	req.headers['x-ms-date'] = (new Date()).toUTCString();

	if (req.body != undefined)
		req.headers['Content-Length'] = req.body.length;
  
	req.headers['x-ms-version'] =  '2009-09-19';
	req.headers['DataServiceVersion'] = "1.0;NetFx" // Needed for 2009-09-19
	req.headers['MaxDataServiceVersion'] = "2.0;NetFx" //Needed for 2009-09-19

	req.headers['Date'] = req.headers['x-ms-date'];
  
	var s = string_to_sign_2(account.name, req);
	
	req.headers['Authorization'] = "SharedKey " + 
		account.name + ":" +
		hmac_string(account.key,s );
}

function execute (req, cb) {
  
	requestify(req);
	//console.log(req.headers);
	var r = req.client.request(req, cb);

	if (req.body != undefined)
		r.write(req.body, encoding='utf8');

	r.end();
}

/*******************
* Blob Service API *
*******************/

exports.blob = {

	list_containers: function(account, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/?comp=list',
			method: 'GET'
		};
	  
		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || xml_body);
	},

	create_container: function(account, container_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?restype=container',
			method: 'PUT'
		};

		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || function(x) {console.log(created(x));});
	},

	get_container_properties: function(account, container_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?restype=container',
			method: 'HEAD'
		};

		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || xml_body);
	},

	get_container_metadata: function(account, container_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?comp=metadata&restype=container',
			method: 'HEAD'
		};

		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || xml_body);
	},

	set_container_metadata: function(account, container_name, meta, cb) {

		var meta_headers = {};
		
		for(key in meta) {
			if (key.indexOf('x-ms-meta') == 0) {
				meta_headers[key] = meta[key];
			} else {
				meta_headers['x-ms-meta-' + key] = meta[key];
			}
		}

		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?comp=metadata&restype=container',
			method: 'PUT',
			headers: meta_headers
		}
		
		shared_key_for_blob_and_queue_services(account, req);
		execute(req, cb || xml_body);
	},

	// TODO Get Container ACL
	// TODO Set Container ACL

	delete_container: function(account, container_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?restype=container',
			method: 'DELETE'
		};

		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || function(x) {console.log(accepted(x));});
	},

	list_blobs: function(account, container_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '?comp=list&restype=container',
			method: 'GET'
			};
	  
		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || xml_body);
	},

	BlockBlob: "BlockBlob",
	PageBlob: "PageBlob",

	put_blob: function(account, container_name, blob_type,
					   blob_name, content, content_headers, cb) {

		var headers = {};
		headers['x-ms-blob-type'] = blob_type;
		headers['Content-Length'] = content.length;
		for(ch in content_headers) {
			headers[ch] = content_headers[ch];
		}
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '/' + blob_name,
			method: 'PUT',
			headers: headers,
			body: content
			};
	  
		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || function(x) {console.log(created(x));});
	},

	get_blob: function(account, container_name, blob_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '/' + blob_name,
			method: 'GET'
			};
	  
		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || raw_body);
	},

	// TODO Get Blob Properties
	// TODO Set Blob Properties
	// TODO Get Blob Metadata
	// TODO Set Blob Metadata

	delete_blob: function(account, container_name, blob_name, cb) {
	  
		var req = {
			url: account.blob_storage_url
				 + '/' + container_name
				 + '/' + blob_name,
			method: 'DELETE'
		};

		shared_key_for_blob_and_queue_services(account,req);
		execute(req, cb || function(x) {console.log(accepted(x));});
	},

	// TODO Lease Blob
	// TODO Snapshot Blob
	// TODO Copy Blob
	// TODO Put Block
	// TODO Put Block List
	// TODO Get Block List
	// TODO Put Page
	// TODO Get Page Regions

	download_blob: function(account, container_name, blob_name, file_name, cb) {
	  
			var fn = cb || function(x) {console.log(file_name + ' saved.' + x);};

			var s = fs.createWriteStream(file_name);
			s.on('close', fn);

			var f = function(x) { 
				raw_body(x, function(x) {s.write(x);})
			}

		get_blob(account, container_name, blob_name, f)
	}

}

/********************
* Queue Service API *
********************/

function list_queues (account, cb) {

	var req = {
		url: account.queue_storage_url + '/?comp=list',
		method: 'GET'
	};
  
	shared_key_for_blob_and_queue_services(account,req);
	execute(req, cb || xml_body);
}

exports.list_queues = list_queues;

function create_queue (account, queue_name, cb) {
  
	var req = {
		url: account.queue_storage_url + '/' + queue_name,
		method: 'PUT'
	};

	shared_key_for_blob_and_queue_services(account,req);
	execute(req, cb || function(x) {console.log(created(x));});
}

exports.create_queue = create_queue;

function delete_queue(account, queue_name, cb) {
  
	var req = {
		url: account.queue_storage_url + '/' + queue_name,
		method: 'DELETE'
	};

	shared_key_for_blob_and_queue_services(account,req);
	execute(req, cb || function(x) {console.log(accepted(x));});
}

exports.delete_queue = delete_queue;

// TODO Get Queue Metadata
// TODO Set Queue Metadata

function put_message(account, queue_name, content, cb) {
  
	var req = {
		url: account.queue_storage_url + '/' + queue_name + '/messages',
		method: 'POST',
		body: content
	};

	shared_key_for_blob_and_queue_services(account,req);
	execute(req, cb || function(x) {console.log(created(x));});
}

exports.put_message = put_message;

// TODO Get Messages
// TODO Peek Messages
// TODO Delete Message
// TODO Clear Messages

/********************
* Table Service API *
********************/


// callback has an argument which is an array of objects with a 'TableName' property
exports.query_tables = function (account, cb) {
  
	var req = {
		url: account.table_storage_url + '/Tables',
		method: 'GET'
	};
	shared_key_for_table_service(account,req);
	
	execute(req, function(res){
		response_to_json(res, function(result){
			var results = new Array();
			for ( var i=0, len=result.entry.length; i<len; ++i ){
				results[i] = { TableName : result.entry[i].content['m:properties']['d:TableName'] };
			}
			cb(results);
		})
	});
}

// callback contains the response
exports.create_table = function (account, table_name, cb) {
  
	var xml = "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?><entry xmlns:d=\"http://schemas.microsoft.com/ado/2007/08/dataservices\" xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\" xmlns=\"http://www.w3.org/2005/Atom\"><title />     <updated>2009-03-18T11:48:34.9840639-07:00</updated><author><name/></author><id/><content type=\"application/xml\"><m:properties><d:TableName>" + table_name + "</d:TableName></m:properties></content></entry>";

	var req = {
		url: account.table_storage_url + '/Tables',
		method: 'POST',
		body: xml,
		headers : {'Content-Type': 'application/atom+xml'}
	};

	shared_key_for_table_service(account,req);
	execute(req, cb || xml_body);
}

// callback has a bool argument indicating success
exports.delete_table = function(account, tablename, cb) {
	var req = { 
	
		url: account.table_storage_url + "/Tables('" + tablename + "')",
		method: 'DELETE',
		headers : {'Content-Type': 'application/atom+xml'}
	};
	
	shared_key_for_table_service(account,req);
	execute(req, function(res){
		cb(res.statusCode == HTTP_NO_CONTENT);
	});	
}

// callback contains the response
exports.insert_entity = function (account, tablename, data, cb) {
	var xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title /><updated>2009-03-18T11:48:34.9840639-07:00</updated><author><name /></author><id /><content type="application/xml"><m:properties>';
	xml = xml + '<d:Timestamp m:type="Edm.DateTime">0001-01-01T00:00:00</d:Timestamp>';
	
	for(var propertyName in data) 
	{ 
		xml = xml + "<d:" + propertyName + ">" + data[propertyName] + "</d:" + propertyName + ">";
	}
	xml = xml + '</m:properties></content></entry>';
	
	var req = { 
		url: account.table_storage_url + '/' + tablename,
		method: 'POST',
		body: xml,
		headers : {'Content-Type': 'application/atom+xml'}
	};
	
	shared_key_for_table_service(account,req);
	execute(req, cb || xml_body);
}

// callback contains the response
exports.update_entity = function (account, tablename, data, cb) {
	var url = account.table_storage_url + '/' + tablename + "(PartitionKey='" + data.PartitionKey + "',RowKey='" + data.RowKey + "')";

	var xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><entry xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom"><title /><updated>2009-03-18T11:48:34.9840639-07:00</updated><author><name /></author><id>' + url + '</id><content type="application/xml"><m:properties>';
	xml = xml + '<d:Timestamp m:type="Edm.DateTime">0001-01-01T00:00:00</d:Timestamp>';
	
	for(var propertyName in data) 
	{ 
		xml = xml + "<d:" + propertyName + ">" + data[propertyName] + "</d:" + propertyName + ">";
	}
	xml = xml + '</m:properties></content></entry>';
	
	var req = { 
		url: url,
		method: 'PUT',
		body: xml,
		headers : {'Content-Type': 'application/atom+xml', 'If-Match': '*'}
	};
	
	shared_key_for_table_service(account,req);
	execute(req, cb || xml_body);
}


function entry_to_entity(entry) {
	var entity = {};
	for (var propertyName in entry.content['m:properties'])
	{
		if (propertyName == "d:Timestamp")
		{
			entity[propertyName.replace("d:", "")] = entry.content['m:properties'][propertyName]['#'];
		}
		else
		{
			entity[propertyName.replace("d:", "")] = entry.content['m:properties'][propertyName];
		}
	}
	return entity;
}

// callback has an argument containing the matching entity
exports.get_entity = function(account, tablename, partitionKey, rowKey, cb) {
	var req = { 
		url: account.table_storage_url + '/' + tablename + "(PartitionKey='" + partitionKey + "',RowKey='" + rowKey + "')",
		method: 'GET'
	};
	
	shared_key_for_table_service(account,req);
	
	execute(req, function(res){ 
		response_to_json(res, function(result){
			
			if (result.content == undefined)
			{
				cb();
			}
			else
			{
				cb(entry_to_entity(result));
			}
		})
	});
}


// callback has an argument which is a list of matching entities
exports.query_entities = function(account, tablename, query, cb){
	var req = { 
		url: account.table_storage_url + '/' + tablename + "()?$filter=" + query,
		method: 'GET'
	};

	shared_key_for_table_service(account,req);
	
	execute(req, function(res){ 
		response_to_json(res, function(result){
			var entities = new Array();
			
			if (result.entry instanceof Array) {
				
				for ( var i=0, len=result.entry.length; i<len; ++i ){
					entities[i] = entry_to_entity(result.entry[i]);
				}
			}
			else {
				if (result.entry != undefined) {
					entities[0] = entry_to_entity(result.entry);
				}
			}
			cb(entities);
		})
	});
}

// callback has a bool argument, indicating success
exports.delete_entity = function(account, tablename, partitionKey, rowKey, cb) {
	var req = { 
		url: account.table_storage_url + '/' + tablename + "(PartitionKey='" + partitionKey + "',RowKey='" + rowKey + "')",
		method: 'DELETE',
		headers : {'Content-Type': 'application/atom+xml', 'If-Match': '*'}
	};
	
	shared_key_for_table_service(account,req);
	execute(req, function(res){
		cb(res.statusCode == HTTP_NO_CONTENT);
	});
}


// TODO Merge Entiy




