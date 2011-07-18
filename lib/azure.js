var crypto = require('crypto');
var url = require('url');
var http = require('http');
var https = require('https');

function hmac_string(key, str)
{
	var secret = (new Buffer(key, 'base64')).toString('binary');
	var hmac = crypto.createHmac('sha256', secret);
	return hmac.update(str).digest('base64');
}

exports.hmac_string = hmac_string;

var nl = '\n';

function to_array (x)
{
	var sortable = [];
	for (var k in x)
	      sortable.push([k, x[k]]);

	return sortable;
}

String.prototype.startsWith = function(str){
	    return (this.indexOf(str) === 0);
}

function canonicalized_headers(req)
{
	var h = to_array(req.headers).sort();
	var buffer = '';

	for (var k in h)
	{
		if (h[k][0].startsWith('x-ms-'))
			buffer += h[k][0] + ":" + h[k][1] + nl;
	}

	return buffer
}

exports.canonicalized_headers = canonicalized_headers;

function requestify (req)
{
	var x = url.parse(req.url,true);
	req.host = x.hostname;
	req.path = x.pathname + x.search;
	if (x.protocol == 'http:')
	{
		req.client = http;
		req.port = 80;
	}
	if (x.protocol == 'https:')
	{
		req.client = https;
		req.port = 443;
	}

}


function canonicalized_resource_format_1(name,req) 
{
	var x = url.parse(req.url,true);
	var s = "/" + name + x.pathname;
	for (k in x.query) 
	{
		s += nl + k + ":" + x.query[k];
	}
	return s;
}

exports.canonicalized_resource_format_1 = canonicalized_resource_format_1;

function optional(x)
{
	return (x ? x : "");
}

function string_to_sign_1(name, req) 
{
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

exports.string_to_sign_1 = string_to_sign_1;

function execute (account,req)
{
	req.headers['x-ms-date'] = (new Date()).toUTCString();
	req.headers['x-ms-version'] =  '2009-09-19';

	if (req.method == 'POST')
		req.headers['content-length'] = 0;

	var s = string_to_sign_1(account.name, req);
	console.log('string to sign ' + s);	
	req.headers['Authorization'] = "SharedKey " + 
		account.name + ":" +
		hmac_string(account.key,s );
	requestify(req);
	console.log(req);


	var r = req.client.request(req, function(res) {
		  console.log('STATUS: ' + res.statusCode);
		  console.log('HEADERS: ' + JSON.stringify(res.headers));
		  res.setEncoding('utf8');
		  res.on('data', function (chunk) {
		    console.log('BODY: ' + chunk);
		   });
		  res.on('error', function(e) {
			    console.log("Got error: " + e.message);
			    });
		});

	r.end();

}

function list_containers ()
{
	var account = {
		name: 'robblackwell',
		key : "EDUPbYWH4MnQoPZDjL4VwGWpCD3XvDSDD2zjAfv58bNhhS0qHFSKUmHriJaHvYZfidw3X+inwM33Q0+MmAS2Pw=="
	}

	var req = {
		url: 'https://robblackwell.blob.core.windows.net/?comp=list',
		method: 'GET',
		headers: {}
	};
	execute(account,  req);
}

list_containers();


