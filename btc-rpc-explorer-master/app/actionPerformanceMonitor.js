const onHeaders = require('on-headers');
const debug = require("debug");
const debugLog = debug("monitor");
const utils = require("./utils.js");


const onHeadersListener = (config, req, statusCode, startTimeNanos, statTracker) => {
	try {
		const responseTimeNanos = process.hrtime.bigint() - startTimeNanos;
		const responseTimeMillis = parseInt(responseTimeNanos) * 1e-6;
		
		const category = Math.floor(statusCode / 100);
		

		let action = req.baseUrl + req.path;

		if (config.ignoredEndsWithActionsRegex.test(action)) {
			return;
		}

		if (config.ignoredStartsWithActionsRegex.test(action)) {
			return;
		}

		let allActions = "*";
		if (config.normalizeAction) {
			action = config.normalizeAction(action);
			allActions = config.normalizeAction(allActions);
		}

		statTracker.trackPerformance(`action.${action}`, responseTimeMillis);
		statTracker.trackPerformance("action.*", responseTimeMillis);

		statTracker.trackEvent(`action-status.${action}.${category}00`);
		statTracker.trackEvent(`action-status.*.${category}00`);

		var userAgent = req.headers['user-agent'];
		var crawler = utils.getCrawlerFromUserAgentString(userAgent);
		if (crawler) {
			statTracker.trackEvent(`site-crawl.${crawler}`);
		}

	} catch (err) {
		debugLog(err);
	}
};

const validateConfig = (cfg) => {
	const config = (cfg || {});

	if (!config.ignoredEndsWithActions) {
		config.ignoredEndsWithActions = /\.js|\.css|\.svg|\.png/;
	}

	config.ignoredEndsWithActionsRegex = new RegExp(config.ignoredEndsWithActions + "$", "i");


	if (!config.ignoredStartsWithActions) {
		config.ignoredStartsWithActions = "ignoreStartsWithThis|andIgnoreStartsWithThis";
	}

	config.ignoredStartsWithActionsRegex = new RegExp("^" + config.ignoredStartsWithActions, "i");

	return config;
};

const middlewareWrapper = (statTracker, cfg) => {
	const config = validateConfig(cfg);

	const middleware = (req, res, next) => {
		const startTimeNanos = process.hrtime.bigint();

		onHeaders(res, () => {
			onHeadersListener(config, req, res.statusCode, startTimeNanos, statTracker);
		});

		next();
	};

	middleware.middleware = middleware;

	return middleware;
};

module.exports = middlewareWrapper;


