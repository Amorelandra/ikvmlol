#!/usr/bin/env node

var spawn = require('child_process').spawn
var minimist = require('minimist')
var request = require('request')
var cookie = require('cookie')
var util = require('util')
var uri = require('./lib/uri')
var fs = require('fs')
var host, user, pass
var argv

argv = minimist(process.argv.slice(2))

host = argv._[0]
user = process.env.IKVMLOL_USER || argv.user
pass = process.env.IKVMLOL_PASS || argv.pass

var getOpts = {
		timeout : 10000
		, strictSSL : false
}

validate(begin)

function validate(cb) {

	if(!user) { return cb(new Error('Please export IKVMLOL_USER.')) }
	if(!pass) { return cb(new Error('Please export IKVMLOL_PASS.')) }
	if(!host) { return cb(new Error('No host specified.')) }

	cb(null)
}

function begin(err) {

	if(err) { return exit(err) }

	console.log("* Attempting login...")
	var login = util.format(uri.login, host)
	form(login, function logged(err, res, body) {

		if(err) { 
			
			if(err.code == 'ETIMEDOUT') { return exit(new Error('Login request timed out.')) }
			else { return exit(new Error(util.format('Error attempting to login [%s].', err.code))) }
		}

		if(res.statusCode != '200') {

			return exit(new Error(
				util.format(
					'HTTP error attempting to login: [%s]'
					, res.statusCode
				)
			))
		}

		var sid = cookie.parse(res.headers['set-cookie'][1]).SID
		if(sid != '' && sid != ';') {

			console.log("* Successfully logged in!")
			webStart(sid)
		}
		else {

			exit(new Error("Unexpected session ID."))
		}
	})
}

function webStart(sid) {

	console.log('* Downloading JNLP file...')
	var jnlp = fs.createWriteStream('/tmp/webstart.jnlp', {

		encoding : null
		, mode : 0700
	})
	var download = util.format(uri.webstart, host, sid)
	get(download).pipe(jnlp)

	jnlp.on('close', function() { 

		console.log("* Done! Launching.")
		var ws = spawn(
			'javaws'
			, [ '/tmp/webstart.jnlp' ]
			, { detached : true }
		)
		process.nextTick(process.exit)
	})
	jnlp.on('error', exit)
}

function get(uri, cb) { return req('GET', uri, cb) }
function form(uri, cb) { return req('FORM', uri, cb) }
function req(method, uri, cb) {

	var opts = getOpts
	opts.method = method
	opts.uri = uri

		method : method
		, uri : uri
		, jar : true
		, timeout : 10000
		, strictSSL : false
	}
	if(method == 'FORM') {

		opts.method = 'POST'
		opts.form = { name : user, pwd : pass }
	}
	return request(opts, cb ? cb : null)
}

function exit(err) {

	var code = 0
	if (err) {

		console.log('* %s', err)
		code = 1
	}
	console.log("Exiting.")
	process.exit(code)
}
