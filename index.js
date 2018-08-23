// Copyright (c) 2017 Alexandre Storelli
// This file is licensed under the Affero General Public License version 3 or later.
// See the LICENSE file.

const { log } = require("abr-log")("meta");
const parsers = require("./parsers/index.js");

var LOG_ERRORS = false;

exports.setLog = function(customLogger) {
	log = customLogger || log;
}

exports.getMeta = getMeta = function(country, name, callback) {
	if (!parsers[country]) return callback("radio " + country + "_" + name + " not found", null, null);
	log.debug("country=" + country + " name=" + name);
	let parsingData = parsers[country].filter(p => p.name === name);
	if (!parsingData.length) return callback("radio " + country + "_" + name + " not found", null, null);
	parsingData = parsingData[0];

	try {
		parsingData.parser(parsingData.url, function(error, parsedData, corsEnabled) {
			if (error) {
				return callback(error, null, corsEnabled);
			} else {
				return callback(null, parsedData, corsEnabled);
			}
		});
	} catch(e) {
		log.error("error getting meta. e=" + e + " country=" + country + " name=" + name);
	}
}

exports.getAvailable = getAvailable = function() {
	var list = [];
	const countries = Object.keys(parsers);
	for (let ic = 0; ic < countries.length; ic++) {
		const radios = parsers[countries[ic]].map(function(p) { return { country: countries[ic], name: p.name }});
		list = list.concat(radios);
	}
	return list;
}

exports.getAll = getAll = function(callback) {
	var jobs = getAvailable();
	var f = function(ijob) {
		if (ijob >= jobs.length) {
			if (callback) callback(jobs);
			return;
		}
		getMeta(jobs[ijob].country, jobs[ijob].name, function(err, data, corsEnabled) {
			Object.assign(jobs[ijob], {
				err: err,
				data: data,
				corsEnabled: corsEnabled
			});
			if (LOG_ERRORS && err) log.warn(jobs[ijob].country + "_" + jobs[ijob].name + " : error=" + err);
			if (process.argv[2] == "all-human") { //log.info(JSON.stringify(jobs));
				if (jobs[ijob].err) {
					log.warn(jobs[ijob].country + "_" + jobs[ijob].name + " error=" + jobs[ijob].err);
				} else {
					log.info(jobs[ijob].country + "_" + jobs[ijob].name + " artist=" + jobs[ijob].data.artist + " title=" + jobs[ijob].data.title + " cover=" + jobs[ijob].data.cover);
				}
			}
			f(ijob+1, callback);
		});
	}
	f(0);
}

if (process.argv.length >= 3 && process.argv[1].slice(-8) == "index.js") { // standalone usage
	if (process.argv[2] == "list") {				// loop on countries
		log.info("list of available parsing recipes:");
		const list = getAvailable();
		for (let i=0; i<list.length; i++) {
			console.log("* " + list[i].country + " - " + list[i].name);
		}
	} else if (process.argv[2] == "all-human" || process.argv[2] == "test") {
		LOG_ERRORS = process.argv[2] == "test";
		getAll();
	} else if (process.argv[2] == "all-json") {
		getAll(function(jobs) {
			console.log(JSON.stringify(jobs));
		});
	} else if (process.argv.length >= 4) {
		getMeta(process.argv[2], process.argv[3], function(err, data, corsEnabled) {
			log.info(JSON.stringify({ err: err, data: data, corsEnabled: corsEnabled }));
		});
	}

}